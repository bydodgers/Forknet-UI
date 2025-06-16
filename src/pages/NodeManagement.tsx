import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Chip,
  FormControl,
  InputLabel,
  Select,
  Menu,
  MenuItem,
  Tooltip,
  Grid,
  CircularProgress,
  Snackbar,
  Avatar,
  TablePagination,
  TableFooter,
  Container,
  AppBar,
  Toolbar,
  useTheme,
  alpha,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import SyncIcon from '@mui/icons-material/Sync';
import RefreshIcon from '@mui/icons-material/Refresh';
import StorageIcon from '@mui/icons-material/Storage';
import SettingsIcon from '@mui/icons-material/Settings';
import PeopleAltIcon from '@mui/icons-material/PeopleAlt';
import TimerIcon from '@mui/icons-material/Timer';
import StopIcon from '@mui/icons-material/Stop';
import MemoryIcon from '@mui/icons-material/Memory';
import RouterIcon from '@mui/icons-material/Router';
import ScheduleIcon from '@mui/icons-material/Schedule';
import CodeIcon from '@mui/icons-material/Code';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import FirstPageIcon from '@mui/icons-material/FirstPage';
import LastPageIcon from '@mui/icons-material/LastPage';
import KeyboardArrowLeftIcon from '@mui/icons-material/KeyboardArrowLeft';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import CloseIcon from '@mui/icons-material/Close';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import PowerSettingsNewIcon from '@mui/icons-material/PowerSettingsNew';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../utils/constants';
import MintingAccountSetup from '../components/Minting/MintingAccountSetup';
import { NodeApi, Peer, NodeInfo, MintingAccount } from '../services/nodeApi';
import StatsWidget from '../components/NodeManagement/StatsWidgetMemo';

// Table Pagination Actions Component
interface TablePaginationActionsProps {
  count: number;
  page: number;
  rowsPerPage: number;
  onPageChange: (event: React.MouseEvent<HTMLButtonElement>, newPage: number) => void;
}

const TablePaginationActions: React.FC<TablePaginationActionsProps> = ({
  count,
  page,
  rowsPerPage,
  onPageChange,
}) => {
  const theme = useTheme();

  const handleFirstPageButtonClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    onPageChange(event, 0);
  };

  const handleBackButtonClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    onPageChange(event, page - 1);
  };

  const handleNextButtonClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    onPageChange(event, page + 1);
  };

  const handleLastPageButtonClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    onPageChange(event, Math.max(0, Math.ceil(count / rowsPerPage) - 1));
  };

  return (
    <Box sx={{ flexShrink: 0, ml: 2.5 }}>
      <IconButton
        onClick={handleFirstPageButtonClick}
        disabled={page === 0}
        aria-label="first page"
      >
        {theme.direction === 'rtl' ? <LastPageIcon /> : <FirstPageIcon />}
      </IconButton>
      <IconButton
        onClick={handleBackButtonClick}
        disabled={page === 0}
        aria-label="previous page"
      >
        {theme.direction === 'rtl' ? <KeyboardArrowRightIcon /> : <KeyboardArrowLeftIcon />}
      </IconButton>
      <IconButton
        onClick={handleNextButtonClick}
        disabled={page >= Math.ceil(count / rowsPerPage) - 1}
        aria-label="next page"
      >
        {theme.direction === 'rtl' ? <KeyboardArrowLeftIcon /> : <KeyboardArrowRightIcon />}
      </IconButton>
      <IconButton
        onClick={handleLastPageButtonClick}
        disabled={page >= Math.ceil(count / rowsPerPage) - 1}
        aria-label="last page"
      >
        {theme.direction === 'rtl' ? <FirstPageIcon /> : <LastPageIcon />}
      </IconButton>
    </Box>
  );
};

const NodeManagement: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();

  const [isElectronApp, setIsElectronApp] = useState(false);

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedPeer, setSelectedPeer] = useState<string>('');
  const [confirmRestartDialog, setConfirmRestartDialog] = useState(false);
  const [nodeRestarting, setNodeRestarting] = useState(false);
  const [networkHeight, setNetworkHeight] = useState<number>(0);
  const [forceSyncDialog, setForceSyncDialog] = useState<string | null>(null);
  const [nodeStopped, setNodeStopped] = useState(false);
  const [confirmStopDialog, setConfirmStopDialog] = useState(false);

  // State management
  const [peers, setPeers] = useState<Peer[]>([]);
  const [nodeInfo, setNodeInfo] = useState<NodeInfo | null>(null);
  const [mintingAccounts, setMintingAccounts] = useState<MintingAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Pagination states
  const [peersPage, setPeersPage] = useState(0);
  const [peersRowsPerPage, setPeersRowsPerPage] = useState(10);

  // Dialog states
  const [addPeerDialog, setAddPeerDialog] = useState(false);
  const [addMintingDialog, setAddMintingDialog] = useState(false);
  const [removePeerDialog, setRemovePeerDialog] = useState<string | null>(null);
  const [removeMintingDialog, setRemoveMintingDialog] = useState<string | null>(null);

  // Form states
  const [newPeerAddress, setNewPeerAddress] = useState('');
  const [newPeerPort, setNewPeerPort] = useState('10392');

  // Auto-refresh settings
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(30); // seconds

  // Fetch data functions
  const fetchPeers = useCallback(async (bypassStoppedCheck = false) => {
    // Don't fetch if we know the node is stopped (unless we're checking if it came back online)
    if (nodeStopped && !bypassStoppedCheck) {
      throw new Error('Node is stopped');
    }

    try {
      const peersData = await NodeApi.getPeers();
      // Process peer data to add calculated fields
      const processedPeers = peersData.map(peer => ({
        ...peer,
        age: peer.connectedWhen ? NodeApi.formatPeerAge(peer.connectedWhen) : 'Unknown'
      }));
      setPeers(processedPeers);
      setError(null);
    } catch (err: any) {
      console.error('Failed to fetch peers:', err);
      throw new Error('Failed to fetch peers');
    }
  }, [nodeStopped]);

  const fetchNodeInfo = useCallback(async (bypassStoppedCheck = false) => {
    // Don't fetch if we know the node is stopped (unless we're checking if it came back online)
    if (nodeStopped && !bypassStoppedCheck) {
      throw new Error('Node is stopped');
    }

    try {
      const nodeData = await NodeApi.getNodeInfo();
      setNodeInfo(nodeData);
      setError(null);
    } catch (err: any) {
      console.error('Failed to fetch node info:', err);
      throw new Error('Failed to fetch node info');
    }
  }, [nodeStopped]);

  const fetchMintingAccounts = useCallback(async (bypassStoppedCheck = false) => {
    // Don't fetch if we know the node is stopped (unless we're checking if it came back online)
    if (nodeStopped && !bypassStoppedCheck) {
      throw new Error('Node is stopped');
    }

    try {
      const mintingData = await NodeApi.getMintingAccounts();
      // Fetch name info for each minting account
      const processedMinting = await Promise.all(
        mintingData.map(async (account) => {
          try {
            const nameInfo = await NodeApi.getNameInfo(account.mintingAccount);
            return {
              ...account,
              ...nameInfo
            };
          } catch {
            return {
              ...account,
              name: 'No Registered Name',
              avatar: '/assets/noavatar.png'
            };
          }
        })
      );
      setMintingAccounts(processedMinting);
      setError(null);
    } catch (err: any) {
      console.error('Failed to fetch minting accounts:', err);
      throw new Error('Failed to fetch minting accounts');
    }
  }, [nodeStopped]);

  const fetchNetworkHeight = useCallback(async (bypassStoppedCheck = false) => {
    // Don't fetch if we know the node is stopped (unless we're checking if it came back online)
    if (nodeStopped && !bypassStoppedCheck) {
      throw new Error('Node is stopped');
    }

    try {
      const height = await NodeApi.getNetworkHeight();
      setNetworkHeight(height);
      setError(null);
    } catch (err: any) {
      // Don't show error for network height - it's supplementary info
      console.warn('Failed to fetch network height:', err);
      throw new Error('Failed to fetch network height');
    }
  }, [nodeStopped]);

  // Optimized fetchAllData function with Promise.allSettled
  const fetchAllData = useCallback(async () => {
    // Early exit if node is stopped or restarting - don't even try to fetch
    if (nodeStopped || nodeRestarting) {
      setRefreshing(false);
      return;
    }

    setRefreshing(true);
    try {
      // Use Promise.allSettled instead of Promise.all to handle partial failures
      const results = await Promise.allSettled([
        fetchPeers(),
        fetchNodeInfo(),
        fetchMintingAccounts(),
        fetchNetworkHeight()
      ]);

      // Check results and only update successful ones
      const failures = results.filter(result => result.status === 'rejected');
      if (failures.length === results.length) {
        // All requests failed
        throw new Error('All API requests failed');
      }

      // If we get here successfully, clear any error states
      setError(null);

    } catch (error: any) {
      // If we get connection errors, this might mean the node went offline
      if (error.message.includes('ECONNREFUSED') || error.message.includes('Failed to fetch') || error.message.includes('Node is stopped')) {
        if (!nodeStopped && !nodeRestarting) {
          // Node wasn't marked as stopped/restarting, so this is an unexpected disconnection
          setError('❌ Lost connection to node. Please check if your Forknet core is running.');
        } else {
          // Expected error - node is stopped or restarting
        }
      } else {
        // Other types of errors
        setError(error.message);
      }
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }, [fetchPeers, fetchNodeInfo, fetchMintingAccounts, fetchNetworkHeight, nodeStopped, nodeRestarting]);

  // Initial data load
  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Auto-refresh setup
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;

    // Always check for stopped/restarting nodes coming back online, regardless of auto-refresh setting
    if (nodeStopped || nodeRestarting) {
      timer = setInterval(async () => {
        setRefreshing(true);
        try {
          // Use bypass parameter to check if node is back online
          await Promise.all([
            fetchPeers(true),
            fetchNodeInfo(true),
            fetchMintingAccounts(true),
            fetchNetworkHeight(true)
          ]);

          // If we successfully fetched data, node is back online
          setNodeStopped(false);
          setNodeRestarting(false);
          setSuccess('✅ Node automatically detected back online! Resuming normal operation.');

          // Don't force auto-refresh back on - respect user's setting

        } catch (error: any) {
          // Silently fail - we'll keep checking
        } finally {
          setRefreshing(false);
        }
      }, 10000); // Check every 10 seconds
    }
    // Only set up normal auto-refresh if enabled AND node is running normally
    else if (autoRefresh && refreshInterval > 0) {
      // Normal refresh when node is running
      timer = setInterval(fetchAllData, refreshInterval * 1000);
    }

    return () => {
      if (timer) {
        clearInterval(timer);
      }
    };
  }, [autoRefresh, refreshInterval, fetchAllData, fetchPeers, fetchNodeInfo, fetchMintingAccounts, fetchNetworkHeight, nodeStopped, nodeRestarting]);

  // Auto-refresh peer ages every 30 seconds
  useEffect(() => {
    if (!autoRefresh || peers.length === 0) return;

    const timer = setInterval(() => {
      // Force re-render by updating a dummy state
      setPeers(currentPeers => [...currentPeers]);
    }, 30000); // Update every 30 seconds

    return () => clearInterval(timer);
  }, [autoRefresh, peers.length]);

  // Check if we're in Electron app
  useEffect(() => {
    const isElectron = !!(window as any).electronAPI && !!(window as any).forknetRequest;
    setIsElectronApp(isElectron);
  }, []);

  const handleAddPeer = async () => {
    if (!newPeerAddress.trim()) {
      setError('Please enter a peer address');
      return;
    }

    try {
      const port = parseInt(newPeerPort);
      const address = newPeerAddress.trim();

      await NodeApi.addPeer(address, port);

      // Show the actual address format that was sent to the API
      const displayAddress = port !== 10392 ? `${address}:${port}` : address;
      setSuccess(`✅ Peer ${displayAddress} added successfully! It may take a moment to appear in the peer list.`);

      setNewPeerAddress('');
      setNewPeerPort('10392');
      setAddPeerDialog(false);

      // Refresh peer list after a short delay to allow the new peer to connect
      setTimeout(() => {
        fetchPeers();
      }, 2000);

    } catch (err: any) {
      console.error('Add peer error:', err);
      setError(err.message);
    }
  };

  const handleRemovePeer = async (address: string) => {
    try {
      await NodeApi.removePeer(address);
      setSuccess('Peer removed successfully');
      setRemovePeerDialog(null);
      await fetchPeers();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleRemoveMintingAccount = async (publicKey: string) => {
    try {
      await NodeApi.removeMintingAccount(publicKey);
      setSuccess('Minting account removed successfully');
      setRemoveMintingDialog(null);
      await fetchMintingAccounts();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleForceSync = async (address?: string) => {
    try {
      setRefreshing(true);
      if (address) {
        setSuccess(`🔄 Force sync initiated with ${address}. This operation can take 5-10 minutes depending on how far behind your node is. Please be patient...`);

        const result = await NodeApi.forceSyncWithPeer(address);
        if (result) {
          setSuccess(`✅ Force sync with ${address} completed successfully! Your node should now be up to date.`);
        }
      } else {
        setSuccess('🔄 Force sync initiated with all peers. This operation can take 5-10 minutes. Please be patient...');

        const result = await NodeApi.forceSync();
        if (result) {
          setSuccess('✅ Force sync completed successfully with all connected peers! Your node should now be up to date.');
        }
      }

      // Refresh data after a delay to show updated sync status
      setTimeout(() => {
        fetchAllData();
      }, 3000);

    } catch (error: any) {
      console.error('Force sync error:', error);

      // Better error handling
      if (error.message.includes('API key')) {
        setError('⚠️ API key required. This feature only works in the Electron app with a valid Forknet core installation.');
      } else if (error.message.includes('timeout')) {
        setSuccess('⏰ Force sync request timed out after 5 minutes, but sync is likely still in progress. Check your sync status in a few minutes to see if you caught up to the network.');
      } else {
        setError(`❌ Force sync failed: ${error.message}`);
      }
    } finally {
      setRefreshing(false);
    }
  };

  const handleNodeAction = async (action: 'restart' | 'stop') => {
    try {
      setRefreshing(true);

      // Disable auto-refresh during node operations
      const wasAutoRefreshEnabled = autoRefresh;
      if (wasAutoRefreshEnabled) {
        setAutoRefresh(false);
      }

      let message = '';

      switch (action) {
        case 'restart':
          // Set restarting state and clear all data immediately
          setNodeRestarting(true);
          setNodeStopped(false);

          // Clear all stale data immediately since node is going offline
          setNodeInfo(null);
          setPeers([]);
          setMintingAccounts([]);
          setNetworkHeight(0);

          await NodeApi.restartNode();
          message = '🔄 Node restart initiated. All data cleared - waiting for node to come back online...';
          setSuccess(message);

          // Wait for node to restart and come back online
          setTimeout(async () => {
            let attempts = 0;
            const maxAttempts = 24; // Try for 4 minutes (24 * 10 seconds)

            const checkNodeStatus = async () => {
              try {
                // Try to fetch node info to see if node is back online
                await NodeApi.getNodeInfo();

                // If successful, node is back online
                setSuccess('✅ Node restarted successfully and is back online!');
                setNodeRestarting(false); // Clear restarting state

                // Re-enable auto-refresh if it was enabled before
                if (wasAutoRefreshEnabled) {
                  setAutoRefresh(true);
                }

                // Fetch fresh data
                await fetchAllData();
                setRefreshing(false);

              } catch (error) {
                attempts++;
                if (attempts < maxAttempts) {
                  // Calculate time remaining
                  const remainingMinutes = Math.ceil((maxAttempts - attempts) * 10 / 60);

                  // Node still starting up, try again in 10 seconds
                  setSuccess(`🔄 Waiting for node to restart... (${attempts}/${maxAttempts}) - ${remainingMinutes}min remaining`);
                  setTimeout(checkNodeStatus, 10000);
                } else {
                  // Max attempts reached - but offer manual check
                  setSuccess(
                    '⏰ Node restart is taking longer than expected. ' +
                    'Click "Check Status" to verify if it\'s back online, or wait a bit longer.'
                  );
                  setNodeRestarting(false); // Clear restarting state
                  setRefreshing(false);

                  // Re-enable auto-refresh anyway
                  if (wasAutoRefreshEnabled) {
                    setAutoRefresh(true);
                  }
                }
              }
            };

            // Start checking after 10 seconds (give node time to shut down)
            setTimeout(checkNodeStatus, 10000);
          }, 1000);

          return; // Don't execute the normal flow

        case 'stop':
          try {
            await NodeApi.stopNode();
            message = '🛑 Node stopped successfully. The node is now offline.';

            // Set stopped state and clear all data immediately
            setNodeStopped(true);
            setNodeRestarting(false);
            setRefreshing(false);

            // Clear node data since it's no longer valid
            setNodeInfo(null);
            setPeers([]);
            setMintingAccounts([]);
            setNetworkHeight(0);

            // Keep auto-refresh enabled so it can detect when node comes back
            // The useEffect will handle switching to "check if online" mode

            setSuccess(message);
            return; // Exit early - don't try to fetch data from stopped node

          } catch (err: any) {
            // Even if there's an error, the node might have stopped
            if (err.message.includes('ECONNREFUSED') || err.message.includes('connect ECONNREFUSED')) {
              // Treat connection refused as successful stop
              setNodeStopped(true);
              setNodeRestarting(false);
              setRefreshing(false);

              // Clear all data for stopped node
              setNodeInfo(null);
              setPeers([]);
              setMintingAccounts([]);
              setNetworkHeight(0);

              // Keep auto-refresh enabled for detection
              setSuccess('🛑 Node stopped successfully. The node is now offline.');
              return;
            }

            // For other errors, show the actual error
            setError(err.message);
            setRefreshing(false);
            return;
          }

        default:
          throw new Error(`Unknown action: ${action}`);
      }

    } catch (err: any) {
      console.error(`Node ${action} error:`, err);
      setError(`Failed to ${action} node: ${err.message}`);
      setRefreshing(false);

      // Clear any pending states on error
      setNodeRestarting(false);
    }
  };

  // Helper functions
  const getPeerStatusColor = (peer: Peer) => {
    switch (peer.handshakeStatus) {
      case 'COMPLETED':
        return 'success';   // Green - fully connected
      case 'HELLO':
        return 'warning';   // Orange - in progress  
      case 'STARTED':
        return 'info';      // Blue - just starting
      default:
        return 'error';     // Red - failed/unknown
    }
  };

  const getStatusDescription = (status: string): string => {
    switch (status) {
      case 'COMPLETED':
        return 'Fully connected and synchronized';
      case 'HELLO':
        return 'Handshake in progress';
      case 'STARTED':
        return 'Connection initiated';
      default:
        return 'Unknown or failed connection';
    }
  };

  // Enhanced peer age formatting with more precision
  const formatDetailedPeerAge = (connectedWhen: number): string => {
    if (!connectedWhen || isNaN(connectedWhen)) return 'Unknown';

    const ageMs = Date.now() - connectedWhen;
    const ageSeconds = Math.floor(ageMs / 1000);

    if (ageSeconds < 0) return 'Just now';

    // Less than 1 minute - show seconds
    if (ageSeconds < 60) {
      return `${ageSeconds}s`;
    }

    // Less than 1 hour - show minutes and seconds
    if (ageSeconds < 3600) {
      const minutes = Math.floor(ageSeconds / 60);
      const remainingSeconds = ageSeconds % 60;
      return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
    }

    // Less than 1 day - show hours and minutes
    if (ageSeconds < 86400) {
      const hours = Math.floor(ageSeconds / 3600);
      const remainingMinutes = Math.floor((ageSeconds % 3600) / 60);
      return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
    }

    // 1 day or more - show days and hours
    const days = Math.floor(ageSeconds / 86400);
    const remainingHours = Math.floor((ageSeconds % 86400) / 3600);
    return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
  };

  // Format exact connection timestamp for tooltip
  const formatExactTimestamp = (connectedWhen: number): string => {
    if (!connectedWhen || isNaN(connectedWhen)) return 'Unknown';
    return new Date(connectedWhen).toLocaleString();
  };

  // Calculate connected peers count (only COMPLETED handshake status)
  const connectedPeersCount = useMemo(() =>
    peers.filter(peer => peer.handshakeStatus === 'COMPLETED').length,
    [peers]
  );

  // Separate function for manual status checking when node is stopped
  const checkNodeStatus = useCallback(async () => {
    setRefreshing(true);
    try {
      // Use bypass parameter to check if node is back online
      await Promise.all([
        fetchPeers(true),
        fetchNodeInfo(true),
        fetchMintingAccounts(true),
        fetchNetworkHeight(true)
      ]);

      // If we successfully fetched data, node is back online
      setNodeStopped(false);
      setNodeRestarting(false); // Also clear restarting state
      setSuccess('✅ Node detected back online! Data refreshed successfully.');

      // Re-enable auto-refresh since node is back
      setAutoRefresh(true);

    } catch (error: any) {
      // If we get connection errors, node is still offline
      if (error.message.includes('ECONNREFUSED') || error.message.includes('Failed to fetch') || error.message.includes('connect ECONNREFUSED')) {
        setError('❌ Node is still offline. Please start your Forknet core and try again.');
      } else {
        setError(`❌ Connection error: ${error.message}`);
      }
    } finally {
      setRefreshing(false);
    }
  }, [fetchPeers, fetchNodeInfo, fetchMintingAccounts, fetchNetworkHeight]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
        <CircularProgress size={48} />
      </Box>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Header with Actions */}
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
          {/* Back Button - Responsive */}
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate(ROUTES.DASHBOARD)}
            sx={{
              mr: 2,
              color: 'white',
              minWidth: { xs: 'auto', md: 'auto' },
              px: { xs: 1, md: 2 },
              '& .MuiButton-startIcon': {
                margin: { xs: 0, md: '0 8px 0 -4px' }
              }
            }}
          >
            {/* Desktop: Full text */}
            <Box display={{ xs: 'none', md: 'block' }}>
              Back to Dashboard
            </Box>
            {/* Tablet: Short text */}
            <Box display={{ xs: 'none', sm: 'block', md: 'none' }}>
              Dashboard
            </Box>
            {/* Mobile: Icon only (text hidden, but startIcon still shows) */}
          </Button>

          <StorageIcon sx={{ mr: 1 }} />
          <Typography
            variant="h5"
            component="div"
            sx={{
              flexGrow: 1,
              fontWeight: 'bold',
              fontSize: { xs: '1.25rem', sm: '1.5rem' }
            }}
          >
            {/* Responsive title */}
            <Box display={{ xs: 'none', sm: 'block' }}>
              Node Management
            </Box>
            <Box display={{ xs: 'block', sm: 'none' }}>
              Node
            </Box>
          </Typography>

          <Box display="flex" gap={1}>
            <Tooltip title="Restart Node">
              <IconButton
                onClick={() => setConfirmRestartDialog(true)}
                disabled={refreshing}
                sx={{
                  color: 'white',
                  '&:hover': {
                    backgroundColor: 'rgba(255, 152, 0, 0.1)'
                  }
                }}
              >
                <PowerSettingsNewIcon />
              </IconButton>
            </Tooltip>

            <Tooltip title="Stop Node">
              <IconButton
                onClick={() => setConfirmStopDialog(true)}
                disabled={refreshing}
                sx={{
                  color: 'white',
                  '&:hover': {
                    backgroundColor: 'rgba(244, 67, 54, 0.1)'
                  }
                }}
              >
                <StopIcon />
              </IconButton>
            </Tooltip>

            <Tooltip title={nodeStopped ? "Check if Node is Online" : "Refresh Data"}>
              <IconButton
                onClick={() => {
                  if (nodeStopped) {
                    checkNodeStatus();
                  } else {
                    fetchAllData();
                  }
                }}
                disabled={refreshing}
                sx={{
                  color: 'white',
                  '&:hover': {
                    backgroundColor: 'rgba(76, 175, 80, 0.1)'
                  }
                }}
              >
                <RefreshIcon sx={{
                  animation: refreshing ? 'spin 1s linear infinite' : 'none',
                  '@keyframes spin': {
                    '0%': { transform: 'rotate(0deg)' },
                    '100%': { transform: 'rotate(360deg)' }
                  }
                }} />
              </IconButton>
            </Tooltip>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Node Statistics */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <StatsWidget
            title="Block Height"
            value={
              nodeStopped ? "NODE STOPPED" :
                nodeRestarting ? "RESTARTING..." :
                  nodeInfo ? (
                    <Box display="flex" flexDirection="column" alignItems="center">
                      <Typography variant="h4" component="div" sx={{ fontWeight: 700, lineHeight: 1 }}>
                        {nodeInfo.height?.toLocaleString()}
                      </Typography>
                      {networkHeight > 0 && networkHeight !== nodeInfo.height && (
                        <Typography
                          variant="caption"
                          sx={{
                            opacity: 0.7,
                            fontSize: '0.7rem',
                            mt: 0.5
                          }}
                        >
                          Network: {networkHeight.toLocaleString()}
                          {networkHeight > nodeInfo.height && (
                            <span style={{ color: '#ff9800', marginLeft: 4 }}>
                              (-{(networkHeight - nodeInfo.height).toLocaleString()})
                            </span>
                          )}
                        </Typography>
                      )}
                    </Box>
                  ) : 'Unknown'
            }
            icon={<MemoryIcon sx={{ fontSize: 28 }} />}
            loading={nodeRestarting && !nodeStopped}
            type={nodeStopped ? "error" : nodeRestarting ? "warning" : "info"}
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <StatsWidget
            title="Connected Peers"
            value={
              nodeStopped ? "NODE STOPPED" :
                nodeRestarting ? "OFFLINE" :
                  connectedPeersCount
            }
            icon={<RouterIcon sx={{ fontSize: 28 }} />}
            loading={nodeRestarting && !nodeStopped}
            type={nodeStopped ? "error" : nodeRestarting ? "error" : (connectedPeersCount > 0 ? "success" : "warning")}
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <StatsWidget
            title="Node Uptime"
            value={
              nodeStopped ? "NODE STOPPED" :
                nodeRestarting ? "RESTARTING..." :
                  (nodeInfo ? NodeApi.formatUptime(nodeInfo.uptime) : 'Unknown')
            }
            icon={<ScheduleIcon sx={{ fontSize: 28 }} />}
            loading={nodeRestarting && !nodeStopped}
            type={nodeStopped ? "error" : nodeRestarting ? "warning" : "default"}
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <StatsWidget
            title="Core Version"
            value={
              nodeStopped ? "NODE STOPPED" :
                nodeRestarting ? "OFFLINE" :
                  (nodeInfo?.buildVersion?.replace('qortal-', 'v') || 'Unknown')
            }
            icon={<CodeIcon sx={{ fontSize: 28 }} />}
            loading={nodeRestarting && !nodeStopped}
            type={nodeStopped ? "error" : nodeRestarting ? "error" : "info"}
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <StatsWidget
            title="Minting Status"
            value={
              nodeStopped ? (
                <Box display="flex" alignItems="center" justifyContent="center" gap={1}>
                  <Box
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      bgcolor: 'error.main',
                      boxShadow: '0 0 8px rgba(244, 67, 54, 0.5)',
                    }}
                  />
                  <Typography variant="h6" component="span" sx={{ fontWeight: 700 }}>
                    STOPPED
                  </Typography>
                </Box>
              ) : nodeRestarting ? (
                <Box display="flex" alignItems="center" justifyContent="center" gap={1}>
                  <Box
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      bgcolor: 'warning.main',
                      boxShadow: '0 0 8px rgba(255, 152, 0, 0.5)',
                    }}
                  />
                  <Typography variant="h6" component="span" sx={{ fontWeight: 700 }}>
                    RESTARTING
                  </Typography>
                </Box>
              ) : nodeInfo ? (
                <Box display="flex" alignItems="center" justifyContent="center" gap={1}>
                  <Box
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      bgcolor: nodeInfo.isMintingPossible ? 'success.main' : 'error.main',
                      boxShadow: `0 0 8px ${nodeInfo.isMintingPossible ? 'rgba(76, 175, 80, 0.5)' : 'rgba(244, 67, 54, 0.5)'}`,
                    }}
                  />
                  <Typography variant="h6" component="span" sx={{ fontWeight: 700 }}>
                    {nodeInfo.isMintingPossible ? 'MINTING' : 'NOT MINTING'}
                  </Typography>
                </Box>
              ) : 'Unknown'
            }
            icon={<AccountCircleIcon sx={{ fontSize: 28 }} />}
            loading={nodeRestarting && !nodeStopped}
            type={nodeStopped ? "error" : nodeRestarting ? "warning" : (nodeInfo?.isMintingPossible ? "success" : "error")}
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <StatsWidget
            title="Sync Status"
            value={
              nodeStopped ? (
                <Box display="flex" alignItems="center" justifyContent="center" gap={1}>
                  <Box
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      bgcolor: 'error.main',
                      boxShadow: '0 0 8px rgba(244, 67, 54, 0.5)',
                    }}
                  />
                  <Typography variant="h6" component="span" sx={{ fontWeight: 700 }}>
                    STOPPED
                  </Typography>
                </Box>
              ) : nodeRestarting ? (
                <Box display="flex" alignItems="center" justifyContent="center" gap={1}>
                  <Box
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      bgcolor: 'warning.main',
                      boxShadow: '0 0 8px rgba(255, 152, 0, 0.5)',
                    }}
                  />
                  <Typography variant="h6" component="span" sx={{ fontWeight: 700 }}>
                    OFFLINE
                  </Typography>
                </Box>
              ) : nodeInfo ? (
                <Box display="flex" flexDirection="column" alignItems="center">
                  <Box display="flex" alignItems="center" gap={1}>
                    <Box
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        bgcolor: nodeInfo.isSynchronizing ? 'warning.main' : 'success.main',
                        boxShadow: `0 0 8px ${nodeInfo.isSynchronizing ? 'rgba(255, 152, 0, 0.5)' : 'rgba(76, 175, 80, 0.5)'}`,
                      }}
                    />
                    <Typography variant="h6" component="span" sx={{ fontWeight: 700 }}>
                      {nodeInfo.isSynchronizing ? 'SYNCING' : 'SYNCED'}
                    </Typography>
                  </Box>
                  <Typography variant="caption" sx={{ opacity: 0.7, fontSize: '0.7rem', mt: 0.5 }}>
                    {nodeInfo.syncPercent}% • Time-based sync
                  </Typography>
                </Box>
              ) : 'Unknown'
            }
            icon={<SyncIcon sx={{ fontSize: 28 }} />}
            loading={nodeRestarting && !nodeStopped}
            type={nodeStopped ? "error" : nodeRestarting ? "error" : (nodeInfo?.isSynchronizing ? "warning" : "success")}
          />
        </Grid>
      </Grid>

      {/* Auto-refresh Controls */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={2}>
            <Box display="flex" alignItems="center" gap={2}>
              <TimerIcon color="primary" />
              <Typography variant="h6">Auto-refresh Settings</Typography>
              {(nodeStopped || nodeRestarting) && (
                <Chip
                  label={
                    nodeStopped
                      ? "🔍 Auto-detecting node startup"
                      : "⏳ Waiting for restart to complete"
                  }
                  size="small"
                  color="warning"
                  sx={{ ml: 1 }}
                />
              )}
            </Box>

            <Box display="flex" alignItems="center" gap={2}>
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>Interval</InputLabel>
                <Select
                  value={refreshInterval}
                  label="Interval"
                  onChange={(e) => setRefreshInterval(Number(e.target.value))}
                  disabled={!autoRefresh || nodeStopped || nodeRestarting}
                >
                  <MenuItem value={10}>10 seconds</MenuItem>
                  <MenuItem value={30}>30 seconds</MenuItem>
                  <MenuItem value={60}>1 minute</MenuItem>
                  <MenuItem value={300}>5 minutes</MenuItem>
                </Select>
              </FormControl>

              <Button
                variant={autoRefresh ? "contained" : "outlined"}
                onClick={() => setAutoRefresh(!autoRefresh)}
                startIcon={<SettingsIcon />}
                sx={{ whiteSpace: 'nowrap' }}
                disabled={nodeStopped || nodeRestarting}
              >
                {autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
              </Button>
            </Box>
          </Box>

          {/* Enhanced status explanation */}
          {(nodeStopped || nodeRestarting) && (
            <Alert severity="info" sx={{ mt: 2 }}>
              <Typography variant="body2">
                {nodeStopped
                  ? "🔍 Automatically checking every 10 seconds to detect when your node comes back online. This works regardless of your auto-refresh setting."
                  : "⏳ Monitoring node restart progress every 10 seconds. Auto-refresh will resume once the node is back online."
                }
              </Typography>
            </Alert>
          )}

          {autoRefresh && !nodeStopped && !nodeRestarting && (
            <Alert severity="success" sx={{ mt: 2 }}>
              <Typography variant="body2">
                ✅ Auto-refresh is active. Data updates every {refreshInterval} seconds.
              </Typography>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Web Version Warning */}
      {!isElectronApp && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Alert severity="warning" sx={{ mb: 2 }}>
              <Typography variant="body2">
                ⚠️ <strong>Limited Functionality:</strong> You're using the web version.
                For full admin features (force sync, minting account management, node control),
                please use the Electron desktop app.
              </Typography>
            </Alert>
            <Typography variant="body2" color="text.secondary">
              The web version can view peer information but cannot perform admin operations
              that require API key authentication.
            </Typography>
          </CardContent>
        </Card>
      )}

      {/* Minting Accounts Section */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" alignItems="center" justifyContent="space-between" mb={2} flexWrap="wrap" gap={2}>
            <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <AccountCircleIcon />
              Minting Accounts ({mintingAccounts.length})
            </Typography>
            <Button
              startIcon={<AddIcon />}
              variant="contained"
              onClick={() => setAddMintingDialog(true)}
              sx={{ borderRadius: 2 }}
            >
              Add Minting Account
            </Button>
          </Box>

          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1) }}>
                  <TableCell>Avatar</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Minting Account</TableCell>
                  <TableCell>Minting Key</TableCell>
                  <TableCell>Recipient</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {mintingAccounts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      <Typography color="text.secondary" sx={{ py: 4 }}>
                        {nodeStopped
                          ? "Node is stopped - minting accounts unavailable"
                          : nodeRestarting
                            ? "Node is restarting - minting data cleared"
                            : "No minting accounts found"
                        }
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  mintingAccounts.map((account, index) => (
                    <TableRow key={`${account.publicKey}-${index}`} hover>
                      <TableCell>
                        <Avatar
                          src={account.avatar}
                          sx={{ width: 32, height: 32 }}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium">
                          {account.name || 'No Registered Name'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontFamily="monospace">
                          {account.mintingAccount}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontFamily="monospace">
                          {account.publicKey}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontFamily="monospace">
                          {account.recipientAccount}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Button
                          size="small"
                          onClick={() => setRemoveMintingDialog(account.publicKey)}
                          color="error"
                          startIcon={<DeleteIcon />}
                          variant="outlined"
                        >
                          Remove
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Peers Section */}
      <Card>
        <CardContent>
          <Box display="flex" alignItems="center" justifyContent="space-between" mb={2} flexWrap="wrap" gap={2}>
            <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <PeopleAltIcon />
              Connected Peers ({connectedPeersCount} of {peers.length})
            </Typography>
            <Button
              startIcon={<AddIcon />}
              variant="contained"
              onClick={() => setAddPeerDialog(true)}
              sx={{ borderRadius: 2 }}
            >
              Add Peer
            </Button>
          </Box>

          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1) }}>
                  <TableCell>Address</TableCell>
                  <TableCell>Handshake Status</TableCell>
                  <TableCell>Last Height</TableCell>
                  <TableCell>Core Version</TableCell>
                  <TableCell>Direction</TableCell>
                  <TableCell>Connected Since</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {peers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      <Typography color="text.secondary" sx={{ py: 4 }}>
                        {nodeStopped
                          ? "Node is stopped - no peer connections"
                          : nodeRestarting
                            ? "Node is restarting - peer data cleared"
                            : "No peers connected"
                        }
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  (peersRowsPerPage > 0
                    ? peers.slice(peersPage * peersRowsPerPage, peersPage * peersRowsPerPage + peersRowsPerPage)
                    : peers
                  ).map((peer, index) => (
                    <TableRow key={`${peer.address}-${index}`} hover>
                      <TableCell>
                        <Typography variant="body2" fontFamily="monospace">
                          {peer.address}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Tooltip title={getStatusDescription(peer.handshakeStatus)} arrow>
                          <Chip
                            label={peer.handshakeStatus || 'UNKNOWN'}
                            size="small"
                            color={getPeerStatusColor(peer)}
                          />
                        </Tooltip>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {peer.lastHeight?.toLocaleString() || 'Unknown'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {peer.version?.replace('qortal-', 'v') || 'Unknown'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={peer.direction || 'UNKNOWN'}
                          size="small"
                          color={peer.direction === 'OUTBOUND' ? 'primary' : 'secondary'}
                        />
                      </TableCell>
                      <TableCell>
                        <Tooltip
                          title={`Connected: ${formatExactTimestamp(peer.connectedWhen || peer.connectionTimestamp)}`}
                          arrow
                        >
                          <Typography
                            variant="body2"
                            sx={{
                              fontFamily: 'monospace',
                              fontSize: '0.875rem'
                            }}
                          >
                            {formatDetailedPeerAge(peer.connectedWhen || peer.connectionTimestamp)}
                          </Typography>
                        </Tooltip>
                      </TableCell>
                      <TableCell align="center">
                        <IconButton
                          onClick={(event) => {
                            setAnchorEl(event.currentTarget);
                            setSelectedPeer(peer.address);
                          }}
                          size="small"
                        >
                          <MoreVertIcon />
                        </IconButton>

                        <Menu
                          anchorEl={anchorEl}
                          open={Boolean(anchorEl) && selectedPeer === peer.address}
                          onClose={() => {
                            setAnchorEl(null);
                            setSelectedPeer('');
                          }}
                          anchorOrigin={{
                            vertical: 'bottom',
                            horizontal: 'right',
                          }}
                          transformOrigin={{
                            vertical: 'top',
                            horizontal: 'right',
                          }}
                        >
                          <MenuItem
                            onClick={() => {
                              setForceSyncDialog(peer.address);
                              setAnchorEl(null);
                              setSelectedPeer('');
                            }}
                            disabled={refreshing || !isElectronApp}
                          >
                            <ListItemIcon>
                              <SyncIcon fontSize="small" />
                            </ListItemIcon>
                            <ListItemText>
                              Force Sync
                            </ListItemText>
                          </MenuItem>

                          <MenuItem
                            onClick={() => {
                              setRemovePeerDialog(peer.address);
                              setAnchorEl(null);
                              setSelectedPeer('');
                            }}
                          >
                            <ListItemIcon>
                              <DeleteIcon fontSize="small" />
                            </ListItemIcon>
                            <ListItemText>Remove Peer</ListItemText>
                          </MenuItem>
                        </Menu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
              {peers.length > 0 && (
                <TableFooter>
                  <TableRow>
                    <TablePagination
                      rowsPerPageOptions={[5, 10, 25, { label: 'All', value: -1 }]}
                      colSpan={7}
                      count={peers.length}
                      rowsPerPage={peersRowsPerPage}
                      page={peersPage}
                      onPageChange={(_, newPage) => setPeersPage(newPage)}
                      onRowsPerPageChange={(e) => {
                        setPeersRowsPerPage(parseInt(e.target.value, 10));
                        setPeersPage(0);
                      }}
                      ActionsComponent={TablePaginationActions}
                    />
                  </TableRow>
                </TableFooter>
              )}
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Add Peer Dialog */}
      <Dialog open={addPeerDialog} onClose={() => setAddPeerDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add New Peer</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Peer Address"
            fullWidth
            variant="outlined"
            value={newPeerAddress}
            onChange={(e) => setNewPeerAddress(e.target.value)}
            placeholder="e.g., 192.168.1.100 or peer.example.com"
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Port"
            fullWidth
            variant="outlined"
            value={newPeerPort}
            onChange={(e) => setNewPeerPort(e.target.value)}
            type="number"
            placeholder="10392"
            helperText="Default Forknet peer port is 10392"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddPeerDialog(false)}>Cancel</Button>
          <Button
            onClick={handleAddPeer}
            variant="contained"
            disabled={!newPeerAddress.trim()}
          >
            Add Peer
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Minting Account Dialog */}
      <MintingAccountSetup
        open={addMintingDialog}
        onClose={() => setAddMintingDialog(false)}
        onSuccess={fetchMintingAccounts}
      />

      {/* Remove Peer Dialog */}
      <Dialog open={!!removePeerDialog} onClose={() => setRemovePeerDialog(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Remove Peer</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to remove peer <strong>{removePeerDialog}</strong>?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRemovePeerDialog(null)}>Cancel</Button>
          <Button
            onClick={() => removePeerDialog && handleRemovePeer(removePeerDialog)}
            color="error"
            variant="contained"
          >
            Remove Peer
          </Button>
        </DialogActions>
      </Dialog>

      {/* Remove Minting Account Dialog */}
      <Dialog open={!!removeMintingDialog} onClose={() => setRemoveMintingDialog(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Remove Minting Account</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to remove this minting account?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRemoveMintingDialog(null)}>Cancel</Button>
          <Button
            onClick={() => removeMintingDialog && handleRemoveMintingAccount(removeMintingDialog)}
            color="error"
            variant="contained"
          >
            Remove Account
          </Button>
        </DialogActions>
      </Dialog>

      {/* Success/Error Snackbars */}
      <Snackbar
        open={!!success}
        autoHideDuration={
          success?.includes('Click "Refresh Data"') || success?.includes('Please restart manually') ? null : 6000
        }
        onClose={() => setSuccess(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSuccess(null)}
          severity="success"
          variant="filled"
          action={
            <Box display="flex" gap={1}>
              {/* Show manual refresh button for various scenarios */}
              {(success?.includes('Click "Refresh Data"') || success?.includes('Please restart manually')) && (
                <Button
                  size="small"
                  color="inherit"
                  variant="outlined"
                  onClick={() => {
                    setSuccess(null);
                    setNodeRestarting(false);
                    fetchAllData();
                  }}
                  startIcon={<RefreshIcon />}
                  sx={{ mr: 1 }}
                >
                  Check Status
                </Button>
              )}
              <IconButton size="small" color="inherit" onClick={() => setSuccess(null)}>
                <CloseIcon fontSize="small" />
              </IconButton>
            </Box>
          }
        >
          {success}
        </Alert>
      </Snackbar>

      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={() => setError(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setError(null)}
          severity="error"
          variant="filled"
          action={
            <IconButton size="small" color="inherit" onClick={() => setError(null)}>
              <CloseIcon fontSize="small" />
            </IconButton>
          }
        >
          {error}
        </Alert>
      </Snackbar>

      {/* Restart Confirmation Dialog */}
      <Dialog open={confirmRestartDialog} onClose={() => setConfirmRestartDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Confirm Node Restart</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            <Typography variant="body2">
              <strong>Warning:</strong> This will restart your Forknet node. The node will be temporarily unavailable
              and may take 1-2 minutes to come back online.
            </Typography>
          </Alert>
          <Typography>
            Are you sure you want to restart the Forknet node?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmRestartDialog(false)}>Cancel</Button>
          <Button
            onClick={() => {
              setConfirmRestartDialog(false);
              handleNodeAction('restart');
            }}
            color="warning"
            variant="contained"
            startIcon={<PowerSettingsNewIcon />}
          >
            Restart Node
          </Button>
        </DialogActions>
      </Dialog>

      {/* Force Sync Confirmation Dialog */}
      <Dialog open={!!forceSyncDialog} onClose={() => setForceSyncDialog(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Confirm Force Sync</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="body2">
              <strong>Force Sync Information:</strong> This operation will synchronize your node with peer{' '}
              <code style={{ backgroundColor: '#f0f0f0', padding: '2px 4px', borderRadius: '3px' }}>
                {forceSyncDialog}
              </code>
            </Typography>
          </Alert>

          <Alert severity="warning" sx={{ mb: 2 }}>
            <Typography variant="body2">
              <strong>Time Required:</strong> Force sync can take 5-10 minutes depending on how far behind your node is.
              The operation will continue even if the request times out.
            </Typography>
          </Alert>

          <Typography variant="body2">
            During the sync process:
          </Typography>
          <ul style={{ marginTop: '8px', paddingLeft: '20px' }}>
            <li>Your node will download missing blocks</li>
            <li>Sync status will show progress</li>
            <li>The operation continues even if the UI times out</li>
            <li>You can monitor progress via the sync status widget</li>
          </ul>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setForceSyncDialog(null)}>Cancel</Button>
          <Button
            onClick={() => {
              const address = forceSyncDialog;
              setForceSyncDialog(null);
              if (address) handleForceSync(address);
            }}
            color="primary"
            variant="contained"
            startIcon={<SyncIcon />}
          >
            Start Force Sync
          </Button>
        </DialogActions>
      </Dialog>

      {/* Stop Node Confirmation Dialog */}
      <Dialog open={confirmStopDialog} onClose={() => setConfirmStopDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Confirm Node Stop</DialogTitle>
        <DialogContent>
          <Alert severity="error" sx={{ mb: 2 }}>
            <Typography variant="body2">
              <strong>Warning:</strong> This will completely shut down your Forknet node.
              You will need to manually restart it to resume blockchain operations.
            </Typography>
          </Alert>

          <Alert severity="warning" sx={{ mb: 2 }}>
            <Typography variant="body2">
              <strong>Impact:</strong> While stopped, your node will:
            </Typography>
            <ul style={{ marginTop: '8px', paddingLeft: '20px' }}>
              <li>Stop minting blocks (no block rewards)</li>
              <li>Disconnect from all peers</li>
              <li>Stop processing transactions</li>
              <li>Fall behind the blockchain until restarted</li>
            </ul>
          </Alert>

          <Typography variant="body2">
            Are you sure you want to stop the Forknet node?
          </Typography>

          <Typography variant="body2" sx={{ mt: 2, fontStyle: 'italic', color: 'text.secondary' }}>
            💡 <strong>Tip:</strong> If you want to restart the node, use the "Restart" button instead
            which will automatically bring it back online.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmStopDialog(false)}>Cancel</Button>
          <Button
            onClick={() => {
              setConfirmStopDialog(false);
              handleNodeAction('stop');
            }}
            color="error"
            variant="contained"
            startIcon={<StopIcon />}
          >
            Stop Node
          </Button>
        </DialogActions>
      </Dialog>

    </Container>
  );
};

export default NodeManagement;