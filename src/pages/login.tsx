import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  SvgIcon,
  useTheme,
  CircularProgress,
  alpha,
  InputAdornment,
  IconButton,
  Tooltip,
} from '@mui/material';
import { keyframes } from '@mui/material/styles';
import { useThemeMode } from "@/services/states";
import iconLight from "@/assets/image/icon_light.svg?react";
import iconDark from "@/assets/image/icon_dark.svg?react";
import { validateLicense } from '@/services/api';
import KeyIcon from '@mui/icons-material/VpnKey';
import ContentPasteIcon from '@mui/icons-material/ContentPaste';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import SecurityIcon from '@mui/icons-material/Security';
import CloseRounded from '@mui/icons-material/CloseRounded';
import { exitApp } from '@/services/cmds';
import { useTranslation } from 'react-i18next';
import { invoke } from '@tauri-apps/api/core';

const morphing = keyframes`
  0% {
    border-radius: 60% 40% 30% 70%/60% 30% 70% 40%;
  }
  50% {
    border-radius: 30% 60% 70% 40%/50% 60% 30% 60%;
  }
  100% {
    border-radius: 60% 40% 30% 70%/60% 30% 70% 40%;
  }
`;

const floating = keyframes`
  0% {
    transform: translateY(0px) rotate(0deg);
  }
  50% {
    transform: translateY(-20px) rotate(2deg);
  }
  100% {
    transform: translateY(0px) rotate(0deg);
  }
`;

const fadeIn = keyframes`
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

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

const shine = keyframes`
  0% {
    background-position: -100% 0;
  }
  100% {
    background-position: 200% 0;
  }
`;

const typing = keyframes`
  0% { content: ''; }
  1% { content: 'X'; }
  2% { content: 'XX'; }
  3% { content: 'XXX'; }
  4% { content: 'XXXX'; }
  5% { content: 'XXXX-'; }
  6% { content: 'XXXX-X'; }
  7% { content: 'XXXX-XX'; }
  8% { content: 'XXXX-XXX'; }
  9% { content: 'XXXX-XXXX'; }
  10% { content: 'XXXX-XXXX-'; }
  11% { content: 'XXXX-XXXX-X'; }
  12% { content: 'XXXX-XXXX-XX'; }
  13% { content: 'XXXX-XXXX-XXX'; }
  14% { content: 'XXXX-XXXX-XXXX'; }
  85% { content: 'XXXX-XXXX-XXXX'; }
  86% { content: 'XXXX-XXXX-XXX'; }
  87% { content: 'XXXX-XXXX-XX'; }
  88% { content: 'XXXX-XXXX-X'; }
  89% { content: 'XXXX-XXXX-'; }
  90% { content: 'XXXX-XXXX'; }
  91% { content: 'XXXX-XXX'; }
  92% { content: 'XXXX-XX'; }
  93% { content: 'XXXX-X'; }
  94% { content: 'XXXX'; }
  95% { content: 'XXX'; }
  96% { content: 'XX'; }
  97% { content: 'X'; }
  98% { content: ''; }
  100% { content: ''; }
`;

const cursorBlink = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
`;

const blink = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
`;

const rotateIn = keyframes`
  from {
    opacity: 0;
    transform: rotate(-180deg);
  }
  to {
    opacity: 1;
    transform: rotate(0);
  }
`;

const wiggle = keyframes`
  0%, 100% { transform: rotate(0); }
  25% { transform: rotate(10deg); }
  75% { transform: rotate(-10deg); }
`;

const LoginPage = () => {
  const [license, setLicense] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const mode = useThemeMode();
  const isDark = mode === "light" ? false : true;
  const theme = useTheme();
  const { t } = useTranslation();

  // Hide tray icon on mount and show it when navigating away
  useEffect(() => {
    // Hide tray icon when component mounts
    invoke('hide_tray')
      .catch(err => console.error('Failed to hide tray:', err));

    // Show tray icon when component unmounts
    return () => {
      invoke('show_tray')
        .catch(err => console.error('Failed to show tray:', err));
    };
  }, []);

  // Clear authentication on component mount
  useEffect(() => {
    sessionStorage.removeItem('isAuthenticated');
  }, []);

  const handleLogin = async () => {
    if (!license.trim()) {
      setError('Please enter a license key');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const isValid = await validateLicense(license.trim());
      if (isValid) {
        sessionStorage.setItem('isAuthenticated', 'true');
        sessionStorage.setItem('licenseKey', license.trim());
        navigate('/home');
      } else {
        setError('Invalid license key');
      }
    } catch (err) {
      setError('Failed to validate license. Please try again.');
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !loading) {
      handleLogin();
    }
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setLicense(text.trim());
      setError('');
    } catch (err) {
      console.error('Failed to paste:', err);
    }
  };

  const handleQuit = async () => {
    await exitApp();
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
        background: 'transparent',
        userSelect: 'none',
        '&::before': {
          content: '""',
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: isDark
            ? 'linear-gradient(to bottom right, rgba(15, 23, 42, 0.85), rgba(30, 27, 75, 0.85))'
            : 'linear-gradient(to bottom right, rgba(30, 41, 59, 0.85), rgba(51, 65, 85, 0.85))',
          backdropFilter: 'blur(20px)',
          WebkitAppRegion: 'drag',
          zIndex: 0,
        },
      }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Updated Quit Button with Animations */}
      <Box 
        sx={{ 
          position: 'fixed', 
          top: 0, 
          right: 0,
          padding: '8px',
          zIndex: 10,
          WebkitAppRegion: 'no-drag',
          animation: `${fadeIn} 0.5s ease-out`,
        }}
      >
        <Tooltip title={t('Quit')} arrow placement="bottom">
          <IconButton
            onClick={handleQuit}
            sx={{
              width: 28,
              height: 28,
              backgroundColor: 'transparent',
              color: isDark ? '#94a3b8' : '#e2e8f0',
              animation: `${rotateIn} 0.5s ease-out`,
              '&:hover': {
                backgroundColor: isDark 
                  ? 'rgba(239, 68, 68, 0.1)'
                  : 'rgba(239, 68, 68, 0.15)',
                color: '#ef4444',
                '& .close-icon': {
                  animation: `${wiggle} 0.5s ease-in-out`,
                  transform: 'scale(1.1)',
                },
              },
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:active': {
                transform: 'scale(0.95)',
              },
            }}
          >
            <CloseRounded 
              className="close-icon"
              sx={{ 
                fontSize: 18,
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              }} 
            />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Background Shapes */}
      {[...Array(3)].map((_, i) => (
        <Box
          key={i}
          sx={{
            position: 'absolute',
            width: ['300px', '400px', '350px'][i],
            height: ['300px', '400px', '350px'][i],
            background: isDark
              ? [
                  'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                  'linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)',
                  'linear-gradient(135deg, #2563eb 0%, #1e40af 100%)',
                ][i]
              : [
                  'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                  'linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)',
                  'linear-gradient(135deg, #2563eb 0%, #1e40af 100%)',
                ][i],
            top: ['10%', '60%', '30%'][i],
            left: ['15%', '60%', '45%'][i],
            borderRadius: '60% 40% 30% 70%/60% 30% 70% 40%',
            animation: `${morphing} ${20 + i * 2}s ease-in-out infinite alternate, ${floating} ${15 + i * 2}s ease-in-out infinite`,
            opacity: 0.15,
            filter: 'blur(50px)',
            zIndex: 0,
          }}
        />
      ))}

      <Paper
        elevation={24}
        sx={{
          p: 4,
          width: '100%',
          maxWidth: 400,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 3,
          borderRadius: '30px',
          background: isDark
            ? 'rgba(30, 41, 59, 0.7)'
            : 'rgba(30, 41, 59, 0.85)',
          backdropFilter: 'blur(20px)',
          border: '1px solid',
          borderColor: isDark
            ? 'rgba(148, 163, 184, 0.1)'
            : 'rgba(148, 163, 184, 0.2)',
          animation: `${fadeIn} 0.8s ease-out`,
          position: 'relative',
          zIndex: 1,
          WebkitAppRegion: 'no-drag',
          boxShadow: '0 0 40px rgba(30, 41, 59, 0.4)',
          '&::before': {
            content: '""',
            position: 'absolute',
            inset: '-1px',
            borderRadius: '30px',
            padding: '2px',
            background: 'linear-gradient(45deg, rgba(59,130,246,0.5), rgba(147,51,234,0.5))',
            WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
            WebkitMaskComposite: 'xor',
            maskComposite: 'exclude',
          },
        }}
      >
        {/* Logo Section with Enhanced Animation */}
        <Box 
          sx={{ 
            display: 'flex', 
            flexDirection: 'column',
            alignItems: 'center', 
            gap: 2,
            mb: 2,
          }}
        >
          <Box
            sx={{
              position: 'relative',
              padding: '24px',
              borderRadius: '50%',
              background: isDark
                ? 'linear-gradient(135deg, rgba(59,130,246,0.1), rgba(147,51,234,0.1))'
                : 'linear-gradient(135deg, rgba(59,130,246,0.15), rgba(147,51,234,0.15))',
              animation: `${pulse} 3s infinite ease-in-out`,
              '&::before': {
                content: '""',
                position: 'absolute',
                inset: '-2px',
                borderRadius: '50%',
                padding: '2px',
                background: 'linear-gradient(45deg, rgba(59,130,246,0.5), rgba(147,51,234,0.5))',
                WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                WebkitMaskComposite: 'xor',
                maskComposite: 'exclude',
              },
            }}
          >
            <SvgIcon
              component={isDark ? iconDark : iconLight}
              sx={{
                height: 48,
                width: 48,
                filter: 'drop-shadow(0 0 10px rgba(59,130,246,0.4))',
              }}
              inheritViewBox
            />
          </Box>
          <Typography
            variant="h4"
            sx={{
              fontWeight: 700,
              background: isDark
                ? 'linear-gradient(to right, #60a5fa, #818cf8)'
                : 'linear-gradient(to right, #60a5fa, #818cf8)',
              backgroundSize: '200% auto',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              textShadow: '0 2px 10px rgba(59,130,246,0.3)',
              animation: `${shine} 3s linear infinite`,
            }}
          >
            ErrorX
          </Typography>
        </Box>

        {/* Security Icon */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            mb: 1,
          }}
        >
          <SecurityIcon
            sx={{
              color: isDark ? '#60a5fa' : '#60a5fa',
              fontSize: 20,
            }}
          />
          <Typography
            variant="subtitle1"
            sx={{
              color: isDark ? '#94a3b8' : '#e2e8f0',
              textAlign: 'center',
              fontWeight: 500,
              letterSpacing: '0.5px',
            }}
          >
            {t('Enter your license key to continue')}
          </Typography>
        </Box>

        {/* Enhanced TextField with Animated Placeholder */}
        <TextField
          fullWidth
          variant="outlined"
          label={t('License Key')}
          value={license}
          onChange={(e) => {
            setLicense(e.target.value);
            setError('');
          }}
          onKeyPress={handleKeyPress}
          error={!!error}
          helperText={error}
          disabled={loading}
          placeholder={t('Please enter a license key')}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <KeyIcon sx={{ color: isDark ? '#60a5fa' : '#3b82f6' }} />
              </InputAdornment>
            ),
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  onClick={handlePaste}
                  edge="end"
                  disabled={loading}
                  sx={{
                    color: isDark ? '#60a5fa' : '#3b82f6',
                    '&:hover': {
                      backgroundColor: isDark
                        ? 'rgba(59,130,246,0.1)'
                        : 'rgba(59,130,246,0.05)',
                    },
                  }}
                >
                  <ContentPasteIcon />
                </IconButton>
              </InputAdornment>
            ),
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              backgroundColor: isDark
                ? 'rgba(30, 41, 59, 0.5)'
                : 'rgba(30, 41, 59, 0.3)',
              backdropFilter: 'blur(10px)',
              borderRadius: '15px',
              transition: 'all 0.3s ease',
              '&:hover': {
                backgroundColor: isDark
                  ? 'rgba(30, 41, 59, 0.7)'
                  : 'rgba(30, 41, 59, 0.4)',
                '& fieldset': {
                  borderColor: '#60a5fa',
                },
              },
              '& fieldset': {
                borderWidth: '2px',
                borderColor: isDark
                  ? 'rgba(148, 163, 184, 0.2)'
                  : 'rgba(96, 165, 250, 0.3)',
              },
              '&.Mui-focused fieldset': {
                borderColor: '#60a5fa',
              },
            },
            '& .MuiInputLabel-root': {
              color: isDark ? '#94a3b8' : '#e2e8f0',
              fontSize: '1rem',
            },
            '& .MuiInputBase-input': {
              color: isDark ? '#e2e8f0' : '#ffffff',
              fontSize: '1.2rem',
              letterSpacing: '1.5px',
              height: '2.2em',
              caretColor: '#60a5fa',
              '&::placeholder': {
                color: 'transparent',
              },
            },
            position: 'relative',
            '&::before': {
              content: '""',
              position: 'absolute',
              left: '48px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: isDark ? 'rgba(148, 163, 184, 0.5)' : 'rgba(226, 232, 240, 0.5)',
              animation: `${typing} 3s linear infinite`,
              pointerEvents: 'none',
              zIndex: 1,
              fontFamily: 'monospace',
              fontSize: '1.2rem',
              letterSpacing: '1.5px',
              fontWeight: 500,
              opacity: license ? 0 : 1,
              transition: 'opacity 0.2s ease',
            },
          }}
        />

        {/* Enhanced Button */}
        <Button
          fullWidth
          variant="contained"
          size="large"
          onClick={handleLogin}
          disabled={loading}
          startIcon={loading ? null : <LockOpenIcon />}
          sx={{
            py: 1.5,
            textTransform: 'none',
            fontSize: '1.1rem',
            fontWeight: 600,
            borderRadius: '15px',
            background: isDark
              ? 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)'
              : 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)',
            boxShadow: isDark
              ? '0 4px 15px rgba(59,130,246,0.3)'
              : '0 8px 20px rgba(59,130,246,0.25)',
            transition: 'all 0.3s ease',
            '&:hover': {
              transform: 'translateY(-2px)',
              boxShadow: isDark
                ? '0 6px 20px rgba(59,130,246,0.4)'
                : '0 12px 25px rgba(59,130,246,0.35)',
              background: isDark
                ? 'linear-gradient(135deg, #2563eb 0%, #4f46e5 100%)'
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
          {loading ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CircularProgress size={20} color="inherit" />
              <span>{t('Validating...')}</span>
            </Box>
          ) : (
            t('Login')
          )}
        </Button>

        {/* Social Media Links */}
        <Box sx={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center',
          gap: 2,
          mt: 2,
          animation: `${fadeIn} 0.5s ease-out`,
        }}>
          <Typography
            variant="subtitle2"
            sx={{
              color: isDark ? '#94a3b8' : '#e2e8f0',
              fontWeight: 500,
              letterSpacing: '0.5px',
              opacity: 0.8,
            }}
          >
            {t('Join Us')}
          </Typography>

          <Box sx={{ 
            display: 'flex', 
            gap: 3,
            '& a': {
              color: isDark ? '#94a3b8' : '#e2e8f0',
              textDecoration: 'none',
              fontSize: '0.9rem',
              fontWeight: 500,
              letterSpacing: '0.5px',
              transition: 'all 0.3s ease',
              padding: '6px 12px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              background: isDark 
                ? 'rgba(30, 41, 59, 0.5)'
                : 'rgba(30, 41, 59, 0.3)',
              backdropFilter: 'blur(10px)',
              border: '1px solid',
              borderColor: 'transparent',
              '&:hover': {
                transform: 'translateY(-2px)',
                background: isDark
                  ? 'rgba(59, 130, 246, 0.1)'
                  : 'rgba(59, 130, 246, 0.15)',
                borderColor: '#60a5fa',
                color: '#60a5fa',
              },
              '&:active': {
                transform: 'translateY(0)',
              },
            }
          }}>
            <a href="https://facebook.com/ErrorX.gg" target="_blank" rel="noopener noreferrer">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
              Facebook
            </a>
            <a href="https://t.me/ErrorX_BD" target="_blank" rel="noopener noreferrer">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.665 3.717l-17.73 6.837c-1.21.486-1.203 1.161-.222 1.462l4.552 1.42l10.532-6.645c.498-.303.953-.14.579.192l-8.533 7.701l-.332 4.865c.487 0 .703-.22.975-.48l2.34-2.272l4.866 3.595c.897.494 1.54.24 1.764-.83l3.177-14.98c.325-1.303-.5-1.894-1.968-1.307z"/>
              </svg>
              Telegram
            </a>
            <a href="https://discord.com/invite/qG8HP5Yxqe" target="_blank" rel="noopener noreferrer">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
              </svg>
              Discord
            </a>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
};

export default LoginPage; 