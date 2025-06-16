import React, { useMemo, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  IconButton,
  Grid,
  Chip,
  CardActions,
  Avatar,
  Divider,
  Snackbar,
  Alert,
  Paper,
  Container,
  AppBar,
  Toolbar,
  useTheme,
  alpha,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Tooltip,
} from '@mui/material';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import MemoryIcon from '@mui/icons-material/Memory';
import StorageIcon from '@mui/icons-material/Storage';
import TravelExploreIcon from '@mui/icons-material/TravelExplore';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';
import DownloadIcon from '@mui/icons-material/Download';
import PersonIcon from '@mui/icons-material/Person';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import CloseIcon from '@mui/icons-material/Close';
import InfoIcon from '@mui/icons-material/Info';
import SecurityIcon from '@mui/icons-material/Security';
import DashboardIcon from '@mui/icons-material/Dashboard';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ScheduleIcon from '@mui/icons-material/Schedule';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { RootState, AppDispatch } from '../store';
import { logout } from '../store/slices/authSlice';
import { CryptoUtils } from '../utils/crypto';
import { ROUTES } from '../utils/constants';
import PasswordDialog from '../components/Dialogs/PasswordDialog';
import ShowPrivateKeyDialog from '../components/Security/ShowPrivateKeyDialog';

// Unified Stats Widget Component
interface StatsWidgetProps {
  title: string;
  value: string | number | React.ReactNode;
  icon: React.ReactNode;
  variant?: 'primary' | 'success' | 'neutral';
}

const StatsWidget: React.FC<StatsWidgetProps> = ({ title, value, icon, variant = 'neutral' }) => {
  const theme = useTheme();

  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return {
          borderColor: theme.palette.primary.main,
          iconBg: alpha(theme.palette.primary.main, 0.1),
          iconColor: theme.palette.primary.main,
        };
      case 'success':
        return {
          borderColor: theme.palette.success.main,
          iconBg: alpha(theme.palette.success.main, 0.1),
          iconColor: theme.palette.success.main,
        };
      default:
        return {
          borderColor: theme.palette.grey[300],
          iconBg: alpha(theme.palette.grey[500], 0.1),
          iconColor: theme.palette.grey[600],
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <Card
      sx={{
        height: '100%',
        border: `2px solid ${styles.borderColor}`,
        borderRadius: 2,
        transition: 'all 0.3s ease',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: 3,
          borderColor: variant === 'neutral' ? theme.palette.primary.main : styles.borderColor,
        },
      }}
    >
      <CardContent sx={{ textAlign: 'center', py: 3 }}>
        <Box
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 56,
            height: 56,
            borderRadius: '50%',
            bgcolor: styles.iconBg,
            color: styles.iconColor,
            mb: 2,
          }}
        >
          {icon}
        </Box>
        <Typography variant="h5" component="div" sx={{ fontWeight: 700, mb: 1 }}>
          {value}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
          {title}
        </Typography>
      </CardContent>
    </Card>
  );
};

const Dashboard: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const theme = useTheme();
  const { account } = useSelector((state: RootState) => state.auth);

  // Helper function for blockchain-accurate balance display
  const formatBalance = (balance: number | undefined): string => {
    if (typeof balance !== 'number' || isNaN(balance)) {
      return '0.00000000';
    }

    // Show up to 8 decimal places, remove trailing zeros
    return balance.toFixed(8).replace(/\.?0+$/, '') || '0';
  };

  // Dialog states
  const [showPrivateKeyDialog, setShowPrivateKeyDialog] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [backupLoading, setBackupLoading] = useState(false);

  // Mobile menu state
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);

  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info' | 'warning';
  }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const handleLogout = () => {
    dispatch(logout());
  };

  const handleDownloadBackup = async (password: string) => {
    if (!account) {
      setSnackbar({
        open: true,
        message: 'No account data available',
        severity: 'error',
      });
      return;
    }

    setBackupLoading(true);

    try {
      const privateKey = localStorage.getItem('forknet_private_key');
      if (!privateKey) {
        throw new Error('No private key found. Please login again.');
      }

      const backupData = await CryptoUtils.generateBackupData(
        privateKey,
        password,
        account.address
      );

      // Create and download the backup file
      const blob = new Blob([JSON.stringify(backupData, null, 2)], {
        type: 'application/json'
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `forknet_backup_${account.address}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setSnackbar({
        open: true,
        message: 'Backup file downloaded successfully! Keep it safe.',
        severity: 'success',
      });

    } catch (error: any) {
      console.error('Backup creation error:', error);
      setSnackbar({
        open: true,
        message: `Failed to create backup file: ${error.message}`,
        severity: 'error',
      });
      throw error;
    } finally {
      setBackupLoading(false);
    }
  };

  // Menu action handlers
  const handleMenuAction = (action: string) => {
    setMenuAnchor(null);

    switch (action) {
      case 'showPrivateKey':
        setShowPrivateKeyDialog(true);
        break;
      case 'downloadBackup':
        setShowPasswordDialog(true);
        break;
    }
  };

  const navigationCards = useMemo(() => [
    {
      title: 'Wallet',
      description: 'Manage your FRK balance and transactions',
      icon: <AccountBalanceWalletIcon sx={{ fontSize: 32 }} />,
      route: ROUTES.WALLET,
      status: 'Coming Soon',
      available: false,
    },
    {
      title: 'Minting Details',
      description: 'View blockchain stats and minting information',
      icon: <MemoryIcon sx={{ fontSize: 32 }} />,
      route: ROUTES.MINTING,
      status: 'Coming Soon',
      available: false,
    },
    {
      title: 'Node Management',
      description: 'Manage peers, sync status, and node configuration',
      icon: <StorageIcon sx={{ fontSize: 32 }} />,
      route: ROUTES.NODE_MANAGEMENT,
      status: 'Available',
      available: true,
    },
    {
      title: 'Blockchain Explorer',
      description: 'Search and view all blockchain transactions',
      icon: <TravelExploreIcon sx={{ fontSize: 32 }} />,
      route: ROUTES.EXPLORER,
      status: 'Available',
      available: true,
    },
  ], []);

  if (!account) {
    return (
      <Container maxWidth="xl" sx={{ py: 3 }}>
        <Typography>No account data available</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Responsive Header */}
      <AppBar
        position="static"
        elevation={2}
        sx={{
          borderRadius: 2,
          mb: 4,
          background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`
        }}
      >
        <Toolbar>
          <DashboardIcon sx={{ mr: 1 }} />
          <Typography
            variant="h5"
            component="div"
            sx={{
              flexGrow: 1,
              fontWeight: 'bold',
              fontSize: { xs: '1.25rem', sm: '1.5rem' }
            }}
          >
            Forknet Dashboard
          </Typography>

          <Box display="flex" gap={1} alignItems="center">
            {/* Desktop: Show all buttons */}
            <Box display={{ xs: 'none', md: 'flex' }} gap={1}>
              <Button
                variant="outlined"
                startIcon={<SecurityIcon />}
                onClick={() => setShowPrivateKeyDialog(true)}
                sx={{
                  color: 'white',
                  borderColor: 'rgba(255,255,255,0.3)',
                  '&:hover': {
                    borderColor: 'rgba(255,255,255,0.7)',
                    backgroundColor: 'rgba(255,255,255,0.1)'
                  }
                }}
              >
                Show Private Key
              </Button>
              <Button
                variant="outlined"
                startIcon={<DownloadIcon />}
                onClick={() => setShowPasswordDialog(true)}
                disabled={backupLoading}
                sx={{
                  color: 'white',
                  borderColor: 'rgba(255,255,255,0.3)',
                  '&:hover': {
                    borderColor: 'rgba(255,255,255,0.7)',
                    backgroundColor: 'rgba(255,255,255,0.1)'
                  }
                }}
              >
                {backupLoading ? 'Creating...' : 'Download Backup'}
              </Button>
            </Box>

            {/* Mobile: Icon menu */}
            <Box display={{ xs: 'flex', md: 'none' }} alignItems="center">
              <Tooltip title="Account Actions">
                <IconButton
                  onClick={(e) => setMenuAnchor(e.currentTarget)}
                  sx={{
                    color: 'white',
                    border: '1px solid rgba(255,255,255,0.3)',
                    '&:hover': {
                      backgroundColor: 'rgba(255,255,255,0.1)',
                      borderColor: 'rgba(255,255,255,0.7)',
                    }
                  }}
                >
                  <MoreVertIcon />
                </IconButton>
              </Tooltip>

              <Menu
                anchorEl={menuAnchor}
                open={Boolean(menuAnchor)}
                onClose={() => setMenuAnchor(null)}
                anchorOrigin={{
                  vertical: 'bottom',
                  horizontal: 'right',
                }}
                transformOrigin={{
                  vertical: 'top',
                  horizontal: 'right',
                }}
                PaperProps={{
                  sx: {
                    mt: 1,
                    minWidth: 200,
                  }
                }}
              >
                <MenuItem
                  onClick={() => handleMenuAction('showPrivateKey')}
                  sx={{ py: 1.5 }}
                >
                  <ListItemIcon>
                    <SecurityIcon color="error" />
                  </ListItemIcon>
                  <ListItemText>Show Private Key</ListItemText>
                </MenuItem>
                <MenuItem
                  onClick={() => handleMenuAction('downloadBackup')}
                  disabled={backupLoading}
                  sx={{ py: 1.5 }}
                >
                  <ListItemIcon>
                    <DownloadIcon color={backupLoading ? 'disabled' : 'primary'} />
                  </ListItemIcon>
                  <ListItemText>
                    {backupLoading ? 'Creating Backup...' : 'Download Backup'}
                  </ListItemText>
                </MenuItem>
              </Menu>
            </Box>

            {/* Always visible logout with responsive label */}
            <Button
              variant="outlined"
              startIcon={<ExitToAppIcon />}
              onClick={handleLogout}
              sx={{
                color: 'white',
                borderColor: 'rgba(255,255,255,0.3)',
                ml: 1,
                '&:hover': {
                  borderColor: 'rgba(255,255,255,0.7)',
                  backgroundColor: 'rgba(255,255,255,0.1)'
                }
              }}
            >
              <Box display={{ xs: 'none', sm: 'block' }}>Logout</Box>
            </Button>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Account Overview Stats */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, md: 6 }}>
          <StatsWidget
            title="Account Level"
            value={`Level ${account.level || 0}`}
            icon={<TrendingUpIcon sx={{ fontSize: 28 }} />}
            variant={account.level && account.level > 0 ? "success" : "neutral"}
          />
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <StatsWidget
            title="FRK Balance"
            value={
              <Typography
                variant="h5"
                component="div"
                sx={{
                  fontWeight: 700,
                  fontFamily: 'monospace',
                  fontSize: '1.2rem'
                }}
              >
                {formatBalance(account.balance)}
              </Typography>
            }
            icon={<AccountBalanceWalletIcon sx={{ fontSize: 24 }} />}
            variant="primary"
          />
        </Grid>
      </Grid>

      {/* Account Details Card */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Box display="flex" alignItems="center" mb={3}>
            <Avatar sx={{ bgcolor: 'primary.main', mr: 2, width: 56, height: 56 }}>
              <PersonIcon sx={{ fontSize: 32 }} />
            </Avatar>
            <Box flexGrow={1}>
              <Typography variant="h5" gutterBottom>
                Account Information
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Your Forknet account details and status
              </Typography>
            </Box>
          </Box>

          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Box mb={2}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Account Address
                </Typography>
                <Paper
                  elevation={0}
                  sx={{
                    p: 2,
                    bgcolor: 'grey.50',
                    borderRadius: 2,
                    border: '1px solid',
                    borderColor: 'grey.200',
                  }}
                >
                  <Typography
                    variant="body2"
                    sx={{
                      wordBreak: 'break-all',
                      fontFamily: 'monospace',
                      fontSize: '0.875rem',
                      lineHeight: 1.5,
                    }}
                  >
                    {account.address}
                  </Typography>
                </Paper>
              </Box>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <Box mb={2}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Public Key
                </Typography>
                <Paper
                  elevation={0}
                  sx={{
                    p: 2,
                    bgcolor: 'grey.50',
                    borderRadius: 2,
                    border: '1px solid',
                    borderColor: 'grey.200',
                  }}
                >
                  <Typography
                    variant="body2"
                    sx={{
                      wordBreak: 'break-all',
                      fontFamily: 'monospace',
                      fontSize: '0.875rem',
                      lineHeight: 1.5,
                    }}
                  >
                    {account.publicKey}
                  </Typography>
                </Paper>
              </Box>
            </Grid>
          </Grid>

          {account.balance === 0 && (
            <Alert severity="info" sx={{ mt: 2 }}>
              <Typography variant="body2">
                <strong>New Account:</strong> Your account will appear on the network after your first transaction.
                Current balance and level will update once you receive FRK or interact with the network.
              </Typography>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Unified Navigation Cards */}
      <Typography variant="h5" gutterBottom sx={{ mb: 3, fontWeight: 'bold' }}>
        Available Features
      </Typography>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        {navigationCards.map((card) => (
          <Grid size={{ xs: 12, sm: 6, md: 3 }} key={card.title}>
            <Card
              sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                border: `2px solid ${card.available ? theme.palette.primary.main : theme.palette.grey[300]}`,
                backgroundColor: card.available ? alpha(theme.palette.primary.main, 0.02) : 'background.paper',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 4,
                  borderColor: theme.palette.primary.main,
                  backgroundColor: alpha(theme.palette.primary.main, 0.05),
                },
              }}
              onClick={() => navigate(card.route)}
            >
              <CardContent sx={{ flexGrow: 1, textAlign: 'center' }}>
                <Box
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 80,
                    height: 80,
                    borderRadius: '50%',
                    bgcolor: card.available
                      ? alpha(theme.palette.primary.main, 0.1)
                      : alpha(theme.palette.grey[500], 0.1),
                    color: card.available
                      ? theme.palette.primary.main
                      : theme.palette.grey[500],
                    mb: 2,
                    transition: 'all 0.3s ease',
                  }}
                >
                  {card.icon}
                </Box>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                  {card.title}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2, minHeight: '40px' }}>
                  {card.description}
                </Typography>
                <Chip
                  label={card.status}
                  color={card.available ? 'success' : 'default'}
                  variant={card.available ? 'filled' : 'outlined'}
                  size="small"
                />
              </CardContent>

              <CardActions sx={{ justifyContent: 'center', pb: 2 }}>
                <Button
                  size="medium"
                  variant={card.available ? 'contained' : 'outlined'}
                  color="primary"
                >
                  {card.available ? 'Open' : 'Preview'}
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Cohesive Getting Started Section */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" alignItems="center" mb={3}>
            <Box
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 48,
                height: 48,
                borderRadius: '50%',
                bgcolor: alpha(theme.palette.primary.main, 0.1),
                color: theme.palette.primary.main,
                mr: 2,
              }}
            >
              <InfoIcon sx={{ fontSize: 24 }} />
            </Box>
            <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
              🚀 Getting Started with Forknet
            </Typography>
          </Box>

          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 4 }}>
              <Card
                variant="outlined"
                sx={{
                  height: '100%',
                  border: `2px solid ${alpha(theme.palette.success.main, 0.3)}`,
                  '&:hover': { borderColor: theme.palette.success.main }
                }}
              >
                <CardContent>
                  <Box display="flex" alignItems="center" gap={1} mb={2}>
                    <Box
                      sx={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        bgcolor: alpha(theme.palette.success.main, 0.1),
                        color: theme.palette.success.main,
                      }}
                    >
                      <SecurityIcon sx={{ fontSize: 16 }} />
                    </Box>
                    <Typography variant="h6" color="success.dark">
                      Security First
                    </Typography>
                  </Box>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    • <strong>Download Backup:</strong> Create encrypted backup files for secure account recovery
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    • <strong>Store Safely:</strong> Keep your seedphrase and private key secure
                  </Typography>
                  <Typography variant="body2">
                    • <strong>Private Key:</strong> Use "Show Private Key" only when needed for minting setup
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid size={{ xs: 12, md: 4 }}>
              <Card
                variant="outlined"
                sx={{
                  height: '100%',
                  border: `2px solid ${alpha(theme.palette.primary.main, 0.3)}`,
                  '&:hover': { borderColor: theme.palette.primary.main }
                }}
              >
                <CardContent>
                  <Box display="flex" alignItems="center" gap={1} mb={2}>
                    <Box
                      sx={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        bgcolor: alpha(theme.palette.primary.main, 0.1),
                        color: theme.palette.primary.main,
                      }}
                    >
                      <CheckCircleIcon sx={{ fontSize: 16 }} />
                    </Box>
                    <Typography variant="h6" color="primary.dark">
                      Active Features
                    </Typography>
                  </Box>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    • <strong>Node Management:</strong> Monitor your node's health, peers, and sync status
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    • <strong>Settings:</strong> Configure node connection and check API key status
                  </Typography>
                  <Typography variant="body2">
                    • <strong>Minting Setup:</strong> Add your account to the minting pool (Level 1+ required)
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid size={{ xs: 12, md: 4 }}>
              <Card
                variant="outlined"
                sx={{
                  height: '100%',
                  border: `2px solid ${alpha(theme.palette.grey[500], 0.3)}`,
                  '&:hover': { borderColor: theme.palette.grey[500] }
                }}
              >
                <CardContent>
                  <Box display="flex" alignItems="center" gap={1} mb={2}>
                    <Box
                      sx={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        bgcolor: alpha(theme.palette.grey[500], 0.1),
                        color: theme.palette.grey[600],
                      }}
                    >
                      <ScheduleIcon sx={{ fontSize: 16 }} />
                    </Box>
                    <Typography variant="h6" color="text.primary">
                      Future Features
                    </Typography>
                  </Box>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    • <strong>Wallet:</strong> Send and receive FRK transactions
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    • <strong>Minting Details:</strong> View detailed blockchain statistics and minting rewards
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Divider sx={{ my: 3 }} />

          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="body2">
              <strong>Forknet Testnet:</strong> This is a testing environment. The blockchain may restart periodically.
              Keep your backup files safe and be prepared to reconfigure minting accounts after chain restarts.
            </Typography>
          </Alert>
        </CardContent>
      </Card>

      {/* Password Dialog */}
      <PasswordDialog
        open={showPasswordDialog}
        onClose={() => setShowPasswordDialog(false)}
        onConfirm={handleDownloadBackup}
        loading={backupLoading}
        title="Create Backup File"
        description="Enter a password to encrypt your backup file. You'll need this password to restore your account from the backup."
      />

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          variant="filled"
          action={
            <IconButton size="small" color="inherit" onClick={() => setSnackbar({ ...snackbar, open: false })}>
              <CloseIcon fontSize="small" />
            </IconButton>
          }
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* Show Private Key Dialog */}
      <ShowPrivateKeyDialog
        open={showPrivateKeyDialog}
        onClose={() => setShowPrivateKeyDialog(false)}
      />
    </Container>
  );
};

export default Dashboard;