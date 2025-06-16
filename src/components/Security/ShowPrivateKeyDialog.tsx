import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Alert,
  IconButton,
  Chip,
  Paper,
  Stepper,
  Step,
  StepLabel,
  LinearProgress,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  ContentCopy,
  Security,
  CheckCircle,
  Timer,
  Close,
} from '@mui/icons-material';

interface ShowPrivateKeyDialogProps {
  open: boolean;
  onClose: () => void;
}

const ShowPrivateKeyDialog: React.FC<ShowPrivateKeyDialogProps> = ({ open, onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [privateKey, setPrivateKey] = useState<string | null>(null);
  const [isRevealed, setIsRevealed] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30);
  const [copySuccess, setCopySuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const steps = ['Security Warning', 'Confirm Access', 'View Private Key'];
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const autoHideRef = useRef<NodeJS.Timeout | null>(null);

  const handleClose = useCallback(() => {
    // Clean up sensitive data
    setPrivateKey(null);
    setIsRevealed(false);
    setCurrentStep(0);
    setTimeLeft(30);
    setCopySuccess(false);
    setError(null);
    
    // Clear timers
    if (timerRef.current) clearInterval(timerRef.current);
    if (autoHideRef.current) clearTimeout(autoHideRef.current);
    
    onClose();
  }, [onClose]);

  // Load private key when reaching step 2
  useEffect(() => {
    if (currentStep === 2 && !privateKey) {
      const key = localStorage.getItem('forknet_private_key');
      if (!key) {
        setError('No private key found. Please log in again.');
        return;
      }
      setPrivateKey(key);
    }
  }, [currentStep, privateKey]);

  // Auto-hide timer when private key is revealed
  useEffect(() => {
    if (currentStep === 2 && isRevealed && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setIsRevealed(false);
            return 30; // Reset timer
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [currentStep, isRevealed, timeLeft]);

  // Auto-close dialog after 2 minutes of inactivity
  useEffect(() => {
    if (open) {
      autoHideRef.current = setTimeout(() => {
        handleClose();
      }, 120000); // 2 minutes
    }

    return () => {
      if (autoHideRef.current) {
        clearTimeout(autoHideRef.current);
      }
    };
  }, [open, handleClose]);

  const handleCopyToClipboard = async () => {
    if (!privateKey) return;

    try {
      await navigator.clipboard.writeText(privateKey);
      setCopySuccess(true);
      
      // Auto-clear success message
      setTimeout(() => setCopySuccess(false), 3000);
      
      // Security: Clear clipboard after 30 seconds
      setTimeout(async () => {
        try {
          await navigator.clipboard.writeText('');
        } catch (err) {
          // Silently fail - some browsers don't allow clearing clipboard
        }
      }, 30000);
      
    } catch (err) {
      setError('Failed to copy to clipboard');
    }
  };

  const handleRevealKey = () => {
    setIsRevealed(true);
    setTimeLeft(30); // Reset timer when revealing
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <Box>
            <Alert severity="error" sx={{ mb: 3 }}>
              <Typography variant="body2" gutterBottom>
              <strong>CRITICAL SECURITY WARNING</strong>
              </Typography>
              <Typography variant="body2">
                Your private key provides <strong>complete control</strong> over your Forknet account.
                Anyone with access to this key can:
              </Typography>
              <Box component="ul" sx={{ mt: 1, mb: 0 }}>
                <li>Send all your FRK to any address</li>
                <li>Access your account permanently</li>
                <li>Perform any transaction on your behalf</li>
                <li>Cannot be reversed or recovered if compromised</li>
              </Box>
            </Alert>

            <Alert severity="warning" sx={{ mb: 3 }}>
              <Typography variant="body2" gutterBottom>
                <strong>Before proceeding, ensure:</strong>
              </Typography>
              <Box component="ul" sx={{ mt: 1, mb: 0 }}>
                <li>No one can see your screen</li>
                <li>No screen recording software is running</li>
                <li>You're in a private, secure location</li>
                <li>You trust this device and network</li>
              </Box>
            </Alert>

            <Typography variant="body2" color="text.secondary">
              This private key will be automatically hidden after 30 seconds and the dialog will close after 2 minutes.
            </Typography>
          </Box>
        );

      case 1:
        return (
          <Box>
            <Alert severity="info" sx={{ mb: 3 }}>
              <Typography variant="body2">
                Please confirm you understand the security implications and agree to proceed.
              </Typography>
            </Alert>

            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Final Security Checklist:
              </Typography>
              <Box component="ul">
                <li>✓ I am in a secure, private environment</li>
                <li>✓ I understand the risks of exposing my private key</li>
                <li>✓ I will not share this key with anyone</li>
                <li>✓ I will securely store any copies I make</li>
                <li>✓ I take full responsibility for the security of this key</li>
              </Box>
            </Box>

            <Alert severity="warning">
              <Typography variant="body2">
                <strong>Remember:</strong> This key will be used to add your account to the minting pool.
                Only proceed if you intend to use this device for minting blocks.
              </Typography>
            </Alert>
          </Box>
        );

      case 2:
        return (
          <Box>
            {error ? (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            ) : (
              <>
                <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                  <Typography variant="h6">Your Private Key</Typography>
                  {isRevealed && (
                    <Chip
                      icon={<Timer />}
                      label={`Auto-hide in ${timeLeft}s`}
                      color="warning"
                      size="small"
                    />
                  )}
                </Box>

                <Paper
                  elevation={0}
                  sx={{
                    p: 3,
                    bgcolor: 'error.light',
                    border: '2px solid',
                    borderColor: 'error.main',
                    mb: 2,
                    position: 'relative',
                  }}
                >
                  <Typography
                    variant="body1"
                    sx={{
                      fontFamily: 'monospace',
                      fontSize: '1rem',
                      lineHeight: 1.6,
                      wordBreak: 'break-all',
                      filter: isRevealed ? 'none' : 'blur(8px)',
                      transition: 'filter 0.3s ease',
                      userSelect: isRevealed ? 'text' : 'none',
                      cursor: isRevealed ? 'text' : 'pointer',
                      minHeight: '1.5em',
                    }}
                    onClick={!isRevealed ? handleRevealKey : undefined}
                  >
                    {privateKey || 'Loading...'}
                  </Typography>

                  {!isRevealed && (
                    <Box
                      sx={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        bgcolor: 'rgba(0,0,0,0.8)',
                        color: 'white',
                        px: 2,
                        py: 1,
                        borderRadius: 1,
                      }}
                    >
                      <Visibility />
                      <Typography variant="body2">Click to reveal</Typography>
                    </Box>
                  )}
                </Paper>

                <Box display="flex" gap={2} justifyContent="center">
                  <Button
                    variant="outlined"
                    startIcon={isRevealed ? <VisibilityOff /> : <Visibility />}
                    onClick={() => setIsRevealed(!isRevealed)}
                    disabled={!privateKey}
                  >
                    {isRevealed ? 'Hide' : 'Reveal'} Key
                  </Button>

                  <Button
                    variant="contained"
                    startIcon={copySuccess ? <CheckCircle /> : <ContentCopy />}
                    onClick={handleCopyToClipboard}
                    disabled={!isRevealed || !privateKey}
                    color={copySuccess ? 'success' : 'primary'}
                  >
                    {copySuccess ? 'Copied!' : 'Copy Key'}
                  </Button>
                </Box>

                {isRevealed && (
                  <Box sx={{ mt: 2 }}>
                    <LinearProgress 
                      variant="determinate" 
                      value={(timeLeft / 30) * 100}
                      color="warning"
                    />
                  </Box>
                )}

                <Alert severity="warning" sx={{ mt: 2 }}>
                  <Typography variant="body2">
                    <strong>Security Reminder:</strong> This key provides complete access to your account.
                    {copySuccess && " The clipboard will be automatically cleared in 30 seconds."}
                  </Typography>
                </Alert>
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
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { minHeight: '500px' }
      }}
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center" gap={1}>
            <Security color="error" />
            <Typography variant="h6">Show Private Key</Typography>
          </Box>
          <IconButton onClick={handleClose} size="small">
            <Close />
          </IconButton>
        </Box>
        
        <Stepper activeStep={currentStep} sx={{ mt: 2 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
      </DialogTitle>

      <DialogContent sx={{ pt: 3 }}>
        {renderStepContent()}
      </DialogContent>

      <DialogActions sx={{ p: 3 }}>
        <Button onClick={handleClose} disabled={false}>
          Cancel
        </Button>
        
        {currentStep > 0 && (
          <Button 
            onClick={() => setCurrentStep(currentStep - 1)}
            disabled={currentStep === 2}
          >
            Back
          </Button>
        )}

        {currentStep < steps.length - 1 && (
          <Button
            variant="contained"
            onClick={() => setCurrentStep(currentStep + 1)}
            color={currentStep === 0 ? 'error' : 'primary'}
          >
            {currentStep === 0 ? 'I Understand the Risks' : 'Confirm & Proceed'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default ShowPrivateKeyDialog;