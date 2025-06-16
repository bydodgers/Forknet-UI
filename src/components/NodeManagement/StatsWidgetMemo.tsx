import React from 'react';
import { Card, CardContent, Typography, Box, useTheme, alpha, CircularProgress } from '@mui/material';

interface StatsWidgetProps {
  title: string;
  value: string | number | React.ReactNode;
  icon: React.ReactNode;
  loading?: boolean;
  type?: 'default' | 'success' | 'warning' | 'error' | 'info';
}

// Memoized version to prevent unnecessary re-renders
const StatsWidget: React.FC<StatsWidgetProps> = React.memo(({ 
  title, 
  value, 
  icon, 
  loading, 
  type = 'default' 
}) => {
  const theme = useTheme();

  const getColorScheme = React.useMemo(() => {
    switch (type) {
      case 'success':
        return {
          background: `linear-gradient(135deg, ${alpha(theme.palette.success.main, 0.15)} 0%, ${alpha(theme.palette.success.main, 0.05)} 100%)`,
          border: alpha(theme.palette.success.main, 0.3),
          iconColor: theme.palette.success.main,
          iconBg: alpha(theme.palette.success.main, 0.1),
        };
      case 'warning':
        return {
          background: `linear-gradient(135deg, ${alpha(theme.palette.warning.main, 0.15)} 0%, ${alpha(theme.palette.warning.main, 0.05)} 100%)`,
          border: alpha(theme.palette.warning.main, 0.3),
          iconColor: theme.palette.warning.main,
          iconBg: alpha(theme.palette.warning.main, 0.1),
        };
      case 'error':
        return {
          background: `linear-gradient(135deg, ${alpha(theme.palette.error.main, 0.15)} 0%, ${alpha(theme.palette.error.main, 0.05)} 100%)`,
          border: alpha(theme.palette.error.main, 0.3),
          iconColor: theme.palette.error.main,
          iconBg: alpha(theme.palette.error.main, 0.1),
        };
      case 'info':
        return {
          background: `linear-gradient(135deg, ${alpha(theme.palette.info.main, 0.15)} 0%, ${alpha(theme.palette.info.main, 0.05)} 100%)`,
          border: alpha(theme.palette.info.main, 0.3),
          iconColor: theme.palette.info.main,
          iconBg: alpha(theme.palette.info.main, 0.1),
        };
      default:
        return {
          background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.15)} 0%, ${alpha(theme.palette.primary.main, 0.05)} 100%)`,
          border: alpha(theme.palette.primary.main, 0.3),
          iconColor: theme.palette.primary.main,
          iconBg: alpha(theme.palette.primary.main, 0.1),
        };
    }
  }, [type, theme]);

  return (
    <Card
      sx={{
        height: '100%',
        background: getColorScheme.background,
        border: `2px solid ${getColorScheme.border}`,
        borderRadius: 3,
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        position: 'relative',
        overflow: 'hidden',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: `0 12px 24px ${alpha(getColorScheme.iconColor, 0.15)}`,
          '& .stats-icon': {
            transform: 'scale(1.1) rotate(5deg)',
          }
        },
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '4px',
          background: `linear-gradient(90deg, ${getColorScheme.iconColor} 0%, ${alpha(getColorScheme.iconColor, 0.7)} 100%)`,
        }
      }}
    >
      <CardContent sx={{ textAlign: 'center', py: 3, position: 'relative' }}>
        <Box
          className="stats-icon"
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 64,
            height: 64,
            borderRadius: '50%',
            background: getColorScheme.iconBg,
            color: getColorScheme.iconColor,
            mb: 2,
            transition: 'transform 0.3s ease',
            backdropFilter: 'blur(10px)',
            border: `2px solid ${alpha(getColorScheme.iconColor, 0.2)}`,
          }}
        >
          {icon}
        </Box>
        <Typography
          variant="h3"
          component="div"
          sx={{
            fontWeight: 700,
            mb: 1,
            background: `linear-gradient(135deg, ${theme.palette.text.primary} 0%, ${alpha(theme.palette.text.primary, 0.7)} 100%)`,
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            fontSize: '1rem',
            lineHeight: 1.2,
          }}
        >
          {loading ? (
            <CircularProgress size={32} sx={{ color: getColorScheme.iconColor }} />
          ) : (
            value
          )}
        </Typography>
        <Typography
          variant="subtitle1"
          color="text.secondary"
          sx={{
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            fontSize: '0.75rem',
          }}
        >
          {title}
        </Typography>
      </CardContent>
    </Card>
  );
});

// Add display name for debugging
StatsWidget.displayName = 'StatsWidget';

export default StatsWidget;