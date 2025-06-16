import React, { useState, useEffect, useCallback } from 'react';
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
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Chip,
    Grid,
    Alert,
    CircularProgress,
    Container,
    AppBar,
    Toolbar,
    useTheme,
    alpha,
    Autocomplete,
    Collapse,
    IconButton,
    Tooltip,
    Drawer,
    Divider,
    Accordion,
    AccordionSummary,
    AccordionDetails,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import TravelExploreIcon from '@mui/icons-material/TravelExplore';
import RefreshIcon from '@mui/icons-material/Refresh';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import TuneIcon from '@mui/icons-material/Tune';
import CloseIcon from '@mui/icons-material/Close';
import HistoryIcon from '@mui/icons-material/History';
import PaymentIcon from '@mui/icons-material/Payment';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ClearIcon from '@mui/icons-material/Clear';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../utils/constants';
import {
    ExplorerApi,
    TransactionSearchParams,
    TransactionData,
    TRANSACTION_TYPES,
    ConfirmationStatus
} from '../services/explorerApi';

// Search preset interface
interface SearchPreset {
    label: string;
    params: Partial<TransactionSearchParams>;
    icon: React.ReactNode;
}

const Explorer: React.FC = () => {
    const navigate = useNavigate();
    const theme = useTheme();

    // Search form state
    const [searchParams, setSearchParams] = useState<TransactionSearchParams>({
        confirmationStatus: 'CONFIRMED',
        limit: 20,
        offset: 0,
        reverse: true
    });

    // UI state
    const [transactions, setTransactions] = useState<TransactionData[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

    // Drawer and search criteria state
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [searchCriteria, setSearchCriteria] = useState({
        hasAddress: false,
        hasTypes: false,
        hasBlockRange: false,
        hasGroupId: false,
        hasCustomLimit: false
    });

    // Search presets
    const searchPresets: SearchPreset[] = [
        {
            label: "Recent 200",
            params: {
                limit: 200,
                txType: [...TRANSACTION_TYPES],
                confirmationStatus: 'CONFIRMED',
                reverse: true
            },
            icon: <HistoryIcon fontSize="small" />
        },
        {
            label: "All Payments",
            params: { limit: 0, txType: ['PAYMENT'], confirmationStatus: 'CONFIRMED' },
            icon: <PaymentIcon fontSize="small" />
        }
    ];

    // Update search criteria tracker
    useEffect(() => {
        setSearchCriteria({
            hasAddress: !!searchParams.address,
            hasTypes: !!(searchParams.txType && searchParams.txType.length > 0),
            hasBlockRange: !!(searchParams.startBlock || searchParams.blockLimit),
            hasGroupId: searchParams.txGroupId !== undefined,
            hasCustomLimit: searchParams.limit !== 20
        });
    }, [searchParams]);

    // Search function (doesn't close drawer)
    const handleSearch = useCallback(async () => {
        setLoading(true);
        setError(null);

        // Validate API requirements
        if (searchParams.limit === 0 && !searchParams.address && (!searchParams.txType || searchParams.txType.length === 0)) {
            setError('API requires: either txType or address when limit=0, or limit must be ≤20');
            setLoading(false);
            return;
        }

        try {
            const results = await ExplorerApi.searchTransactions(searchParams);
            setTransactions(results);
            setExpandedRows(new Set());

        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [searchParams]);

    // Search function that also closes drawer (for external triggers)
    const handleSearchAndClose = useCallback(async () => {
        await handleSearch();
        setDrawerOpen(false);
    }, [handleSearch]);

    // Initial load effect
    useEffect(() => {
        // Only search on initial mount with default parameters
        const initialSearch = async () => {
            setLoading(true);
            setError(null);

            try {
                const results = await ExplorerApi.searchTransactions({
                    confirmationStatus: 'CONFIRMED',
                    limit: 20,
                    offset: 0,
                    reverse: true
                });
                setTransactions(results);
                setExpandedRows(new Set());
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        initialSearch();
    }, []);

    // Auto-search effect (for external triggers like presets, table clicks)
    useEffect(() => {
        // Only auto-search if we have some criteria set (not the initial state)
        // Skip if this was triggered by clearAllFilters (which handles its own search)
        if (searchParams.address ||
            (searchParams.txType && searchParams.txType.length > 0) ||
            searchParams.startBlock ||
            searchParams.blockLimit ||
            searchParams.txGroupId !== undefined ||
            searchParams.limit !== 20) {

            // Add a small delay to batch parameter updates
            const timeoutId = setTimeout(() => {
                handleSearch();
            }, 100);

            return () => clearTimeout(timeoutId);
        }
    }, [searchParams, handleSearch]);

    const toggleRowExpansion = (signature: string) => {
        const newExpandedRows = new Set(expandedRows);
        if (newExpandedRows.has(signature)) {
            newExpandedRows.delete(signature);
        } else {
            newExpandedRows.add(signature);
        }
        setExpandedRows(newExpandedRows);
    };

    const handleCopyToClipboard = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    // Smart chip display for transaction types
    const renderTransactionTypeChips = () => {
        const selected = searchParams.txType || [];
        const maxVisible = 3;

        if (selected.length === 0) return null;
        if (selected.length === TRANSACTION_TYPES.length) {
            return <Chip label="All Types" color="primary" size="small" />;
        }

        return (
            <Box display="flex" gap={0.5} flexWrap="wrap" alignItems="center">
                {selected.slice(0, maxVisible).map(type => (
                    <Chip
                        key={type}
                        label={ExplorerApi.formatTransactionType(type)}
                        size="small"
                        variant="outlined"
                        onDelete={() => {
                            const newTypes = selected.filter(t => t !== type);
                            setSearchParams({ ...searchParams, txType: newTypes });
                        }}
                    />
                ))}
                {selected.length > maxVisible && (
                    <Chip
                        label={`+${selected.length - maxVisible} more`}
                        size="small"
                        color="primary"
                        onClick={() => setDrawerOpen(true)}
                    />
                )}
            </Box>
        );
    };

    // Clear all filters
    const clearAllFilters = useCallback(() => {
        const newParams = {
            confirmationStatus: 'CONFIRMED' as ConfirmationStatus,
            limit: 20,
            offset: 0,
            reverse: true
        };

        setSearchParams(newParams);

        // Trigger search after clearing filters
        setTimeout(async () => {
            setLoading(true);
            setError(null);

            try {
                const results = await ExplorerApi.searchTransactions(newParams);
                setTransactions(results);
                setExpandedRows(new Set());
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }, 100);
    }, []);

    // Apply preset (triggers auto-search and closes drawer)
    const applyPreset = (preset: SearchPreset) => {
        setSearchParams({ ...searchParams, ...preset.params });
        setTimeout(() => setDrawerOpen(false), 100);
    };

    // Enhanced component for transaction details row
    const TransactionDetailsRow: React.FC<{ transaction: TransactionData; isExpanded: boolean }> = ({
        transaction,
        isExpanded
    }) => (
        <TableRow>
            <TableCell colSpan={7} sx={{ py: 0 }}>
                <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                    <Box sx={{ py: 3, px: 2 }}>
                        <Card
                            variant="outlined"
                            sx={{
                                bgcolor: alpha(theme.palette.primary.main, 0.02),
                                border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`
                            }}
                        >
                            <CardContent>
                                <Typography variant="h6" gutterBottom sx={{ color: 'primary.main', fontWeight: 'bold' }}>
                                    Transaction Details
                                </Typography>

                                <Grid container spacing={3}>
                                    {/* Transaction Signature */}
                                    <Grid size={{ xs: 12 }}>
                                        <Box>
                                            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                                Transaction Signature
                                            </Typography>
                                            <Box
                                                display="flex"
                                                alignItems="center"
                                                gap={1}
                                                sx={{
                                                    p: 2,
                                                    bgcolor: 'background.paper',
                                                    borderRadius: 1,
                                                    border: '1px solid',
                                                    borderColor: 'divider'
                                                }}
                                            >
                                                <Typography
                                                    variant="body2"
                                                    sx={{
                                                        fontFamily: 'monospace',
                                                        wordBreak: 'break-all',
                                                        flexGrow: 1,
                                                        fontSize: '0.875rem'
                                                    }}
                                                >
                                                    {transaction.signature}
                                                </Typography>
                                                <Tooltip title="Copy signature">
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => handleCopyToClipboard(transaction.signature)}
                                                        sx={{
                                                            color: 'primary.main',
                                                            '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.1) }
                                                        }}
                                                    >
                                                        <ContentCopyIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                            </Box>
                                        </Box>
                                    </Grid>

                                    {/* Transaction Flow */}
                                    <Grid size={{ xs: 12 }}>
                                        <Box>
                                            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                                Transaction Flow
                                            </Typography>
                                            <Box display="flex" alignItems="center" gap={2} flexWrap="wrap">
                                                {/* From Address */}
                                                <Box
                                                    display="flex"
                                                    alignItems="center"
                                                    gap={1}
                                                    sx={{
                                                        p: 1.5,
                                                        bgcolor: alpha(theme.palette.error.main, 0.1),
                                                        borderRadius: 1,
                                                        border: '1px solid',
                                                        borderColor: alpha(theme.palette.error.main, 0.3)
                                                    }}
                                                >
                                                    <Typography variant="caption" color="error.main" sx={{ fontWeight: 'bold' }}>
                                                        FROM:
                                                    </Typography>
                                                    <Typography
                                                        variant="body2"
                                                        sx={{
                                                            fontFamily: 'monospace',
                                                            fontSize: '0.8rem'
                                                        }}
                                                    >
                                                        {ExplorerApi.formatAddress(transaction.creatorAddress)}
                                                    </Typography>
                                                    <Tooltip title="Copy from address">
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => handleCopyToClipboard(transaction.creatorAddress)}
                                                            sx={{ color: 'error.main' }}
                                                        >
                                                            <ContentCopyIcon fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                </Box>

                                                {/* Arrow */}
                                                {(transaction as any).recipient && (
                                                    <>
                                                        <ArrowForwardIcon color="primary" />

                                                        {/* To Address */}
                                                        <Box
                                                            display="flex"
                                                            alignItems="center"
                                                            gap={1}
                                                            sx={{
                                                                p: 1.5,
                                                                bgcolor: alpha(theme.palette.success.main, 0.1),
                                                                borderRadius: 1,
                                                                border: '1px solid',
                                                                borderColor: alpha(theme.palette.success.main, 0.3)
                                                            }}
                                                        >
                                                            <Typography variant="caption" color="success.main" sx={{ fontWeight: 'bold' }}>
                                                                TO:
                                                            </Typography>
                                                            <Typography
                                                                variant="body2"
                                                                sx={{
                                                                    fontFamily: 'monospace',
                                                                    fontSize: '0.8rem'
                                                                }}
                                                            >
                                                                {ExplorerApi.formatAddress((transaction as any).recipient)}
                                                            </Typography>
                                                            <Tooltip title="Copy to address">
                                                                <IconButton
                                                                    size="small"
                                                                    onClick={() => handleCopyToClipboard((transaction as any).recipient)}
                                                                    sx={{ color: 'success.main' }}
                                                                >
                                                                    <ContentCopyIcon fontSize="small" />
                                                                </IconButton>
                                                            </Tooltip>
                                                        </Box>
                                                    </>
                                                )}
                                            </Box>
                                        </Box>
                                    </Grid>

                                    {/* Basic Details Row 1 */}
                                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                        <Box>
                                            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                                Transaction Type
                                            </Typography>
                                            <Chip
                                                label={ExplorerApi.formatTransactionType(transaction.txType)}
                                                color="primary"
                                                variant="outlined"
                                                sx={{ fontWeight: 'medium' }}
                                            />
                                        </Box>
                                    </Grid>

                                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                        <Box>
                                            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                                Block Height
                                            </Typography>
                                            <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                                                {transaction.blockHeight ?
                                                    transaction.blockHeight.toLocaleString() :
                                                    'Unconfirmed'
                                                }
                                            </Typography>
                                        </Box>
                                    </Grid>

                                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                        <Box>
                                            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                                Transaction Fee
                                            </Typography>
                                            <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                                                {transaction.fee !== undefined ? `${transaction.fee} FRK` : 'Unknown'}
                                            </Typography>
                                        </Box>
                                    </Grid>

                                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                        <Box>
                                            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                                Approval Status
                                            </Typography>
                                            <Chip
                                                label={transaction.approvalStatus || 'CONFIRMED'}
                                                color={transaction.blockHeight ? 'success' : 'warning'}
                                                size="small"
                                            />
                                        </Box>
                                    </Grid>

                                    {/* Timestamp */}
                                    <Grid size={{ xs: 12, md: 6 }}>
                                        <Box>
                                            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                                Timestamp
                                            </Typography>
                                            <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                                                {ExplorerApi.formatTimestamp(transaction.timestamp)}
                                            </Typography>
                                        </Box>
                                    </Grid>

                                    {/* Reference (if exists) */}
                                    {(transaction as any).reference && (
                                        <Grid size={{ xs: 12, md: 6 }}>
                                            <Box>
                                                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                                    Reference Transaction
                                                </Typography>
                                                <Box
                                                    display="flex"
                                                    alignItems="center"
                                                    gap={1}
                                                    sx={{
                                                        p: 1.5,
                                                        bgcolor: 'background.paper',
                                                        borderRadius: 1,
                                                        border: '1px solid',
                                                        borderColor: 'divider'
                                                    }}
                                                >
                                                    <Typography
                                                        variant="body2"
                                                        sx={{
                                                            fontFamily: 'monospace',
                                                            wordBreak: 'break-all',
                                                            flexGrow: 1,
                                                            fontSize: '0.8rem'
                                                        }}
                                                    >
                                                        {ExplorerApi.formatAddress((transaction as any).reference)}
                                                    </Typography>
                                                    <Tooltip title="Copy reference">
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => handleCopyToClipboard((transaction as any).reference)}
                                                            sx={{ color: 'primary.main' }}
                                                        >
                                                            <ContentCopyIcon fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                </Box>
                                            </Box>
                                        </Grid>
                                    )}

                                    {/* TX Group ID (if not default) */}
                                    {(transaction as any).txGroupId !== undefined && (
                                        <Grid size={{ xs: 12, md: 3 }}>
                                            <Box>
                                                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                                    Transaction Group
                                                </Typography>
                                                <Chip
                                                    label={`Group ${(transaction as any).txGroupId}`}
                                                    variant="outlined"
                                                    size="small"
                                                    color={(transaction as any).txGroupId === 0 ? "default" : "info"}
                                                />
                                            </Box>
                                        </Grid>
                                    )}

                                    {/* Transaction-specific fields for REWARD_SHARE */}
                                    {(transaction.txType === 'REWARD_SHARE' || (transaction as any).type === 'REWARD_SHARE') && (
                                        <>
                                            <Grid size={{ xs: 12 }}>
                                                <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: 'primary.main', mt: 2, mb: 1 }}>
                                                    Reward Share Details
                                                </Typography>
                                            </Grid>

                                            {(transaction as any).minterPublicKey && (
                                                <Grid size={{ xs: 12, md: 6 }}>
                                                    <Box>
                                                        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                                            Minter Public Key
                                                        </Typography>
                                                        <Typography
                                                            variant="body2"
                                                            sx={{
                                                                fontFamily: 'monospace',
                                                                wordBreak: 'break-all',
                                                                fontSize: '0.8rem'
                                                            }}
                                                        >
                                                            {(transaction as any).minterPublicKey}
                                                        </Typography>
                                                    </Box>
                                                </Grid>
                                            )}

                                            {(transaction as any).rewardSharePublicKey && (
                                                <Grid size={{ xs: 12, md: 6 }}>
                                                    <Box>
                                                        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                                            Reward Share Public Key
                                                        </Typography>
                                                        <Typography
                                                            variant="body2"
                                                            sx={{
                                                                fontFamily: 'monospace',
                                                                wordBreak: 'break-all',
                                                                fontSize: '0.8rem'
                                                            }}
                                                        >
                                                            {(transaction as any).rewardSharePublicKey}
                                                        </Typography>
                                                    </Box>
                                                </Grid>
                                            )}

                                            {(transaction as any).sharePercent !== undefined && (
                                                <Grid size={{ xs: 12, md: 3 }}>
                                                    <Box>
                                                        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                                            Share Percentage
                                                        </Typography>
                                                        <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                                                            {(transaction as any).sharePercent}%
                                                        </Typography>
                                                    </Box>
                                                </Grid>
                                            )}
                                        </>
                                    )}
                                </Grid>

                                {/* Action buttons */}
                                <Box sx={{ mt: 3, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                                    <Box display="flex" gap={2} flexWrap="wrap">
                                        <Button
                                            variant="outlined"
                                            size="small"
                                            startIcon={<SearchIcon />}
                                            onClick={() => {
                                                setSearchParams({
                                                    ...searchParams,
                                                    address: transaction.creatorAddress
                                                });
                                                setTimeout(() => setDrawerOpen(false), 100);
                                            }}
                                        >
                                            View From Address
                                        </Button>

                                        {(transaction as any).recipient && (
                                            <Button
                                                variant="outlined"
                                                size="small"
                                                startIcon={<SearchIcon />}
                                                onClick={() => {
                                                    setSearchParams({
                                                        ...searchParams,
                                                        address: (transaction as any).recipient
                                                    });
                                                    setTimeout(() => setDrawerOpen(false), 100);
                                                }}
                                            >
                                                View To Address
                                            </Button>
                                        )}

                                        {transaction.blockHeight && (
                                            <Button
                                                variant="outlined"
                                                size="small"
                                                onClick={() => {
                                                    setSearchParams({
                                                        ...searchParams,
                                                        startBlock: transaction.blockHeight,
                                                        blockLimit: 1
                                                    });
                                                    setTimeout(() => setDrawerOpen(false), 100);
                                                }}
                                            >
                                                View Block {transaction.blockHeight}
                                            </Button>
                                        )}
                                    </Box>
                                </Box>
                            </CardContent>
                        </Card>
                    </Box>
                </Collapse>
            </TableCell>
        </TableRow>
    );

    return (
        <Container maxWidth="xl" sx={{ py: 3 }}>
            {/* Header */}
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
                        <Box display={{ xs: 'none', md: 'block' }}>Back to Dashboard</Box>
                        <Box display={{ xs: 'none', sm: 'block', md: 'none' }}>Dashboard</Box>
                    </Button>

                    <TravelExploreIcon sx={{ mr: 1 }} />
                    <Typography
                        variant="h5"
                        component="div"
                        sx={{
                            flexGrow: 1,
                            fontWeight: 'bold',
                            fontSize: { xs: '1.25rem', sm: '1.5rem' }
                        }}
                    >
                        <Box display={{ xs: 'none', sm: 'block' }}>Blockchain Explorer</Box>
                        <Box display={{ xs: 'block', sm: 'none' }}>Explorer</Box>
                    </Typography>

                    <Button
                        startIcon={<RefreshIcon />}
                        onClick={() => handleSearch()}
                        disabled={loading}
                        sx={{
                            color: 'white',
                            '&:hover': { backgroundColor: 'rgba(255,255,255,0.1)' }
                        }}
                    >
                        <Box display={{ xs: 'none', sm: 'block' }}>Refresh</Box>
                    </Button>
                </Toolbar>
            </AppBar>

            {/* Search Presets */}
            <Box display="flex" gap={1} mb={2} flexWrap="wrap">
                {searchPresets.map(preset => (
                    <Button
                        key={preset.label}
                        size="small"
                        variant="outlined"
                        startIcon={preset.icon}
                        onClick={() => applyPreset(preset)}
                        sx={{ borderRadius: 2 }}
                    >
                        {preset.label}
                    </Button>
                ))}
            </Box>

            {/* Compact Search Bar */}
            <Card sx={{ mb: 3 }}>
                <CardContent sx={{ py: 2 }}>
                    <Box display="flex" alignItems="center" gap={2}>
                        <IconButton
                            onClick={() => setDrawerOpen(true)}
                            color="primary"
                            sx={{
                                bgcolor: alpha(theme.palette.primary.main, 0.1),
                                '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.2) }
                            }}
                        >
                            <TuneIcon />
                        </IconButton>

                        <TextField
                            size="small"
                            placeholder="Enter address to search..."
                            value={searchParams.address || ''}
                            onChange={(e) => setSearchParams({ ...searchParams, address: e.target.value })}
                            sx={{ flexGrow: 1 }}
                        />

                        <Button
                            variant="contained"
                            startIcon={<SearchIcon />}
                            onClick={handleSearchAndClose}
                            disabled={loading}
                            sx={{ borderRadius: 2 }}
                        >
                            {loading ? 'Searching...' : 'Search'}
                        </Button>
                    </Box>

                    {/* Active Filters Summary */}
                    {(searchCriteria.hasAddress || searchCriteria.hasTypes || searchCriteria.hasBlockRange || searchCriteria.hasGroupId || searchCriteria.hasCustomLimit) && (
                        <Box display="flex" gap={1} mt={2} flexWrap="wrap" alignItems="center">
                            <Typography variant="caption" color="text.secondary" sx={{ mr: 1 }}>
                                Active filters:
                            </Typography>

                            {searchCriteria.hasAddress && (
                                <Chip
                                    size="small"
                                    label={`Address: ${ExplorerApi.formatAddress(searchParams.address!)}`}
                                    color="primary"
                                    variant="outlined"
                                    onDelete={() => setSearchParams({ ...searchParams, address: undefined })}
                                />
                            )}

                            {searchCriteria.hasTypes && renderTransactionTypeChips()}

                            {searchCriteria.hasBlockRange && (
                                <Chip
                                    size="small"
                                    label="Block range"
                                    color="secondary"
                                    variant="outlined"
                                    onDelete={() => setSearchParams({
                                        ...searchParams,
                                        startBlock: undefined,
                                        blockLimit: undefined
                                    })}
                                />
                            )}

                            {searchCriteria.hasGroupId && (
                                <Chip
                                    size="small"
                                    label={`Group: ${searchParams.txGroupId}`}
                                    color="info"
                                    variant="outlined"
                                    onDelete={() => setSearchParams({ ...searchParams, txGroupId: undefined })}
                                />
                            )}

                            {searchCriteria.hasCustomLimit && (
                                <Chip
                                    size="small"
                                    label={`Limit: ${searchParams.limit === 0 ? 'All' : searchParams.limit}`}
                                    color="warning"
                                    variant="outlined"
                                />
                            )}

                            <IconButton
                                size="small"
                                onClick={clearAllFilters}
                                sx={{ ml: 1 }}
                                title="Clear all filters"
                            >
                                <ClearIcon fontSize="small" />
                            </IconButton>
                        </Box>
                    )}
                </CardContent>
            </Card>

            {/* Error Alert */}
            {error && (
                <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
                    {error}
                </Alert>
            )}

            {/* Results */}
            <Card>
                <CardContent>
                    <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                        <Typography variant="h6">
                            Transaction Results ({transactions.length})
                        </Typography>
                    </Box>

                    {loading ? (
                        <Box display="flex" justifyContent="center" py={4}>
                            <CircularProgress />
                        </Box>
                    ) : transactions.length === 0 ? (
                        <Box textAlign="center" py={4}>
                            <Typography color="text.secondary">
                                No transactions found. Try adjusting your search criteria.
                            </Typography>
                        </Box>
                    ) : (
                        <TableContainer component={Paper} variant="outlined">
                            <Table>
                                <TableHead>
                                    <TableRow sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1) }}>
                                        <TableCell width="50">Details</TableCell>
                                        <TableCell>Block</TableCell>
                                        <TableCell>Type</TableCell>
                                        <TableCell>From</TableCell>
                                        <TableCell>To</TableCell>
                                        <TableCell>Fee</TableCell>
                                        <TableCell>Time</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {transactions.filter(tx => tx && tx.signature).map((tx, index) => (
                                        <React.Fragment key={`${tx.signature}-${index}`}>
                                            {/* Main row */}
                                            <TableRow
                                                hover
                                                sx={{
                                                    '&:hover': {
                                                        bgcolor: alpha(theme.palette.primary.main, 0.02)
                                                    }
                                                }}
                                            >
                                                <TableCell>
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => toggleRowExpansion(tx.signature)}
                                                        sx={{
                                                            color: 'primary.main',
                                                            transition: 'transform 0.2s ease',
                                                            transform: expandedRows.has(tx.signature)
                                                                ? 'rotate(180deg)'
                                                                : 'rotate(0deg)'
                                                        }}
                                                    >
                                                        <KeyboardArrowDownIcon />
                                                    </IconButton>
                                                </TableCell>
                                                <TableCell>
                                                    <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                                                        {tx.blockHeight ? tx.blockHeight.toLocaleString() : 'Pending'}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Chip
                                                        label={ExplorerApi.formatTransactionType(tx.txType)}
                                                        size="small"
                                                        color={tx.txType ? "primary" : "default"}
                                                        variant="outlined"
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Tooltip title={tx.creatorAddress}>
                                                        <Typography
                                                            variant="body2"
                                                            sx={{
                                                                fontFamily: 'monospace',
                                                                cursor: 'pointer',
                                                                color: 'error.main',
                                                                '&:hover': { textDecoration: 'underline' }
                                                            }}
                                                            onClick={() => {
                                                                setSearchParams({
                                                                    ...searchParams,
                                                                    address: tx.creatorAddress
                                                                });
                                                                setTimeout(() => setDrawerOpen(false), 100);
                                                            }}
                                                        >
                                                            {ExplorerApi.formatAddress(tx.creatorAddress)}
                                                        </Typography>
                                                    </Tooltip>
                                                </TableCell>
                                                <TableCell>
                                                    {(tx as any).recipient ? (
                                                        <Tooltip title={(tx as any).recipient}>
                                                            <Typography
                                                                variant="body2"
                                                                sx={{
                                                                    fontFamily: 'monospace',
                                                                    cursor: 'pointer',
                                                                    color: 'success.main',
                                                                    '&:hover': { textDecoration: 'underline' }
                                                                }}
                                                                onClick={() => {
                                                                    setSearchParams({
                                                                        ...searchParams,
                                                                        address: (tx as any).recipient
                                                                    });
                                                                    setTimeout(() => setDrawerOpen(false), 100);
                                                                }}
                                                            >
                                                                {ExplorerApi.formatAddress((tx as any).recipient)}
                                                            </Typography>
                                                        </Tooltip>
                                                    ) : (
                                                        <Typography variant="body2" color="text.secondary">
                                                            —
                                                        </Typography>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <Typography variant="body2">
                                                        {tx.fee !== undefined ? `${tx.fee} FRK` : '—'}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Typography variant="body2">
                                                        {ExplorerApi.formatTimestamp(tx.timestamp)}
                                                    </Typography>
                                                </TableCell>
                                            </TableRow>

                                            {/* Details row */}
                                            <TransactionDetailsRow
                                                transaction={tx}
                                                isExpanded={expandedRows.has(tx.signature)}
                                            />
                                        </React.Fragment>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    )}
                </CardContent>
            </Card>

            {/* Search Drawer */}
            <Drawer
                anchor="right"
                open={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                PaperProps={{
                    sx: { width: { xs: '100%', sm: 400, md: 500 } }
                }}
            >
                <Box sx={{ p: 3 }}>
                    <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
                        <Typography variant="h6">Search Filters</Typography>
                        <IconButton onClick={() => setDrawerOpen(false)}>
                            <CloseIcon />
                        </IconButton>
                    </Box>

                    {/* Basic Search */}
                    <Accordion defaultExpanded>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                            <Typography variant="subtitle1" fontWeight="bold">Basic Search</Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                            <Box display="flex" flexDirection="column" gap={2}>
                                <TextField
                                    fullWidth
                                    label="address"
                                    value={searchParams.address || ''}
                                    onChange={(e) => setSearchParams({ ...searchParams, address: e.target.value })}
                                    placeholder="Enter address to search"
                                    helperText="Search transactions for a specific address"
                                />

                                <FormControl fullWidth>
                                    <InputLabel>confirmationStatus</InputLabel>
                                    <Select
                                        value={searchParams.confirmationStatus}
                                        label="confirmationStatus"
                                        onChange={(e) => setSearchParams({
                                            ...searchParams,
                                            confirmationStatus: e.target.value as ConfirmationStatus
                                        })}
                                    >
                                        <MenuItem value="CONFIRMED">CONFIRMED</MenuItem>
                                        <MenuItem value="UNCONFIRMED">UNCONFIRMED</MenuItem>
                                        <MenuItem value="BOTH">BOTH</MenuItem>
                                    </Select>
                                </FormControl>

                                <TextField
                                    fullWidth
                                    label="limit"
                                    type="number"
                                    value={searchParams.limit !== undefined ? searchParams.limit.toString() : '20'}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        setSearchParams({
                                            ...searchParams,
                                            limit: value === '' ? 20 : parseInt(value)
                                        });
                                    }}
                                    inputProps={{ min: 0 }}
                                    helperText="0 = all (requires txType or address)"
                                />

                                <FormControl fullWidth>
                                    <InputLabel>reverse</InputLabel>
                                    <Select
                                        value={searchParams.reverse ? 'true' : 'false'}
                                        label="reverse"
                                        onChange={(e) => setSearchParams({
                                            ...searchParams,
                                            reverse: e.target.value === 'true'
                                        })}
                                    >
                                        <MenuItem value="true">true (newest first)</MenuItem>
                                        <MenuItem value="false">false (oldest first)</MenuItem>
                                    </Select>
                                </FormControl>
                            </Box>
                        </AccordionDetails>
                    </Accordion>

                    {/* Transaction Types */}
                    <Accordion defaultExpanded>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                            <Typography variant="subtitle1" fontWeight="bold">
                                Transaction Types ({searchParams.txType?.length || 0} of {TRANSACTION_TYPES.length})
                            </Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                            <Box>
                                <Box display="flex" justifyContent="space-between" mb={2}>
                                    <Button
                                        size="small"
                                        variant="text"
                                        onClick={() => setSearchParams({
                                            ...searchParams,
                                            txType: [...TRANSACTION_TYPES]
                                        })}
                                        disabled={searchParams.txType?.length === TRANSACTION_TYPES.length}
                                        sx={{ color: 'primary.main' }}
                                    >
                                        Select All
                                    </Button>
                                    <Button
                                        size="small"
                                        variant="text"
                                        onClick={() => setSearchParams({
                                            ...searchParams,
                                            txType: []
                                        })}
                                        disabled={!searchParams.txType?.length}
                                        sx={{ color: 'error.main' }}
                                    >
                                        Clear All
                                    </Button>
                                </Box>

                                <Autocomplete
                                    multiple
                                    options={TRANSACTION_TYPES}
                                    value={searchParams.txType || []}
                                    onChange={(_, newValue) => setSearchParams({
                                        ...searchParams,
                                        txType: newValue
                                    })}
                                    getOptionLabel={(option) => ExplorerApi.formatTransactionType(option)}
                                    renderInput={(params) => (
                                        <TextField
                                            {...params}
                                            label="txType"
                                            placeholder="Select types to filter"
                                            helperText="Leave empty = no type filter, or use Select All for all types"
                                        />
                                    )}
                                    renderTags={(value, getTagProps) =>
                                        value.map((option, index) => (
                                            <Chip
                                                variant="outlined"
                                                label={ExplorerApi.formatTransactionType(option)}
                                                {...getTagProps({ index })}
                                                key={option}
                                            />
                                        ))
                                    }
                                />
                            </Box>
                        </AccordionDetails>
                    </Accordion>

                    {/* Advanced Filters */}
                    <Accordion>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                            <Typography variant="subtitle1" fontWeight="bold">Advanced Filters</Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                            <Box display="flex" flexDirection="column" gap={2}>
                                <TextField
                                    fullWidth
                                    label="startBlock"
                                    type="number"
                                    value={searchParams.startBlock !== undefined ? searchParams.startBlock.toString() : ''}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        setSearchParams({
                                            ...searchParams,
                                            startBlock: value === '' ? undefined : parseInt(value)
                                        });
                                    }}
                                    helperText="Search from block height"
                                />

                                <TextField
                                    fullWidth
                                    label="blockLimit"
                                    type="number"
                                    value={searchParams.blockLimit !== undefined ? searchParams.blockLimit.toString() : ''}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        setSearchParams({
                                            ...searchParams,
                                            blockLimit: value === '' ? undefined : parseInt(value)
                                        });
                                    }}
                                    helperText="Search within X blocks"
                                />

                                <TextField
                                    fullWidth
                                    label="txGroupId"
                                    type="number"
                                    value={searchParams.txGroupId !== undefined ? searchParams.txGroupId.toString() : ''}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        setSearchParams({
                                            ...searchParams,
                                            txGroupId: value === '' ? undefined : parseInt(value)
                                        });
                                    }}
                                    helperText="Find grouped transactions"
                                    inputProps={{ min: 0 }}
                                />
                            </Box>
                        </AccordionDetails>
                    </Accordion>

                    <Divider sx={{ my: 3 }} />

                    {/* Action Buttons */}
                    <Box display="flex" gap={2}>
                        <Button
                            fullWidth
                            variant="outlined"
                            onClick={clearAllFilters}
                            startIcon={<ClearIcon />}
                        >
                            Clear All
                        </Button>
                        <Button
                            fullWidth
                            variant="contained"
                            onClick={handleSearchAndClose}
                            disabled={loading}
                            startIcon={<SearchIcon />}
                        >
                            {loading ? 'Searching...' : 'Search'}
                        </Button>
                    </Box>
                </Box>
            </Drawer>
        </Container>
    );
};

export default Explorer;