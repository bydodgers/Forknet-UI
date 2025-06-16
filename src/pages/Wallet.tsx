import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Alert,
  Container,
  AppBar,
  Toolbar,
  useTheme,
} from '@mui/material';
import { AccountBalanceWallet, ArrowBack } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../utils/constants';

const Wallet: React.FC = () => {
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

          <AccountBalanceWallet sx={{ mr: 1 }} />
          <Typography 
            variant="h5" 
            component="div" 
            sx={{ 
              flexGrow: 1, 
              fontWeight: 'bold',
              fontSize: { xs: '1.25rem', sm: '1.5rem' }
            }}
          >
            Wallet
          </Typography>
        </Toolbar>
      </AppBar>

      <Alert severity="info" sx={{ mb: 3 }}>
        Wallet functionality will be implemented in a future update. This will include transaction history, 
        send/receive functions, and asset management.
      </Alert>

      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Coming Soon
          </Typography>
          <Typography variant="body1" color="text.secondary">
            The wallet page will include:
          </Typography>
          <ul>
            <li>Transaction history</li>
            <li>Send FRK to other addresses</li>
            <li>Asset management</li>
            <li>Transaction details and confirmations</li>
          </ul>
        </CardContent>
      </Card>
    </Container>
  );
};

export default Wallet;