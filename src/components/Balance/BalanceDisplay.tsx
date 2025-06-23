import React, { useEffect } from 'react';
import {
    Box,
    Typography,
    Card,
    CardContent,
    CircularProgress,
    Alert,
    IconButton,
    Tooltip,
    Avatar,
    Paper,
    Grid
} from '@mui/material';
import {
    AccountBalance as BalanceIcon,
    Refresh as RefreshIcon,
    TrendingUp as LevelIcon,
    Token as BlocksIcon
} from '@mui/icons-material';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../store';
import { fetchAccountBalance } from '../../store/slices/authSlice';

interface BalanceDisplayProps {
    address: string;
    compact?: boolean;
    showRefresh?: boolean;
}

const BalanceDisplay: React.FC<BalanceDisplayProps> = ({
    address,
    compact = false,
    showRefresh = true
}) => {
    const dispatch = useDispatch<AppDispatch>();
    const { balanceInfo, balanceLoading, balanceError, lastBalanceUpdate } = useSelector(
        (state: RootState) => state.auth
    );

    useEffect(() => {
        if (address) {
            dispatch(fetchAccountBalance(address));
        }
    }, [dispatch, address]);

    // Auto-refresh every 30 seconds
    useEffect(() => {
        if (!address) return;

        const interval = setInterval(() => {
            dispatch(fetchAccountBalance(address));
        }, 30000);

        return () => clearInterval(interval);
    }, [dispatch, address]);

    const handleRefresh = () => {
        if (address) {
            dispatch(fetchAccountBalance(address));
        }
    };

    const formatBalance = (balance: number): string => {
        return balance.toFixed(8);
    };

    const formatLastUpdate = (): string => {
        if (!lastBalanceUpdate) return 'Never';
        return new Date(lastBalanceUpdate).toLocaleTimeString();
    };

    if (balanceLoading) {
        return (
            <Card sx={{ height: '100%' }}>
                <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', py: 4 }}>
                        <CircularProgress size={24} sx={{ mr: 2 }} />
                        <Typography variant="body2" color="text.secondary">
                            Loading balance...
                        </Typography>
                    </Box>
                </CardContent>
            </Card>
        );
    }

    if (balanceError) {
        return (
            <Card sx={{ height: '100%' }}>
                <CardContent>
                    <Alert severity="error">
                        Failed to load balance: {balanceError}
                        {showRefresh && (
                            <IconButton size="small" onClick={handleRefresh} sx={{ ml: 1 }}>
                                <RefreshIcon />
                            </IconButton>
                        )}
                    </Alert>
                </CardContent>
            </Card>
        );
    }

    if (!balanceInfo) {
        return (
            <Card sx={{ height: '100%' }}>
                <CardContent>
                    <Alert severity="warning">
                        No balance information available
                    </Alert>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card sx={{ height: '100%' }}>
            <CardContent>
                <Box display="flex" alignItems="center" mb={3}>
                    <Avatar sx={{ bgcolor: 'primary.main', mr: 2, width: 56, height: 56 }}>
                        <BalanceIcon sx={{ fontSize: 32 }} />
                    </Avatar>
                    <Box flexGrow={1}>
                        <Typography variant="h5" gutterBottom>
                            Account Balance
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Current FRK balance and account status
                        </Typography>
                    </Box>
                    {showRefresh && (
                        <Tooltip title="Refresh balance">
                            <IconButton onClick={handleRefresh} size="small">
                                <RefreshIcon />
                            </IconButton>
                        </Tooltip>
                    )}
                </Box>

                <Grid container spacing={3}>
                    <Grid size={{ xs: 12 }}>
                        <Box mb={2}>
                            <Typography variant="body2" color="text.secondary" gutterBottom>
                                FRK Balance
                            </Typography>
                            <Paper
                                elevation={0}
                                sx={{
                                    p: 2,
                                    bgcolor: 'grey.50',
                                    borderRadius: 2,
                                    border: '1px solid',
                                    borderColor: 'grey.200',
                                    textAlign: 'center'
                                }}
                            >
                                <Typography
                                    variant="body2"
                                    sx={{
                                        fontWeight: 700,
                                        fontFamily: 'monospace',
                                        fontSize: '0.875rem',
                                        lineHeight: 1.5,
                                        color: 'primary.main'
                                    }}
                                >
                                    {formatBalance(balanceInfo.balance)} FRK
                                </Typography>
                            </Paper>
                        </Box>
                    </Grid>

                    <Grid size={{ xs: 12, sm: 6 }}>
                        <Box mb={2}>
                            <Typography variant="body2" color="text.secondary" gutterBottom>
                                Account Level
                            </Typography>
                            <Paper
                                elevation={0}
                                sx={{
                                    p: 2,
                                    bgcolor: 'grey.50',
                                    borderRadius: 2,
                                    border: '1px solid',
                                    borderColor: 'grey.200',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                            >
                                <LevelIcon sx={{ mr: 1, color: 'success.main' }} />
                                <Typography
                                    variant="body2"
                                    sx={{
                                        fontWeight: 700,
                                        fontFamily: 'monospace',
                                        fontSize: '0.875rem',
                                        lineHeight: 1.5,
                                    }}
                                >
                                    Level {balanceInfo.level}
                                </Typography>
                            </Paper>
                        </Box>
                    </Grid>

                    <Grid size={{ xs: 12, sm: 6 }}>
                        <Box mb={2}>
                            <Typography variant="body2" color="text.secondary" gutterBottom>
                                Blocks Minted
                            </Typography>
                            <Paper
                                elevation={0}
                                sx={{
                                    p: 2,
                                    bgcolor: 'grey.50',
                                    borderRadius: 2,
                                    border: '1px solid',
                                    borderColor: 'grey.200',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                            >
                                <BlocksIcon sx={{ mr: 1, color: 'secondary.main' }} />
                                <Typography
                                    variant="body2"
                                    sx={{
                                        fontWeight: 700,
                                        fontFamily: 'monospace',
                                        fontSize: '0.875rem',
                                        lineHeight: 1.5,
                                    }}
                                >
                                    {balanceInfo.blocksMinted.toLocaleString()}
                                </Typography>
                            </Paper>
                        </Box>
                    </Grid>
                </Grid>

                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block', textAlign: 'center' }}>
                    Last updated: {formatLastUpdate()}
                </Typography>
            </CardContent>
        </Card>
    );
};

export default BalanceDisplay;