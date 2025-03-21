import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Stack,
  Button,
  CircularProgress,
  keyframes,
} from '@mui/material';
import { 
  Speed,
  NetworkCheck,
  Storage,
  PowerSettingsNew,
  PowerOff,
} from '@mui/icons-material';
import { useThemeMode } from "@/services/states";
import { EnhancedCard } from "./enhanced-card";
import { getServerList, startProxy, stopProxy, getProxyStatus, ServerInfo } from '@/services/api';
import { useTranslation } from 'react-i18next';

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

export const ProxyServerCard = () => {
  const { t } = useTranslation();
  const mode = useThemeMode();
  const isDark = mode === "light" ? false : true;
  const [serverInfo, setServerInfo] = useState<ServerInfo | null>(null);
  const [proxyStatus, setProxyStatus] = useState<[number, boolean][]>([]);
  const [loading, setLoading] = useState(true);
  const [isStarting, setIsStarting] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setError(null);
      const [servers, status] = await Promise.all([
        getServerList(),
        getProxyStatus()
      ]);
      setServerInfo(servers);
      setProxyStatus(status);
    } catch (err) {
      console.error('Failed to fetch server info:', err);
      setError('Failed to load server information');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const handleStartServer = async () => {
    try {
      setIsStarting(true);
      setError(null);
      await startProxy();
      await fetchData();
    } catch (err) {
      console.error('Failed to start proxy:', err);
      setError('Failed to start proxy servers');
    } finally {
      setIsStarting(false);
    }
  };

  const handleStopServer = async () => {
    try {
      setIsStopping(true);
      setError(null);
      await stopProxy();
      await fetchData();
    } catch (err) {
      console.error('Failed to stop proxy:', err);
      setError('Failed to stop proxy servers');
    } finally {
      setIsStopping(false);
    }
  };

  if (loading) {
    return (
      <EnhancedCard
        title={t('Local Proxy Server')}
        icon={<NetworkCheck sx={{ color: isDark ? '#3b82f6' : '#2563eb' }} />}
        iconColor="info"
      >
        <Box display="flex" justifyContent="center" p={3}>
          <CircularProgress />
        </Box>
      </EnhancedCard>
    );
  }

  const isRunning = proxyStatus.some(([_, status]) => status);

  return (
    <EnhancedCard
      title={t('Local Proxy Server')}
      icon={<NetworkCheck sx={{ color: isDark ? '#3b82f6' : '#2563eb' }} />}
      iconColor="info"
    >
      <Box sx={{ animation: `${fadeIn} 0.5s ease-out` }}>
        {error && (
          <Box sx={{ mb: 2 }}>
            <Typography color="error">{error}</Typography>
          </Box>
        )}

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
          <Box
            sx={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              bgcolor: isRunning ? '#00C853' : '#ff3d00',
              boxShadow: isRunning 
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
                borderColor: isRunning 
                  ? 'rgba(0, 200, 83, 0.3)'
                  : 'rgba(255, 61, 0, 0.3)',
                animation: `${pulse} 2s infinite ease-in-out`,
              },
              '&::before': {
                content: '""',
                position: 'absolute',
                inset: '-4px',
                borderRadius: '50%',
                background: isRunning 
                  ? 'radial-gradient(circle, rgba(0, 200, 83, 0.1) 0%, transparent 70%)'
                  : 'radial-gradient(circle, rgba(255, 61, 0, 0.1) 0%, transparent 70%)',
                animation: `${pulse} 2s infinite ease-in-out`,
              }
            }}
          />
          <Typography
            variant="subtitle1"
            sx={{
              color: isRunning ? '#00C853' : '#ff3d00',
              fontWeight: 600,
              letterSpacing: '0.5px',
              textShadow: isRunning 
                ? '0 0 10px rgba(0, 200, 83, 0.3)'
                : '0 0 10px rgba(255, 61, 0, 0.3)',
            }}
          >
            {isRunning ? t('Running') : t('Stopped')}
          </Typography>
        </Box>

        <Box sx={{ mb: 3 }}>
          <Typography
            variant="caption"
            sx={{
              color: 'text.secondary',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              fontWeight: 500,
              mb: 1,
              display: 'block'
            }}
          >
            {t('SERVERS STATUS')}
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {proxyStatus.map(([port, status], index) => (
              <Box
                key={port}
                sx={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  bgcolor: status ? '#00C853' : '#ff3d00',
                  boxShadow: status 
                    ? '0 0 8px rgba(0, 200, 83, 0.3)'
                    : '0 0 8px rgba(255, 61, 0, 0.3)',
                  animation: status ? `${pulse} 2s infinite ease-in-out` : 'none',
                  position: 'relative',
                  '&::after': {
                    content: '""',
                    position: 'absolute',
                    inset: '-2px',
                    borderRadius: '50%',
                    border: '1px solid',
                    borderColor: status 
                      ? 'rgba(0, 200, 83, 0.3)'
                      : 'rgba(255, 61, 0, 0.3)',
                    animation: status ? `${pulse} 2s infinite ease-in-out` : 'none',
                  },
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    inset: '-4px',
                    borderRadius: '50%',
                    background: status 
                      ? 'radial-gradient(circle, rgba(0, 200, 83, 0.1) 0%, transparent 70%)'
                      : 'radial-gradient(circle, rgba(255, 61, 0, 0.1) 0%, transparent 70%)',
                    animation: status ? `${pulse} 2s infinite ease-in-out` : 'none',
                  }
                }}
              />
            ))}
          </Box>
        </Box>

        <Stack spacing={2.5}>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
              <Speed sx={{ 
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
                {t('PORT RANGE')}
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
              18010-18029
            </Typography>
          </Box>

          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
              <Storage sx={{ 
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
                {t('SERVER STATS')}
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
              {t('Total')}: {serverInfo?.total_servers || 0} | 
              {t('Live')}: {serverInfo?.live_servers || 0} | 
              {t('Reserved')}: {serverInfo?.reserved_servers || 0}
            </Typography>
          </Box>

          <Button
            fullWidth
            variant="contained"
            onClick={isRunning ? handleStopServer : handleStartServer}
            disabled={isStarting || isStopping}
            startIcon={isRunning ? <PowerOff /> : <PowerSettingsNew />}
            sx={{
              mt: 1,
              textTransform: 'none',
              py: 1.5,
              fontSize: '1.1rem',
              fontWeight: 600,
              borderRadius: '15px',
              background: isRunning
                ? 'linear-gradient(135deg, #ff3d00 0%, #ff1744 100%)'
                : 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)',
              boxShadow: isRunning
                ? '0 4px 15px rgba(255, 61, 0, 0.3)'
                : '0 4px 15px rgba(59,130,246,0.3)',
              transition: 'all 0.3s ease',
              animation: `${glow} 3s ease-in-out infinite`,
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: isRunning
                  ? '0 6px 20px rgba(255, 61, 0, 0.4)'
                  : '0 6px 20px rgba(59,130,246,0.4)',
                background: isRunning
                  ? 'linear-gradient(135deg, #ff1744 0%, #ff3d00 100%)'
                  : 'linear-gradient(135deg, #2563eb 0%, #4f46e5 100%)',
              },
              '&:active': {
                transform: 'translateY(0)',
              },
              '&.Mui-disabled': {
                background: isDark
                  ? 'linear-gradient(135deg, #1e293b 0%, #1e1b4b 100%)'
                  : 'linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 100%)',
              },
            }}
          >
            {isStarting ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CircularProgress size={20} color="inherit" />
                <span>{t('Starting...')}</span>
              </Box>
            ) : isStopping ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CircularProgress size={20} color="inherit" />
                <span>{t('Stopping...')}</span>
              </Box>
            ) : isRunning ? (
              t('Stop Server')
            ) : (
              t('Start Server')
            )}
          </Button>
        </Stack>
      </Box>
    </EnhancedCard>
  );
}; 