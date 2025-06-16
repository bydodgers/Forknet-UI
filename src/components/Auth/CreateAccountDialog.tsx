import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Paper,
  TextField,
  Checkbox,
  FormControlLabel,
  Alert,
  CircularProgress,
  Stepper,
  Step,
  StepLabel,
  IconButton,
  Divider,
  Chip,
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DownloadIcon from '@mui/icons-material/Download';
import SecurityIcon from '@mui/icons-material/Security';
import WarningIcon from '@mui/icons-material/Warning';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../store';
import { createAccount, clearError } from '../../store/slices/authSlice';
import { CryptoUtils } from '../../utils/crypto';
import { ForknetApi } from '../../services/forknetApi';

interface CreateAccountDialogProps {
  open: boolean;
  onClose: () => void;
}

const CreateAccountDialog: React.FC<CreateAccountDialogProps> = ({ open, onClose }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { loading, error } = useSelector((state: RootState) => state.auth);

  // Stepper state
  const [activeStep, setActiveStep] = useState(0);
  const steps = ['Generate Seedphrase', 'Backup & Confirm', 'Create Account'];

  // Form states
  const [seedphrase, setSeedphrase] = useState('');
  const [showSeedphrase, setShowSeedphrase] = useState(false);
  const [backupPassword, setBackupPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [hasWrittenDown, setHasWrittenDown] = useState(false);
  const [hasBackedUp, setHasBackedUp] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [accountCreated, setAccountCreated] = useState(false);

  // Generate seedphrase when dialog opens
  useEffect(() => {
    if (open && !seedphrase) {
      const generateSeed = async () => {
        try {
          const newSeedphrase = await CryptoUtils.generateSeedphrase();
          setSeedphrase(newSeedphrase);
        } catch (error: any) {
          console.error('Seedphrase generation failed:', error);
          // Show error to user and close dialog
          alert('Failed to generate secure seedphrase. Please try again or refresh the page.');
          onClose();
        }
      };

      generateSeed();
    }
  }, [open, seedphrase, onClose]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setActiveStep(0);
      setSeedphrase('');
      setBackupPassword('');
      setConfirmPassword('');
      setHasWrittenDown(false);
      setHasBackedUp(false);
      setPasswordError('');
      setAccountCreated(false);
      dispatch(clearError());
    }
  }, [open, dispatch]);

  const handleCopySeedphrase = async () => {
    try {
      await navigator.clipboard.writeText(seedphrase);
      // You could add a snackbar notification here
    } catch (err) {
      console.error('Failed to copy seedphrase:', err);
    }
  };

  const handleDownloadSeedphrase = () => {
    const blob = new Blob([seedphrase], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'forknet_seedphrase.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadBackup = async () => {
    if (!backupPassword) {
      setPasswordError('Password required for backup');
      return;
    }

    if (backupPassword !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }

    if (backupPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters');
      return;
    }

    try {
      // Generate private key from seedphrase
      const privateKey = await CryptoUtils.seedphraseToPrivateKey(seedphrase);

      // Get public key from private key using Forknet API
      const publicKey = await ForknetApi.getPublicKeyFromPrivate(privateKey);

      // Get proper Forknet address from public key using Forknet API
      const address = await ForknetApi.getAddressFromPublicKey(publicKey);

      // Generate backup data
      const backupData = await CryptoUtils.generateBackupData(
        privateKey,
        backupPassword,
        address
      );

      // Download backup file
      const blob = new Blob([JSON.stringify(backupData, null, 2)], {
        type: 'application/json'
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `forknet_backup_${address}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setHasBackedUp(true);
      setPasswordError('');
    } catch (err: any) {
      console.error('Backup creation error:', err);
      setPasswordError(`Failed to create backup file: ${err.message}`);
    }
  };

  const handleNext = () => {
    if (activeStep === 0) {
      setActiveStep(1);
    } else if (activeStep === 1) {
      // Check if user started entering password but didn't complete backup
      const hasPasswordInput = backupPassword.trim().length > 0 || confirmPassword.trim().length > 0;

      if (hasPasswordInput && !hasBackedUp) {
        setPasswordError('Please complete backup download or clear password fields to continue without backup');
        return;
      }

      if (!hasWrittenDown) {
        alert('Please confirm you have written down your seedphrase');
        return;
      }
      setActiveStep(2);
    }
  };

  const handleBack = () => {
    setActiveStep(activeStep - 1);
  };

  const handleCreateAccount = async () => {
    try {
      await dispatch(createAccount({ seedphrase })).unwrap();
      setAccountCreated(true);
      // Close dialog after a short delay to show success message
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (error) {
      // Error is handled by the slice
    }
  };

  const renderStep = () => {
    switch (activeStep) {
      case 0:
        return (
          <Box>
            <Alert severity="info" sx={{ mb: 3 }}>
              <Typography variant="body2">
                A new seedphrase has been generated for your account. This is the only way to recover your account if you lose access.
              </Typography>
            </Alert>

            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <SecurityIcon color="primary" />
              Your Seedphrase
            </Typography>

            <Paper
              elevation={0}
              sx={{
                p: 3,
                bgcolor: 'primary.light',
                color: 'primary.contrastText',
                border: '2px solid',
                borderColor: 'primary.main',
                mb: 2,
              }}
            >
              <Typography
                variant="body1"
                sx={{
                  fontFamily: 'monospace',
                  fontSize: '1.1rem',
                  lineHeight: 1.6,
                  filter: showSeedphrase ? 'none' : 'blur(4px)',
                  transition: 'filter 0.3s ease',
                  cursor: showSeedphrase ? 'text' : 'pointer',
                }}
                onClick={() => !showSeedphrase && setShowSeedphrase(true)}
              >
                {seedphrase}
              </Typography>

              <Box sx={{ mt: 2, display: 'flex', gap: 1, justifyContent: 'center' }}>
                <IconButton
                  size="small"
                  onClick={() => setShowSeedphrase(!showSeedphrase)}
                  sx={{ color: 'inherit' }}
                >
                  {showSeedphrase ? <VisibilityOffIcon /> : <VisibilityIcon />}
                </IconButton>
                <IconButton
                  size="small"
                  onClick={handleCopySeedphrase}
                  sx={{ color: 'inherit' }}
                  disabled={!showSeedphrase}
                >
                  <ContentCopyIcon />
                </IconButton>
                <IconButton
                  size="small"
                  onClick={handleDownloadSeedphrase}
                  sx={{ color: 'inherit' }}
                  disabled={!showSeedphrase}
                >
                  <DownloadIcon />
                </IconButton>
              </Box>
            </Paper>

            <Alert severity="warning" icon={<WarningIcon />}>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                Write down your seedphrase and store it safely!
              </Typography>
              <Typography variant="body2" sx={{ mt: 1 }}>
                • Anyone with your seedphrase can access your account<br />
                • If you lose it, your account cannot be recovered<br />
                • Never share it online or store it digitally
              </Typography>
            </Alert>
          </Box>
        );

      case 1:
        return (
          <Box>
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="body2" gutterBottom>
                <strong>Backup Options:</strong> Create an encrypted backup file OR rely on your seedphrase alone.
              </Typography>
            </Alert>

            {/* Backup Section - Compact Version */}
            <Box sx={{ mb: 2 }}>
              <Typography variant="h6" gutterBottom>
                Create Encrypted Backup (Optional)
              </Typography>

              <Box display="flex" gap={2} mb={2}>
                <TextField
                  label="Backup Password"
                  type={showPasswords ? 'text' : 'password'}
                  value={backupPassword}
                  onChange={(e) => {
                    setBackupPassword(e.target.value);
                    setPasswordError('');
                  }}
                  size="small"
                  sx={{ flex: 1 }}
                  InputProps={{
                    endAdornment: (
                      <IconButton
                        onClick={() => setShowPasswords(!showPasswords)}
                        edge="end"
                        size="small"
                      >
                        {showPasswords ? <VisibilityOffIcon /> : <VisibilityIcon />}
                      </IconButton>
                    ),
                  }}
                />

                <TextField
                  label="Confirm Password"
                  type={showPasswords ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  size="small"
                  sx={{ flex: 1 }}
                  error={!!passwordError}
                />
              </Box>

              {passwordError && (
                <Typography variant="caption" color="error" display="block" sx={{ mb: 1 }}>
                  {passwordError}
                </Typography>
              )}

              <Box display="flex" gap={2} alignItems="center" flexWrap="wrap">
                <Button
                  variant="contained"
                  startIcon={<DownloadIcon />}
                  onClick={handleDownloadBackup}
                  disabled={!backupPassword || !confirmPassword}
                  size="small"
                >
                  Download Backup
                </Button>

                {(backupPassword || confirmPassword) && !hasBackedUp && (
                  <Button
                    variant="outlined"
                    color="secondary"
                    onClick={() => {
                      setBackupPassword('');
                      setConfirmPassword('');
                      setPasswordError('');
                    }}
                    size="small"
                  >
                    Skip Backup
                  </Button>
                )}

                {hasBackedUp && (
                  <Chip label="Backup Created ✓" color="success" size="small" />
                )}
              </Box>
            </Box>

            <Divider sx={{ my: 2 }} />

            {/* PROMINENT Confirmation Section */}
            <Paper
              sx={{
                p: 2,
                bgcolor: '#fff3e0',
                border: '2px solid',
                borderColor: '#ff9800',
                borderRadius: 2
              }}
            >
              <Typography variant="h6" gutterBottom sx={{ color: '#e65100', fontWeight: 'bold' }}>
                ⚠️ REQUIRED CONFIRMATION
              </Typography>

              <FormControlLabel
                control={
                  <Checkbox
                    checked={hasWrittenDown}
                    onChange={(e) => setHasWrittenDown(e.target.checked)}
                    sx={{
                      color: '#ff9800',
                      '&.Mui-checked': { color: '#ff9800' },
                      transform: 'scale(1.2)'
                    }}
                  />
                }
                label={
                  <Typography variant="body1" sx={{ fontWeight: 'bold', color: '#e65100' }}>
                    I have written down my seedphrase and stored it safely.
                    I understand that losing it means losing my account permanently.
                  </Typography>
                }
                sx={{
                  alignItems: 'flex-start',
                  mt: 1,
                  '& .MuiFormControlLabel-label': {
                    fontSize: '1rem'
                  }
                }}
              />
            </Paper>
          </Box>
        );

      case 2:
        return (
          <Box textAlign="center">
            {accountCreated ? (
              <>
                <Typography variant="h6" gutterBottom color="success.main">
                  🎉 Account Created Successfully!
                </Typography>

                <Alert severity="success" sx={{ mb: 3 }}>
                  Your Forknet account has been created and you are now logged in.
                  This dialog will close automatically.
                </Alert>

                <Typography variant="body1" color="text.secondary">
                  You can now start using your Forknet account. Remember to keep your seedphrase safe!
                </Typography>
              </>
            ) : (
              <>
                <Typography variant="h6" gutterBottom>
                  Ready to Create Account
                </Typography>

                <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                  Your Forknet account will be generated from your seedphrase and you'll be logged in automatically.
                </Typography>

                <Alert
                  severity="info"
                  sx={{
                    mb: 2,
                    textAlign: 'left',
                    '& ul': { margin: 0, paddingLeft: '20px' }
                  }}
                >
                  <Typography variant="body2" component="div">
                    <strong>What happens next:</strong>
                    <ul style={{ marginTop: '8px' }}>
                      <li>Your unique Forknet address will be generated</li>
                      <li>You'll be automatically logged into the dashboard</li>
                      <li>Your account will appear on the network after your first transaction</li>
                    </ul>
                  </Typography>
                </Alert>

                {error && (
                  <Alert severity="error" sx={{ mb: 2, textAlign: 'left' }}>
                    {error}
                  </Alert>
                )}
              </>
            )}
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          minHeight: '70vh',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column'
        }
      }}
    >
      <DialogTitle>
        <Typography variant="h5" component="div">
          Create New Forknet Account
        </Typography>
        <Stepper activeStep={activeStep} sx={{ mt: 2 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
      </DialogTitle>

      <DialogContent
        sx={{
          pt: 3,
          flex: 1,
          overflow: 'auto',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <Box sx={{ flexGrow: 1 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {renderStep()}
        </Box>
      </DialogContent>

      <Divider />

      <DialogActions sx={{ p: 3, borderTop: '1px solid', borderColor: 'divider' }}>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>

        {activeStep > 0 && (
          <Button onClick={handleBack} disabled={loading}>
            Back
          </Button>
        )}

        {activeStep < steps.length - 1 ? (
          <Button
            variant="contained"
            onClick={handleNext}
            disabled={loading || (activeStep === 1 && !hasWrittenDown)}
            color={activeStep === 1 && !hasWrittenDown ? 'error' : 'primary'}
            sx={{ minWidth: 200 }}
          >
            {activeStep === 1 && !hasWrittenDown
              ? 'Check confirmation above'
              : 'Next'
            }
          </Button>
        ) : (
          <Button
            variant="contained"
            onClick={handleCreateAccount}
            disabled={loading || accountCreated}
            startIcon={loading ? <CircularProgress size={20} /> : null}
          >
            {loading ? 'Creating Account...' : accountCreated ? 'Account Created!' : 'Create Account'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default CreateAccountDialog;