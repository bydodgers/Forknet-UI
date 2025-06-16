import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box,
  Alert,
  InputAdornment,
  IconButton,
  LinearProgress,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Security,
  Download,
} from '@mui/icons-material';

interface PasswordDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (password: string) => Promise<void>;
  title?: string;
  description?: string;
  loading?: boolean;
}

const PasswordDialog: React.FC<PasswordDialogProps> = ({
  open,
  onClose,
  onConfirm,
  title = "Enter Password",
  description = "Please enter a password to continue",
  loading = false,
}) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleClose = () => {
    if (!loading) {
      setPassword('');
      setConfirmPassword('');
      setError('');
      setShowPassword(false);
      onClose();
    }
  };

  const handleConfirm = async () => {
    setError('');

    // Validation
    if (!password) {
      setError('Password is required');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      await onConfirm(password);
      handleClose();
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && password && confirmPassword && !loading) {
      handleConfirm();
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose} 
      maxWidth="sm" 
      fullWidth
      disableEscapeKeyDown={loading}
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <Security color="primary" />
          <Typography variant="h6">{title}</Typography>
        </Box>
      </DialogTitle>

      <DialogContent>
        {loading && <LinearProgress sx={{ mb: 2 }} />}
        
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          {description}
        </Typography>

        <TextField
          fullWidth
          label="Password"
          type={showPassword ? 'text' : 'password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={loading}
          margin="normal"
          helperText="Choose a strong password (minimum 8 characters)"
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  onClick={() => setShowPassword(!showPassword)}
                  edge="end"
                  disabled={loading}
                >
                  {showPassword ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </InputAdornment>
            ),
          }}
        />

        <TextField
          fullWidth
          label="Confirm Password"
          type={showPassword ? 'text' : 'password'}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={loading}
          margin="normal"
          helperText="Re-enter your password to confirm"
        />

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}

        <Alert severity="info" sx={{ mt: 2 }}>
          <Typography variant="body2">
            <strong>Important:</strong> Remember this password! You'll need it to restore your backup file.
            Store it securely alongside your backup file.
          </Typography>
        </Alert>
      </DialogContent>

      <DialogActions sx={{ p: 3 }}>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleConfirm}
          disabled={!password || !confirmPassword || loading}
          startIcon={loading ? undefined : <Download />}
        >
          {loading ? 'Creating Backup...' : 'Create Backup'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PasswordDialog;