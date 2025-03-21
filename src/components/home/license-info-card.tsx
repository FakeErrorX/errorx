import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Stack,
  CircularProgress,
  keyframes,
  IconButton,
  Card,
  CardHeader,
  CardContent,
  Grid,
  Chip,
} from '@mui/material';
import { 
  VpnKeyOutlined,
  CheckCircleOutline,
  CancelOutlined,
  AccessTime,
  Update,
  Computer,
  Security,
  Visibility,
  VisibilityOff,
  Window,
  Apple,
  Terminal,
} from '@mui/icons-material';
import { useThemeMode } from "@/services/states";
import { EnhancedCard } from "./enhanced-card";
import { getLicenseInfo, LicenseInfo } from '@/services/api';
import { useTranslation } from 'react-i18next';
import { useVerge } from "@/hooks/use-verge";
import { useNavigate } from 'react-router-dom';
import { Notice } from '@/components/base';
import { getProxyStatus as getProxyStatusCmd, stopProxy as stopProxyCmd } from '@/services/api';

const pulse = keyframes`
  0% {
    transform: scale(1);
    opacity: 0.8;
  }
  50% {
    transform: scale(1.05);
    opacity: 1;
  }
  100% {
    transform: scale(1);
    opacity: 0.8;
  }
`;

const fadeIn = keyframes`
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const shine = keyframes`
  0% {
    background-position: -100% 0;
  }
  100% {
    background-position: 200% 0;
  }
`;

const glow = keyframes`
  0% {
    box-shadow: 0 0 5px rgba(59,130,246,0.3),
                0 0 10px rgba(59,130,246,0.2),
                0 0 15px rgba(59,130,246,0.1);
  }
  50% {
    box-shadow: 0 0 10px rgba(59,130,246,0.4),
                0 0 20px rgba(59,130,246,0.3),
                0 0 30px rgba(59,130,246,0.2);
  }
  100% {
    box-shadow: 0 0 5px rgba(59,130,246,0.3),
                0 0 10px rgba(59,130,246,0.2),
                0 0 15px rgba(59,130,246,0.1);
  }
`;

const float = keyframes`
  0% {
    transform: translateY(0px);
  }
  50% {
    transform: translateY(-5px);
  }
  100% {
    transform: translateY(0px);
  }
`;

const getPlatformIcon = (platform: string) => {
  const platformLower = platform.toLowerCase();
  if (platformLower.includes('windows')) {
    return <Window sx={{ fontSize: 16, color: 'text.secondary' }} />;
  } else if (platformLower.includes('mac') || platformLower.includes('apple')) {
    return <Apple sx={{ fontSize: 16, color: 'text.secondary' }} />;
  } else if (platformLower.includes('linux')) {
    return <Terminal sx={{ fontSize: 16, color: 'text.secondary' }} />;
  }
  return <Computer sx={{ fontSize: 16, color: 'text.secondary' }} />;
};

const getSubscriptionType = (type: string): string => {
  const typeMap: { [key: string]: string } = {
    "2H": "TRIAL",
    "1D": "1DAY",
    "7D": "WEEK",
    "30D": "1MONTH",
    "90D": "3MONTH",
    "180D": "6MONTH",
    "365D": "1YEAR",
    "3650D": "LIFETIME"
  };
  return typeMap[type] || type;
};

const calculateRemainingTime = (startTime: string, subscriptionType: string): string => {
  if (!startTime || !subscriptionType) return 'N/A';
  
  // Convert start time to UTC
  const start = new Date(startTime + 'Z'); // Append Z to treat the time as UTC
  const now = new Date();
  // Get UTC time without timezone offset
  const utcNow = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 
    now.getUTCHours(), now.getUTCMinutes(), now.getUTCSeconds()));
  
  // Convert subscription type to days
  const daysMap: { [key: string]: number } = {
    "2H": 2/24, // 2 hours
    "1D": 1,
    "7D": 7,
    "30D": 30,
    "90D": 90,
    "180D": 180,
    "365D": 365,
    "3650D": 3650
  };

  const days = daysMap[subscriptionType];
  if (!days) return 'N/A';

  const endTime = new Date(start.getTime() + days * 24 * 60 * 60 * 1000);
  const remaining = endTime.getTime() - utcNow.getTime();

  if (remaining <= 0) return 'Expired';

  const daysRemaining = Math.floor(remaining / (24 * 60 * 60 * 1000));
  const hoursRemaining = Math.floor((remaining % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  const minutesRemaining = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
  const secondsRemaining = Math.floor((remaining % (60 * 1000)) / 1000);

  return `${daysRemaining}D ${hoursRemaining.toString().padStart(2, '0')}H ${minutesRemaining.toString().padStart(2, '0')}M ${secondsRemaining.toString().padStart(2, '0')}S`;
};

const calculateExpiryDate = (startTime: string, subscriptionType: string): string => {
  if (!startTime || !subscriptionType) return 'N/A';
  
  // Convert start time to UTC
  const start = new Date(startTime + 'Z'); // Append Z to treat the time as UTC
  
  // Convert subscription type to days
  const daysMap: { [key: string]: number } = {
    "2H": 2/24, // 2 hours
    "1D": 1,
    "7D": 7,
    "30D": 30,
    "90D": 90,
    "180D": 180,
    "365D": 365,
    "3650D": 3650
  };

  const days = daysMap[subscriptionType];
  if (!days) return 'N/A';

  const endTime = new Date(start.getTime() + days * 24 * 60 * 60 * 1000);
  
  // Format the date in local timezone
  return endTime.toLocaleString(undefined, {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZoneName: 'short'
  });
};

export const LicenseInfoCard = () => {
  const mode = useThemeMode();
  const isDark = mode === "light" ? false : true;
  const [licenseInfo, setLicenseInfo] = useState<LicenseInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showLicenseKey, setShowLicenseKey] = useState(false);
  const [, setUpdateTimer] = useState(0);
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { verge, patchVerge } = useVerge();

  useEffect(() => {
    const fetchLicenseInfo = async () => {
      try {
        setLoading(true);
        setError(null);
        const info = await getLicenseInfo();
        setLicenseInfo(info);
      } catch (err) {
        console.error('Failed to fetch license info:', err);
        setError('Failed to load license information');
      } finally {
        setLoading(false);
      }
    };

    fetchLicenseInfo();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setUpdateTimer(prev => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Effect to check license expiration and handle automatic shutdown
  useEffect(() => {
    const checkLicenseAndShutdown = async () => {
      if (!licenseInfo) return;

      const startTime = new Date(licenseInfo.start_time + 'Z');
      const now = new Date();
      const utcNow = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 
        now.getUTCHours(), now.getUTCMinutes(), now.getUTCSeconds()));

      const daysMap: { [key: string]: number } = {
        "2H": 2/24,
        "1D": 1,
        "7D": 7,
        "30D": 30,
        "90D": 90,
        "180D": 180,
        "365D": 365,
        "3650D": 3650
      };

      const days = daysMap[licenseInfo.subscription_type];
      if (!days) return;

      const endTime = new Date(startTime.getTime() + days * 24 * 60 * 60 * 1000);
      const remaining = endTime.getTime() - utcNow.getTime();

      if (remaining <= 0) {
        try {
          // Disable system proxy if enabled
          if (verge?.enable_system_proxy) {
            await patchVerge({ enable_system_proxy: false });
            Notice.success(t("System proxy disabled"));
          }

          // Disable tun mode if enabled
          if (verge?.enable_tun_mode) {
            await patchVerge({ enable_tun_mode: false });
            Notice.success(t("Tun mode disabled"));
          }

          // Check if proxy server is running
          const proxyStatus = await getProxyStatusCmd();
          const isRunning = proxyStatus.some(([, status]) => status);
          
          if (isRunning) {
            await stopProxyCmd();
            Notice.success(t("Server stopped successfully"));
          }

          // Clear session storage and navigate to login
          sessionStorage.removeItem('isAuthenticated');
          sessionStorage.removeItem('licenseKey');
          navigate('/login');
          Notice.info(t("License expired. Please renew your subscription."));
        } catch (error) {
          console.error('Error during automatic shutdown:', error);
          Notice.error(t("Failed to stop services. Please try again."));
        }
      }
    };

    checkLicenseAndShutdown();
  }, [licenseInfo, navigate, t, verge, patchVerge]);

  if (loading) {
    return (
      <EnhancedCard
        title={t('License Information')}
        icon={<Security sx={{ color: isDark ? '#3b82f6' : '#2563eb' }} />}
        iconColor="primary"
      >
        <Box display="flex" justifyContent="center" p={3}>
          <CircularProgress />
        </Box>
      </EnhancedCard>
    );
  }

  if (error) {
    return (
      <EnhancedCard
        title={t('License Information')}
        icon={<Security sx={{ color: isDark ? '#3b82f6' : '#2563eb' }} />}
        iconColor="primary"
      >
        <Typography color="error">{error}</Typography>
      </EnhancedCard>
    );
  }

  if (!licenseInfo) {
    return (
      <EnhancedCard
        title={t('License Information')}
        icon={<Security sx={{ color: isDark ? '#3b82f6' : '#2563eb' }} />}
        iconColor="primary"
      >
        <Typography>{t('No license information available')}</Typography>
      </EnhancedCard>
    );
  }

  return (
    <EnhancedCard
      title={t('License Information')}
      icon={<Security sx={{ color: isDark ? '#3b82f6' : '#2563eb' }} />}
      iconColor="primary"
    >
      <Box sx={{ animation: `${fadeIn} 0.5s ease-out` }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
          <Box
            sx={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              bgcolor: licenseInfo.windows_device.is_active ? '#00C853' : '#ff3d00',
              boxShadow: licenseInfo.windows_device.is_active 
                ? '0 0 10px rgba(0, 200, 83, 0.5)'
                : '0 0 10px rgba(255, 61, 0, 0.5)',
              animation: `${pulse} 2s infinite ease-in-out`,
              position: 'relative',
              '&::after': {
                content: '""',
                position: 'absolute',
                inset: '-2px',
                borderRadius: '50%',
                border: '1px solid',
                borderColor: licenseInfo.windows_device.is_active 
                  ? 'rgba(0, 200, 83, 0.3)'
                  : 'rgba(255, 61, 0, 0.3)',
                animation: `${pulse} 2s infinite ease-in-out`,
              },
              '&::before': {
                content: '""',
                position: 'absolute',
                inset: '-4px',
                borderRadius: '50%',
                background: licenseInfo.windows_device.is_active 
                  ? 'radial-gradient(circle, rgba(0, 200, 83, 0.1) 0%, transparent 70%)'
                  : 'radial-gradient(circle, rgba(255, 61, 0, 0.1) 0%, transparent 70%)',
                animation: `${pulse} 2s infinite ease-in-out`,
              }
            }}
          />
          <Typography
            variant="subtitle1"
            sx={{
              color: licenseInfo.windows_device.is_active ? '#00C853' : '#ff3d00',
              fontWeight: 600,
              letterSpacing: '0.5px',
              textShadow: licenseInfo.windows_device.is_active 
                ? '0 0 10px rgba(0, 200, 83, 0.3)'
                : '0 0 10px rgba(255, 61, 0, 0.3)',
            }}
          >
            {licenseInfo.windows_device.is_active ? t('Active') : t('Inactive')}
          </Typography>
        </Box>

        <Stack spacing={2.5}>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <VpnKeyOutlined sx={{ 
                  fontSize: 16, 
                  color: 'text.secondary',
                  animation: `${float} 3s ease-in-out infinite`,
                }} />
                <Typography
                  variant="caption"
                  sx={{
                    color: 'text.secondary',
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    fontWeight: 500,
                  }}
                >
                  {t('LICENSE KEY')}
                </Typography>
              </Box>
              <IconButton
                size="small"
                onClick={() => setShowLicenseKey(!showLicenseKey)}
                sx={{
                  color: 'text.secondary',
                  animation: `${glow} 3s ease-in-out infinite`,
                  '&:hover': {
                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)',
                    transform: 'translateY(-2px)',
                  },
                  transition: 'transform 0.2s ease',
                }}
              >
                {showLicenseKey ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
              </IconButton>
            </Box>
            <Typography
              variant="body1"
              sx={{
                fontWeight: 500,
                fontFamily: 'monospace',
                letterSpacing: '2px',
                color: isDark ? '#e2e8f0' : '#1e293b',
                background: isDark
                  ? 'linear-gradient(90deg, #3b82f6, #818cf8)'
                  : 'linear-gradient(90deg, #2563eb, #4f46e5)',
                backgroundSize: '200% auto',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                animation: `${shine} 3s linear infinite`,
                textShadow: '0 0 10px rgba(59,130,246,0.2)',
              }}
            >
              {licenseInfo.license_key ? (showLicenseKey ? licenseInfo.license_key : '•'.repeat(licenseInfo.license_key.length)) : 'N/A'}
            </Typography>
          </Box>

          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
              <Security sx={{ 
                fontSize: 16, 
                color: 'text.secondary',
                animation: `${float} 3s ease-in-out infinite`,
              }} />
              <Typography
                variant="caption"
                sx={{
                  color: 'text.secondary',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  fontWeight: 500,
                }}
              >
                {t('SUBSCRIPTION TYPE')}
              </Typography>
            </Box>
            <Typography
              variant="body1"
              sx={{
                fontWeight: 500,
                color: isDark ? '#e2e8f0' : '#1e293b',
                background: isDark
                  ? 'linear-gradient(90deg, #3b82f6, #818cf8)'
                  : 'linear-gradient(90deg, #2563eb, #4f46e5)',
                backgroundSize: '200% auto',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                animation: `${shine} 3s linear infinite`,
                textShadow: '0 0 10px rgba(59,130,246,0.2)',
              }}
            >
              {licenseInfo.subscription_type ? getSubscriptionType(licenseInfo.subscription_type) : 'N/A'}
            </Typography>
          </Box>

          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
              <Update sx={{ 
                fontSize: 16, 
                color: 'text.secondary',
                animation: `${float} 3s ease-in-out infinite`,
              }} />
              <Typography
                variant="caption"
                sx={{
                  color: 'text.secondary',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  fontWeight: 500,
                }}
              >
                {t('REMAINING TIME')}
              </Typography>
            </Box>
            <Typography
              variant="body1"
              sx={{
                fontWeight: 500,
                color: isDark ? '#e2e8f0' : '#1e293b',
                background: isDark
                  ? 'linear-gradient(90deg, #3b82f6, #818cf8)'
                  : 'linear-gradient(90deg, #2563eb, #4f46e5)',
                backgroundSize: '200% auto',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                animation: `${shine} 3s linear infinite`,
                textShadow: '0 0 10px rgba(59,130,246,0.2)',
              }}
            >
              {calculateRemainingTime(licenseInfo.start_time, licenseInfo.subscription_type)}
            </Typography>
          </Box>

          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
              <AccessTime sx={{ 
                fontSize: 16, 
                color: 'text.secondary',
                animation: `${float} 3s ease-in-out infinite`,
              }} />
              <Typography
                variant="caption"
                sx={{
                  color: 'text.secondary',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  fontWeight: 500,
                }}
              >
                {t('EXPIRY DATE')}
              </Typography>
            </Box>
            <Typography
              variant="body1"
              sx={{
                fontWeight: 500,
                color: isDark ? '#e2e8f0' : '#1e293b',
                background: isDark
                  ? 'linear-gradient(90deg, #3b82f6, #818cf8)'
                  : 'linear-gradient(90deg, #2563eb, #4f46e5)',
                backgroundSize: '200% auto',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                animation: `${shine} 3s linear infinite`,
                textShadow: '0 0 10px rgba(59,130,246,0.2)',
              }}
            >
              {calculateExpiryDate(licenseInfo.start_time, licenseInfo.subscription_type)}
            </Typography>
          </Box>

          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
              {getPlatformIcon(licenseInfo.allowed_platform)}
              <Typography
                variant="caption"
                sx={{
                  color: 'text.secondary',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  fontWeight: 500,
                }}
              >
                {t('PLATFORM')}
              </Typography>
            </Box>
            <Typography
              variant="body1"
              sx={{
                fontWeight: 500,
                color: isDark ? '#e2e8f0' : '#1e293b',
                background: isDark
                  ? 'linear-gradient(90deg, #3b82f6, #818cf8)'
                  : 'linear-gradient(90deg, #2563eb, #4f46e5)',
                backgroundSize: '200% auto',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                animation: `${shine} 3s linear infinite`,
                textShadow: '0 0 10px rgba(59,130,246,0.2)',
              }}
            >
              {licenseInfo.allowed_platform || 'N/A'}
            </Typography>
          </Box>
        </Stack>
      </Box>
    </EnhancedCard>
  );
}; 