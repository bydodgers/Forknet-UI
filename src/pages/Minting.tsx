import React from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Button,
    Alert,
    Grid,
    Container,
    AppBar,
    Toolbar,
    useTheme,
} from '@mui/material';
import { Memory, ArrowBack } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../utils/constants';

const Minting: React.FC = () => {
    const navigate = useNavigate();
    const theme = useTheme();

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
                    {/* Responsive Back Button */}
                    <Button
                        startIcon={<ArrowBack />}
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
                        {/* Mobile: Icon only */}
                    </Button>

                    <Memory sx={{ mr: 1 }} />
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
                            Minting Details
                        </Box>
                        <Box display={{ xs: 'block', sm: 'none' }}>
                            Minting
                        </Box>
                    </Typography>
                </Toolbar>
            </AppBar>

            <Alert severity="info" sx={{ mb: 3 }}>
                Minting functionality will be implemented in a future update. This will show detailed information
                about blockchain minting and your account's minting status.
            </Alert>

            <Grid container spacing={3}>
                <Grid size={{ xs: 12, md: 6 }}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                General Minting Details
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                • Current blockchain height
                                • Average block time
                                • Total minting accounts
                                • Network difficulty
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                Blockchain Stats
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                • Total transactions
                                • Total blocks minted
                                • Network hash rate
                                • Active minting accounts
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                Minting Account Details
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                • Your minting level
                                • Blocks minted by you
                                • Estimated next block time
                                • Minting eligibility status
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                Minting Reward Info
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                • Current block reward
                                • Your total rewards
                                • Reward distribution
                                • Minting statistics
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </Container>
    );
};

export default Minting;