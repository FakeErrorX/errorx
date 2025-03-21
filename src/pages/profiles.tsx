import useSWR from "swr";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLockFn } from "ahooks";
import { Box, Button, IconButton, Stack, Divider, Grid2 } from "@mui/material";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { LoadingButton } from "@mui/lab";
import {
  ClearRounded,
  ContentPasteRounded,
  LocalFireDepartmentRounded,
  RefreshRounded,
  TextSnippetOutlined,
  DownloadRounded,
} from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import {
  importProfile,
  enhanceProfiles,
  //restartCore,
  getRuntimeLogs,
  deleteProfile,
  updateProfile,
  reorderProfile,
  createProfile,
} from "@/services/cmds";
import { useSetLoadingCache, useThemeMode } from "@/services/states";
import { closeAllConnections } from "@/services/api";
import { BasePage, DialogRef, Notice } from "@/components/base";
import {
  ProfileViewer,
  ProfileViewerRef,
} from "@/components/profile/profile-viewer";
import { ProfileMore } from "@/components/profile/profile-more";
import { ProfileItem } from "@/components/profile/profile-item";
import { useProfiles } from "@/hooks/use-profiles";
import { ConfigViewer } from "@/components/setting/mods/config-viewer";
import { add, throttle } from "lodash-es";
import { BaseStyledTextField } from "@/components/base/base-styled-text-field";
import { readTextFile } from "@tauri-apps/plugin-fs";
import { readText } from "@tauri-apps/plugin-clipboard-manager";
import { useLocation } from "react-router-dom";
import { useListen } from "@/hooks/use-listen";
import { listen } from "@tauri-apps/api/event";
import { TauriEvent } from "@tauri-apps/api/event";

const ProfilePage = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const { addListener } = useListen();
  const [url, setUrl] = useState("");
  const [disabled, setDisabled] = useState(false);
  const [activatings, setActivatings] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  const { current } = location.state || {};

  useEffect(() => {
    const handleFileDrop = async () => {
      const unlisten = await addListener(
        TauriEvent.DRAG_DROP,
        async (event: any) => {
          const paths = event.payload.paths;

          for (let file of paths) {
            if (!file.endsWith(".yaml") && !file.endsWith(".yml")) {
              Notice.error(t("Only YAML Files Supported"));
              continue;
            }
            const item = {
              type: "local",
              name: file.split(/\/|\\/).pop() ?? "New Profile",
              desc: "",
              url: "",
              option: {
                with_proxy: false,
                self_proxy: false,
              },
            } as IProfileItem;
            let data = await readTextFile(file);
            await createProfile(item, data);
            await mutateProfiles();
          }
        },
      );

      return unlisten;
    };

    const unsubscribe = handleFileDrop();

    return () => {
      unsubscribe.then((cleanup) => cleanup());
    };
  }, []);

  const {
    profiles = {},
    activateSelected,
    patchProfiles,
    mutateProfiles,
  } = useProfiles();

  const { data: chainLogs = {}, mutate: mutateLogs } = useSWR(
    "getRuntimeLogs",
    getRuntimeLogs,
  );

  const viewerRef = useRef<ProfileViewerRef>(null);
  const configRef = useRef<DialogRef>(null);

  // distinguish type
  const profileItems = useMemo(() => {
    const items = profiles.items || [];

    const type1 = ["local", "remote"];

    return items.filter((i) => i && type1.includes(i.type!));
  }, [profiles]);

  const currentActivatings = () => {
    return [...new Set([profiles.current ?? ""])].filter(Boolean);
  };

  const onImport = async () => {
    if (!url) return;
    setLoading(true);

    try {
      await importProfile(url);
      Notice.success(t("Profile Imported Successfully"));
      setUrl("");
      setLoading(false);
      mutateProfiles();
      await onEnhance(false);
    } catch (err: any) {
      Notice.error(err.message || err.toString());
      setLoading(false);
    } finally {
      setDisabled(false);
      setLoading(false);
    }
  };

  const onDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (over) {
      if (active.id !== over.id) {
        await reorderProfile(active.id.toString(), over.id.toString());
        mutateProfiles();
      }
    }
  };

  const activateProfile = async (profile: string, notifySuccess: boolean) => {
    // 避免大多数情况下loading态闪烁
    const reset = setTimeout(() => {
      setActivatings((prev) => [...prev, profile]);
    }, 100);

    try {
      const success = await patchProfiles({ current: profile });
      await mutateLogs();
      closeAllConnections();
      await activateSelected();
      if (notifySuccess && success) {
        Notice.success(t("Profile Switched"), 1000);
      }
    } catch (err: any) {
      Notice.error(err?.message || err.toString(), 4000);
    } finally {
      clearTimeout(reset);
      setActivatings([]);
    }
  };
  const onSelect = useLockFn(async (current: string, force: boolean) => {
    if (!force && current === profiles.current) return;
    await activateProfile(current, true);
  });

  useEffect(() => {
    (async () => {
      if (current) {
        mutateProfiles();
        await activateProfile(current, false);
      }
    })();
  }, current);

  const onEnhance = useLockFn(async (notifySuccess: boolean) => {
    setActivatings(currentActivatings());
    try {
      await enhanceProfiles();
      mutateLogs();
      if (notifySuccess) {
        Notice.success(t("Profile Reactivated"), 1000);
      }
    } catch (err: any) {
      Notice.error(err.message || err.toString(), 3000);
    } finally {
      setActivatings([]);
    }
  });

  const onDelete = useLockFn(async (uid: string) => {
    const current = profiles.current === uid;
    try {
      setActivatings([...(current ? currentActivatings() : []), uid]);
      await deleteProfile(uid);
      mutateProfiles();
      mutateLogs();
      current && (await onEnhance(false));
    } catch (err: any) {
      Notice.error(err?.message || err.toString());
    } finally {
      setActivatings([]);
    }
  });

  // 更新所有订阅
  const setLoadingCache = useSetLoadingCache();
  const onUpdateAll = useLockFn(async () => {
    const throttleMutate = throttle(mutateProfiles, 2000, {
      trailing: true,
    });
    const updateOne = async (uid: string) => {
      try {
        await updateProfile(uid);
        throttleMutate();
      } finally {
        setLoadingCache((cache) => ({ ...cache, [uid]: false }));
      }
    };

    return new Promise((resolve) => {
      setLoadingCache((cache) => {
        // 获取没有正在更新的订阅
        const items = profileItems.filter(
          (e) => e.type === "remote" && !cache[e.uid],
        );
        const change = Object.fromEntries(items.map((e) => [e.uid, true]));

        Promise.allSettled(items.map((e) => updateOne(e.uid))).then(resolve);
        return { ...cache, ...change };
      });
    });
  });

  const onCopyLink = async () => {
    const text = await readText();
    if (text) setUrl(text);
  };

  const mode = useThemeMode();
  const islight = mode === "light" ? true : false;
  const dividercolor = islight
    ? "rgba(0, 0, 0, 0.06)"
    : "rgba(255, 255, 255, 0.06)";

  const createConfigProfile = async () => {
    const config = `proxies:
  - name: "Server-1"
    type: socks5
    server: 127.0.0.1
    port: 18010
  - name: "Server-2"
    type: socks5
    server: 127.0.0.1
    port: 18011
  - name: "Server-3"
    type: socks5
    server: 127.0.0.1
    port: 18012
  - name: "Server-4"
    type: socks5
    server: 127.0.0.1
    port: 18013
  - name: "Server-5"
    type: socks5
    server: 127.0.0.1
    port: 18014
  - name: "Server-6"
    type: socks5
    server: 127.0.0.1
    port: 18015
  - name: "Server-7"
    type: socks5
    server: 127.0.0.1
    port: 18016
  - name: "Server-8"
    type: socks5
    server: 127.0.0.1
    port: 18017
  - name: "Server-9"
    type: socks5
    server: 127.0.0.1
    port: 18018
  - name: "Server-10"
    type: socks5
    server: 127.0.0.1
    port: 18019
  - name: "Server-11"
    type: socks5
    server: 127.0.0.1
    port: 18020
  - name: "Server-12"
    type: socks5
    server: 127.0.0.1
    port: 18021
  - name: "Server-13"
    type: socks5
    server: 127.0.0.1
    port: 18022
  - name: "Server-14"
    type: socks5
    server: 127.0.0.1
    port: 18023
  - name: "Server-15"
    type: socks5
    server: 127.0.0.1
    port: 18024
  - name: "Server-16"
    type: socks5
    server: 127.0.0.1
    port: 18025
  - name: "Server-17"
    type: socks5
    server: 127.0.0.1
    port: 18026
  - name: "Server-18"
    type: socks5
    server: 127.0.0.1
    port: 18027
  - name: "Server-19"
    type: socks5
    server: 127.0.0.1
    port: 18028
  - name: "Server-20"
    type: socks5
    server: 127.0.0.1
    port: 18029

proxy-groups:
  - name: "ErrorX"
    type: load-balance
    proxies:
      - "Server-1"
      - "Server-2"
      - "Server-3"
      - "Server-4"
      - "Server-5"
      - "Server-6"
      - "Server-7"
      - "Server-8"
      - "Server-9"
      - "Server-10"
      - "Server-11"
      - "Server-12"
      - "Server-13"
      - "Server-14"
      - "Server-15"
      - "Server-16"
      - "Server-17"
      - "Server-18"
      - "Server-19"
      - "Server-20"
    url: http://1.1.1.1/
    interval: 60
    strategy: round-robin

rules:
  - PROCESS-NAME,errorx-service,DIRECT
  - PROCESS-NAME,errorx-service.exe,DIRECT
  - PROCESS-NAME,ErrorX,DIRECT
  - PROCESS-NAME,ErrorX.exe,DIRECT
  - PROCESS-NAME,"ErrorX Service",DIRECT
  - PROCESS-NAME,ErrorX*,DIRECT
  - DOMAIN-SUFFIX,google.com,ErrorX
  - DOMAIN-SUFFIX,youtube.com,ErrorX
  - DOMAIN-SUFFIX,facebook.com,ErrorX
  - GEOIP,CN,DIRECT
  - MATCH,ErrorX`;

    try {
      const item = {
        type: "local",
        name: "ErrorX",
        desc: "Default ErrorX configuration",
        url: "",
        option: {
          with_proxy: false,
          self_proxy: false,
        },
      } as IProfileItem;

      await createProfile(item, config);
      await mutateProfiles();
      await onEnhance(false);
      Notice.success(t("ErrorX Config Applied Successfully"));
    } catch (err: any) {
      Notice.error(err?.message || err.toString());
    }
  };

  return (
    <BasePage
      full
      title={t("Profiles")}
      contentStyle={{ height: "100%" }}
      header={
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <IconButton
            size="small"
            color="inherit"
            title={t("Download Config")}
            onClick={createConfigProfile}
          >
            <DownloadRounded />
          </IconButton>

          <IconButton
            size="small"
            color="inherit"
            title={t("Update All Profiles")}
            onClick={onUpdateAll}
          >
            <RefreshRounded />
          </IconButton>

          <IconButton
            size="small"
            color="inherit"
            title={t("View Runtime Config")}
            onClick={() => configRef.current?.open()}
          >
            <TextSnippetOutlined />
          </IconButton>

          <IconButton
            size="small"
            color="primary"
            title={t("Reactivate Profiles")}
            onClick={() => onEnhance(true)}
          >
            <LocalFireDepartmentRounded />
          </IconButton>
        </Box>
      }
    >
      <Stack
        direction="row"
        spacing={1}
        sx={{
          pt: 1,
          mb: 0.5,
          mx: "10px",
          height: "36px",
          display: "flex",
          alignItems: "center",
        }}
      >
        <BaseStyledTextField
          value={url}
          variant="outlined"
          onChange={(e) => setUrl(e.target.value)}
          placeholder={t("Profile URL")}
          InputProps={{
            sx: { pr: 1 },
            endAdornment: !url ? (
              <IconButton
                size="small"
                sx={{ p: 0.5 }}
                title={t("Paste")}
                onClick={onCopyLink}
              >
                <ContentPasteRounded fontSize="inherit" />
              </IconButton>
            ) : (
              <IconButton
                size="small"
                sx={{ p: 0.5 }}
                title={t("Clear")}
                onClick={() => setUrl("")}
              >
                <ClearRounded fontSize="inherit" />
              </IconButton>
            ),
          }}
        />
        <LoadingButton
          disabled={!url || disabled}
          loading={loading}
          variant="contained"
          size="small"
          sx={{ borderRadius: "6px" }}
          onClick={onImport}
        >
          {t("Import")}
        </LoadingButton>
        <Button
          variant="contained"
          size="small"
          sx={{ borderRadius: "6px" }}
          onClick={() => viewerRef.current?.create()}
        >
          {t("New")}
        </Button>
      </Stack>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={onDragEnd}
      >
        <Box
          sx={{
            pl: "10px",
            pr: "10px",
            height: "calc(100% - 48px)",
            overflowY: "auto",
          }}
        >
          <Box sx={{ mb: 1.5 }}>
            <Grid2 container spacing={{ xs: 1, lg: 1 }}>
              <SortableContext
                items={profileItems.map((x) => {
                  return x.uid;
                })}
              >
                {profileItems.map((item) => (
                  <Grid2 size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={item.file}>
                    <ProfileItem
                      id={item.uid}
                      selected={profiles.current === item.uid}
                      activating={activatings.includes(item.uid)}
                      itemData={item}
                      onSelect={(f) => onSelect(item.uid, f)}
                      onEdit={() => viewerRef.current?.edit(item)}
                      onSave={async (prev, curr) => {
                        if (prev !== curr && profiles.current === item.uid) {
                          await onEnhance(false);
                          //  await restartCore();
                          //   Notice.success(t("Clash Core Restarted"), 1000);
                        }
                      }}
                      onDelete={() => onDelete(item.uid)}
                    />
                  </Grid2>
                ))}
              </SortableContext>
            </Grid2>
          </Box>
          <Divider
            variant="middle"
            flexItem
            sx={{ width: `calc(100% - 32px)`, borderColor: dividercolor }}
          ></Divider>
          <Box sx={{ mt: 1.5, mb: "10px" }}>
            <Grid2 container spacing={{ xs: 1, lg: 1 }}>
              <Grid2 size={{ xs: 12, sm: 6, md: 6, lg: 6 }}>
                <ProfileMore
                  id="Merge"
                  onSave={async (prev, curr) => {
                    if (prev !== curr) {
                      await onEnhance(false);
                    }
                  }}
                />
              </Grid2>
              <Grid2 size={{ xs: 12, sm: 6, md: 6, lg: 6 }}>
                <ProfileMore
                  id="Script"
                  logInfo={chainLogs["Script"]}
                  onSave={async (prev, curr) => {
                    if (prev !== curr) {
                      await onEnhance(false);
                    }
                  }}
                />
              </Grid2>
            </Grid2>
          </Box>
        </Box>
      </DndContext>

      <ProfileViewer
        ref={viewerRef}
        onChange={async () => {
          mutateProfiles();
          await onEnhance(false);
        }}
      />
      <ConfigViewer ref={configRef} />
    </BasePage>
  );
};

export default ProfilePage;
