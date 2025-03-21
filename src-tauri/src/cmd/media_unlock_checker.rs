use chrono::Local;
use regex::Regex;
use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use tauri::command;
use tokio::sync::Mutex;
use tokio::task::JoinSet;

// 定义解锁测试项目的结构
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UnlockItem {
    name: String,
    status: String,
    region: Option<String>,
    check_time: Option<String>,
}

// 获取当前本地时间字符串
fn get_local_date_string() -> String {
    let now = Local::now();
    now.format("%Y-%m-%d %H:%M:%S").to_string()
}

// 将国家代码转换为对应的emoji
fn country_code_to_emoji(country_code: &str) -> String {
    // 转换为大写
    let country_code = country_code.to_uppercase();

    // 确保使用国家代码的前两个字符来生成emoji
    if country_code.len() < 2 {
        return String::new();
    }

    // 使用前两个字符生成emoji
    let bytes = country_code.as_bytes();
    let c1 = 0x1F1E6 + (bytes[0] as u32) - ('A' as u32);
    let c2 = 0x1F1E6 + (bytes[1] as u32) - ('A' as u32);

    char::from_u32(c1)
        .and_then(|c1| char::from_u32(c2).map(|c2| format!("{}{}", c1, c2)))
        .unwrap_or_default()
}

// 测试 ChatGPT
async fn check_chatgpt_combined(client: &Client) -> Vec<UnlockItem> {
    let mut results = Vec::new();

    // 1. 获取国家代码
    let url_country = "https://chat.openai.com/cdn-cgi/trace";
    let result_country = client.get(url_country).send().await;

    // 解析区域信息
    let region = match result_country {
        Ok(response) => {
            if let Ok(body) = response.text().await {
                let mut map = HashMap::new();
                for line in body.lines() {
                    if let Some(index) = line.find('=') {
                        let key = &line[0..index];
                        let value = &line[index + 1..];
                        map.insert(key.to_string(), value.to_string());
                    }
                }

                map.get("loc").map(|loc| {
                    let emoji = country_code_to_emoji(loc);
                    format!("{}{}", emoji, loc)
                })
            } else {
                None
            }
        }
        Err(_) => None,
    };

    // 2. 测试 ChatGPT iOS
    let url_ios = "https://ios.chat.openai.com/";
    let result_ios = client.get(url_ios).send().await;

    // 解析iOS测试结果
    let ios_status = match result_ios {
        Ok(response) => {
            if let Ok(body) = response.text().await {
                let body_lower = body.to_lowercase();
                if body_lower.contains("you may be connected to a disallowed isp") {
                    "Disallowed ISP"
                } else if body_lower.contains("request is not allowed. please try again later.") {
                    "Yes"
                } else if body_lower.contains("sorry, you have been blocked") {
                    "Blocked"
                } else {
                    "Failed"
                }
            } else {
                "Failed"
            }
        }
        Err(_) => "Failed",
    };

    // 3. 测试 ChatGPT Web
    let url_web = "https://api.openai.com/compliance/cookie_requirements";
    let result_web = client.get(url_web).send().await;

    // 解析Web测试结果
    let web_status = match result_web {
        Ok(response) => {
            if let Ok(body) = response.text().await {
                let body_lower = body.to_lowercase();
                if body_lower.contains("unsupported_country") {
                    "Unsupported Country"
                } else {
                    "Yes"
                }
            } else {
                "Failed"
            }
        }
        Err(_) => "Failed",
    };

    // 添加iOS测试结果
    results.push(UnlockItem {
        name: "ChatGPT iOS".to_string(),
        status: ios_status.to_string(),
        region: region.clone(),
        check_time: Some(get_local_date_string()),
    });

    // 添加Web测试结果
    results.push(UnlockItem {
        name: "ChatGPT Web".to_string(),
        status: web_status.to_string(),
        region,
        check_time: Some(get_local_date_string()),
    });

    results
}

// 测试Gemini
async fn check_gemini(client: &Client) -> UnlockItem {
    let url = "https://gemini.google.com";

    let result = client.get(url).send().await;

    match result {
        Ok(response) => {
            if let Ok(body) = response.text().await {
                let is_ok = body.contains("45631641,null,true");
                let status = if is_ok { "Yes" } else { "No" };

                // 尝试提取国家代码
                let re = Regex::new(r#",2,1,200,"([A-Z]{3})""#).unwrap();
                let region = re.captures(&body).and_then(|caps| {
                    caps.get(1).map(|m| {
                        let country_code = m.as_str();
                        let emoji = country_code_to_emoji(country_code);
                        format!("{}{}", emoji, country_code)
                    })
                });

                UnlockItem {
                    name: "Gemini".to_string(),
                    status: status.to_string(),
                    region,
                    check_time: Some(get_local_date_string()),
                }
            } else {
                UnlockItem {
                    name: "Gemini".to_string(),
                    status: "Failed".to_string(),
                    region: None,
                    check_time: Some(get_local_date_string()),
                }
            }
        }
        Err(_) => UnlockItem {
            name: "Gemini".to_string(),
            status: "Failed".to_string(),
            region: None,
            check_time: Some(get_local_date_string()),
        },
    }
}

// 测试 YouTube Premium
async fn check_youtube_premium(client: &Client) -> UnlockItem {
    let url = "https://www.youtube.com/premium";

    let result = client.get(url).send().await;

    match result {
        Ok(response) => {
            if let Ok(body) = response.text().await {
                let body_lower = body.to_lowercase();

                if body_lower.contains("youtube premium is not available in your country") {
                    UnlockItem {
                        name: "Youtube Premium".to_string(),
                        status: "No".to_string(),
                        region: None,
                        check_time: Some(get_local_date_string()),
                    }
                } else if body_lower.contains("ad-free") {
                    // 尝试解析国家代码
                    let re = Regex::new(r#"id="country-code"[^>]*>([^<]+)<"#).unwrap();
                    let region = re.captures(&body).and_then(|caps| {
                        caps.get(1).map(|m| {
                            let country_code = m.as_str().trim();
                            let emoji = country_code_to_emoji(country_code);
                            format!("{}{}", emoji, country_code)
                        })
                    });

                    UnlockItem {
                        name: "Youtube Premium".to_string(),
                        status: "Yes".to_string(),
                        region,
                        check_time: Some(get_local_date_string()),
                    }
                } else {
                    UnlockItem {
                        name: "Youtube Premium".to_string(),
                        status: "Failed".to_string(),
                        region: None,
                        check_time: Some(get_local_date_string()),
                    }
                }
            } else {
                UnlockItem {
                    name: "Youtube Premium".to_string(),
                    status: "Failed".to_string(),
                    region: None,
                    check_time: Some(get_local_date_string()),
                }
            }
        }
        Err(_) => UnlockItem {
            name: "Youtube Premium".to_string(),
            status: "Failed".to_string(),
            region: None,
            check_time: Some(get_local_date_string()),
        },
    }
}

// 测试 Netflix
async fn check_netflix(client: &Client) -> UnlockItem {
    // 首先尝试使用Fast.com API检测Netflix CDN区域
    let cdn_result = check_netflix_cdn(client).await;
    if cdn_result.status == "Yes" {
        return cdn_result;
    }

    // 如果CDN方法失败，尝试传统的内容检测方法
    // 测试两个 Netflix 内容 (LEGO Ninjago 和 Breaking Bad)
    let url1 = "https://www.netflix.com/title/81280792"; // LEGO Ninjago
    let url2 = "https://www.netflix.com/title/70143836"; // Breaking Bad

    // 创建简单的请求（不添加太多头部信息）
    let result1 = client
        .get(url1)
        .timeout(std::time::Duration::from_secs(30))
        .send()
        .await;

    // 检查连接失败情况
    if let Err(e) = &result1 {
        eprintln!("Netflix请求错误: {}", e);
        return UnlockItem {
            name: "Netflix".to_string(),
            status: "Failed".to_string(),
            region: None,
            check_time: Some(get_local_date_string()),
        };
    }

    // 如果第一个请求成功，尝试第二个请求
    let result2 = client
        .get(url2)
        .timeout(std::time::Duration::from_secs(30))
        .send()
        .await;

    if let Err(e) = &result2 {
        eprintln!("Netflix请求错误: {}", e);
        return UnlockItem {
            name: "Netflix".to_string(),
            status: "Failed".to_string(),
            region: None,
            check_time: Some(get_local_date_string()),
        };
    }

    // 获取状态码
    let status1 = result1.unwrap().status().as_u16();
    let status2 = result2.unwrap().status().as_u16();

    // 根据状态码判断解锁状况
    if status1 == 404 && status2 == 404 {
        return UnlockItem {
            name: "Netflix".to_string(),
            status: "Originals Only".to_string(),
            region: None,
            check_time: Some(get_local_date_string()),
        };
    }

    if status1 == 403 || status2 == 403 {
        return UnlockItem {
            name: "Netflix".to_string(),
            status: "No".to_string(),
            region: None,
            check_time: Some(get_local_date_string()),
        };
    }

    if status1 == 200 || status1 == 301 || status2 == 200 || status2 == 301 {
        // 成功解锁，尝试获取地区信息
        // 使用Netflix测试内容获取区域
        let test_url = "https://www.netflix.com/title/80018499";
        match client
            .get(test_url)
            .timeout(std::time::Duration::from_secs(30))
            .send()
            .await
        {
            Ok(response) => {
                // 检查重定向位置
                if let Some(location) = response.headers().get("location") {
                    if let Ok(location_str) = location.to_str() {
                        // 解析位置获取区域
                        let parts: Vec<&str> = location_str.split('/').collect();
                        if parts.len() >= 4 {
                            let region_code = parts[3].split('-').next().unwrap_or("unknown");
                            let emoji = country_code_to_emoji(region_code);
                            return UnlockItem {
                                name: "Netflix".to_string(),
                                status: "Yes".to_string(),
                                region: Some(format!("{}{}", emoji, region_code)),
                                check_time: Some(get_local_date_string()),
                            };
                        }
                    }
                }
                // 如果没有重定向，假设是美国
                let emoji = country_code_to_emoji("us");
                UnlockItem {
                    name: "Netflix".to_string(),
                    status: "Yes".to_string(),
                    region: Some(format!("{}{}", emoji, "us")),
                    check_time: Some(get_local_date_string()),
                }
            }
            Err(e) => {
                eprintln!("获取Netflix区域信息失败: {}", e);
                UnlockItem {
                    name: "Netflix".to_string(),
                    status: "Yes (但无法获取区域)".to_string(),
                    region: None,
                    check_time: Some(get_local_date_string()),
                }
            }
        }
    } else {
        // 其他未知错误状态
        UnlockItem {
            name: "Netflix".to_string(),
            status: format!("Failed (状态码: {}_{}", status1, status2),
            region: None,
            check_time: Some(get_local_date_string()),
        }
    }
}

// 使用Fast.com API检测Netflix CDN区域
async fn check_netflix_cdn(client: &Client) -> UnlockItem {
    // Fast.com API URL
    let url = "https://api.fast.com/netflix/speedtest/v2?https=true&token=YXNkZmFzZGxmbnNkYWZoYXNkZmhrYWxm&urlCount=5";

    let result = client
        .get(url)
        .timeout(std::time::Duration::from_secs(30))
        .send()
        .await;

    match result {
        Ok(response) => {
            // 检查状态码
            if response.status().as_u16() == 403 {
                return UnlockItem {
                    name: "Netflix".to_string(),
                    status: "No (IP Banned By Netflix)".to_string(),
                    region: None,
                    check_time: Some(get_local_date_string()),
                };
            }

            // 尝试解析响应
            match response.json::<serde_json::Value>().await {
                Ok(data) => {
                    // 尝试从数据中提取区域信息
                    if let Some(targets) = data.get("targets").and_then(|t| t.as_array()) {
                        if !targets.is_empty() {
                            if let Some(location) = targets[0].get("location") {
                                if let Some(country) =
                                    location.get("country").and_then(|c| c.as_str())
                                {
                                    let emoji = country_code_to_emoji(country);
                                    return UnlockItem {
                                        name: "Netflix".to_string(),
                                        status: "Yes".to_string(),
                                        region: Some(format!("{}{}", emoji, country)),
                                        check_time: Some(get_local_date_string()),
                                    };
                                }
                            }
                        }
                    }

                    // 如果无法解析区域信息
                    return UnlockItem {
                        name: "Netflix".to_string(),
                        status: "Unknown".to_string(),
                        region: None,
                        check_time: Some(get_local_date_string()),
                    };
                }
                Err(e) => {
                    eprintln!("解析Fast.com API响应失败: {}", e);
                    UnlockItem {
                        name: "Netflix".to_string(),
                        status: "Failed (解析错误)".to_string(),
                        region: None,
                        check_time: Some(get_local_date_string()),
                    }
                }
            }
        }
        Err(e) => {
            eprintln!("Fast.com API请求失败: {}", e);
            UnlockItem {
                name: "Netflix".to_string(),
                status: "Failed (CDN API)".to_string(),
                region: None,
                check_time: Some(get_local_date_string()),
            }
        }
    }
}

// 测试 Prime Video
async fn check_prime_video(client: &Client) -> UnlockItem {
    // 访问 Prime Video 主页
    let url = "https://www.primevideo.com";

    let result = client.get(url).send().await;

    // 检查网络连接
    if result.is_err() {
        return UnlockItem {
            name: "Prime Video".to_string(),
            status: "Failed (Network Connection)".to_string(),
            region: None,
            check_time: Some(get_local_date_string()),
        };
    }

    // 解析响应内容
    match result.unwrap().text().await {
        Ok(body) => {
            // 检查是否被地区限制
            let is_blocked = body.contains("isServiceRestricted");

            // 提取地区信息
            let region_re = Regex::new(r#""currentTerritory":"([^"]+)"#).unwrap();
            let region_code = region_re
                .captures(&body)
                .and_then(|caps| caps.get(1).map(|m| m.as_str().to_string()));

            // 判断结果
            if is_blocked {
                return UnlockItem {
                    name: "Prime Video".to_string(),
                    status: "No (Service Not Available)".to_string(),
                    region: None,
                    check_time: Some(get_local_date_string()),
                };
            }

            if let Some(region) = region_code {
                let emoji = country_code_to_emoji(&region);
                return UnlockItem {
                    name: "Prime Video".to_string(),
                    status: "Yes".to_string(),
                    region: Some(format!("{}{}", emoji, region)),
                    check_time: Some(get_local_date_string()),
                };
            }

            // 页面解析错误
            if !is_blocked && region_code.is_none() {
                return UnlockItem {
                    name: "Prime Video".to_string(),
                    status: "Failed (Error: PAGE ERROR)".to_string(),
                    region: None,
                    check_time: Some(get_local_date_string()),
                };
            }

            // 未知错误
            UnlockItem {
                name: "Prime Video".to_string(),
                status: "Failed (Error: Unknown Region)".to_string(),
                region: None,
                check_time: Some(get_local_date_string()),
            }
        }
        Err(_) => UnlockItem {
            name: "Prime Video".to_string(),
            status: "Failed (Error: Cannot read response)".to_string(),
            region: None,
            check_time: Some(get_local_date_string()),
        },
    }
}

// 获取所有解锁项目的列表
#[command]
pub async fn get_unlock_items() -> Result<Vec<UnlockItem>, String> {
    let mut items = Vec::new();

    // ChatGPT
    items.push(UnlockItem {
        name: "ChatGPT iOS".to_string(),
        status: "Waiting".to_string(),
        region: None,
        check_time: None,
    });

    items.push(UnlockItem {
        name: "ChatGPT Web".to_string(),
        status: "Waiting".to_string(),
        region: None,
        check_time: None,
    });

    // Gemini
    items.push(UnlockItem {
        name: "Gemini".to_string(),
        status: "Waiting".to_string(),
        region: None,
        check_time: None,
    });

    // Youtube Premium
    items.push(UnlockItem {
        name: "Youtube Premium".to_string(),
        status: "Waiting".to_string(),
        region: None,
        check_time: None,
    });

    // Netflix
    items.push(UnlockItem {
        name: "Netflix".to_string(),
        status: "Waiting".to_string(),
        region: None,
        check_time: None,
    });

    // Prime Video
    items.push(UnlockItem {
        name: "Prime Video".to_string(),
        status: "Waiting".to_string(),
        region: None,
        check_time: None,
    });

    Ok(items)
}

// 开始检测流媒体解锁状态
#[command]
pub async fn check_media_unlock() -> Vec<UnlockItem> {
    let client = Arc::new(Client::new());
    let results = Arc::new(Mutex::new(Vec::new()));
    let mut tasks = JoinSet::new();

    // Add tasks for each check
    {
        let results = results.clone();
        let client = client.clone();
        tasks.spawn(async move {
            let chatgpt_results = check_chatgpt_combined(&client).await;
            let mut results = results.lock().await;
            results.extend(chatgpt_results);
        });
    }

    {
        let results = results.clone();
        let client = client.clone();
        tasks.spawn(async move {
            let gemini_result = check_gemini(&client).await;
            let mut results = results.lock().await;
            results.push(gemini_result);
        });
    }

    {
        let results = results.clone();
        let client = client.clone();
        tasks.spawn(async move {
            let youtube_result = check_youtube_premium(&client).await;
            let mut results = results.lock().await;
            results.push(youtube_result);
        });
    }

    {
        let results = results.clone();
        let client = client.clone();
        tasks.spawn(async move {
            let netflix_result = check_netflix(&client).await;
            let mut results = results.lock().await;
            results.push(netflix_result);
        });
    }

    {
        let results = results.clone();
        let client = client.clone();
        tasks.spawn(async move {
            let prime_result = check_prime_video(&client).await;
            let mut results = results.lock().await;
            results.push(prime_result);
        });
    }

    // Wait for all tasks to complete
    while let Some(_) = tasks.join_next().await {}

    // Get the final results
    Arc::try_unwrap(results)
        .map(|mutex| mutex.into_inner())
        .unwrap_or_default()
}
