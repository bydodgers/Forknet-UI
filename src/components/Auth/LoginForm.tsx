import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  InputAdornment,
  IconButton,
  ToggleButton,
  ToggleButtonGroup,
  Paper,
  Divider,
  Chip,
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import KeyIcon from '@mui/icons-material/Key';
import TextFieldsIcon from '@mui/icons-material/TextFields';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../store';
import {
  loginWithPrivateKey,
  loginWithSeedphrase,
  clearError,
} from '../../store/slices/authSlice';
import CreateAccountDialog from './CreateAccountDialog';
import { ForknetApi } from '../../services/forknetApi';

type LoginType = 'seedphrase' | 'backup' | 'privatekey';

const LoginForm: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { loading, error } = useSelector((state: RootState) => state.auth);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  // Login type state
  const [loginType, setLoginType] = useState<LoginType>('seedphrase');

  // Form states
  const [privateKey, setPrivateKey] = useState('');
  const [seedphrase, setSeedphrase] = useState('');
  const [backupFile, setBackupFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState('');
  const [backupPassword, setBackupPassword] = useState('');
  const [showBackupPassword, setShowBackupPassword] = useState(false);

  // UI states
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [showSeedphrase, setShowSeedphrase] = useState(false);
  const [validationError, setValidationError] = useState('');

  const isPasswordRequired = !!(validationError && validationError.includes('password'));
  const passwordErrorMessage = "🔒 This backup file is encrypted and requires a password";
  const passwordHelperText = "Enter the password if your backup file is encrypted (optional)";
  const passwordPlaceholder = "Leave blank if no password was used";
  const passwordRequiredPlaceholder = "Enter the password used when creating this backup";

  // Debug effect to track what's causing form resets
  useEffect(() => {

  }, [loginType, backupFile, validationError, error, loading]);

  const handleLoginTypeChange = (
    event: React.MouseEvent<HTMLElement>,
    newType: LoginType | null
  ) => {
    if (newType !== null && newType !== loginType) {

      setLoginType(newType);

      // Clear all errors and validation when switching types
      setValidationError('');
      dispatch(clearError());

      // Clear backup-specific data when switching away
      if (newType !== 'backup') {
        setBackupPassword('');
        setBackupFile(null);
        setFileContent('');
      }

      // Clear other form data when switching away
      if (newType !== 'seedphrase') {
        setSeedphrase('');
      }
      if (newType !== 'privatekey') {
        setPrivateKey('');
      }
    }
  };

  const validateSeedphrase = (phrase: string): boolean => {
    const words = phrase.trim().split(/\s+/);
    if (words.length < 12 || words.length > 24) {
      setValidationError('Seedphrase must be between 12 and 24 words');
      return false;
    }
    setValidationError('');
    return true;
  };

  const validatePrivateKey = (key: string): boolean => {
    if (!key || key.length < 32) {
      setValidationError('Private key must be at least 32 characters');
      return false;
    }
    setValidationError('');
    return true;
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) return;

    setBackupFile(file);
    setValidationError(''); // Clear previous errors
    dispatch(clearError());

    try {
      const text = await file.text();

      // Try to parse JSON to validate format
      try {
        const parsed = JSON.parse(text);

        // Give user a hint about whether password is likely needed
        if (parsed.encryptedSeed && parsed.mac && parsed.salt) {

        }

      } catch (parseError) {
        setValidationError('Invalid backup file format - not valid JSON');
        return;
      }

      setFileContent(text);
    } catch (err) {
      setValidationError('Failed to read file');
    }
  };

  // Backup login that avoids Redux dispatch issues
  const handleBackupLogin = async (fileContent: string, password: string): Promise<boolean> => {
    try {

      // Parse and validate the backup file
      let backupData;
      try {
        backupData = JSON.parse(fileContent);
      } catch (e) {
        setValidationError('Invalid backup file format - not valid JSON. Please select a valid backup file.');
        return false;
      }

      // Validate required fields
      const requiredFields = ['address0', 'salt', 'iv', 'version', 'encryptedSeed', 'mac'];
      for (const field of requiredFields) {
        if (!(field in backupData)) {
          setValidationError('Invalid backup file format. Please ensure you selected a valid Forknet backup file.');
          return false;
        }
      }

      // Extract private key from backup
      const privateKey = await ForknetApi.extractPrivateKeyFromBackup(backupData, password);

      // Generate account info
      const publicKey = await ForknetApi.getPublicKeyFromPrivate(privateKey);
      const address = await ForknetApi.getAddressFromPublicKey(publicKey);

      // Try to get account info from network
      let accountData;
      let balance = 0;
      try {
        const isValid = await ForknetApi.validateAddress(address);
        if (isValid) {
          accountData = await ForknetApi.getAccountInfo(address);
          balance = await ForknetApi.getBalance(address);
        }
      } catch (error: any) {

      }

      const account = {
        address,
        publicKey,
        balance: balance || 0,
        level: accountData?.level || 0,
      };

      // Store in localStorage
      localStorage.setItem('forknet_private_key', privateKey);
      localStorage.setItem('forknet_account', JSON.stringify(account));

      // Update Redux state using the standard login action instead of manual dispatch
      dispatch({
        type: 'auth/loginWithBackupFile/fulfilled',
        payload: { account, privateKey }
      });

      return true;

    } catch (error: any) {

      const errorMessage = error?.message || error || 'Unknown error occurred';

      // Set appropriate error messages without clearing other state
      if (errorMessage.includes('Password required') ||
        errorMessage.includes('This backup file requires a password') ||
        errorMessage.includes('Invalid password') ||
        errorMessage.includes('MAC verification failed')) {
        setValidationError('This backup file is encrypted and requires a password. Please enter the password you used when creating the backup file.');
      } else if (errorMessage.includes('missing') || errorMessage.includes('Invalid backup file')) {
        setValidationError('Invalid backup file format. Please ensure you selected a valid Forknet backup file.');
      } else if (errorMessage.includes('JSON')) {
        setValidationError('Invalid backup file format - not valid JSON. Please select a valid backup file.');
      } else {
        setValidationError(`Login failed: ${errorMessage}`);
      }

      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Clear errors at start, but be more careful about it
    if (loginType !== 'backup') {
      dispatch(clearError());
    }
    setValidationError('');

    try {
      switch (loginType) {
        case 'seedphrase':
          if (!validateSeedphrase(seedphrase)) return;
          await dispatch(loginWithSeedphrase({ seedphrase })).unwrap();
          break;

        case 'backup':

          if (!backupFile || !fileContent) {
            setValidationError('Please select a backup file');
            return;
          }

          // Use the improved backup login function
          const success = await handleBackupLogin(fileContent, backupPassword || '');
          if (!success) {
            // Don't dispatch anything that might cause side effects
          }
          break;

        case 'privatekey':
          if (!validatePrivateKey(privateKey)) return;
          await dispatch(loginWithPrivateKey({ privateKey })).unwrap();
          break;
      }
    } catch (error: any) {
      // Only set validation error for non-backup types
      if (loginType !== 'backup') {
        setValidationError(error.message || 'Login failed');
      }
    }
  };

  const renderLoginForm = () => {
    switch (loginType) {
      case 'seedphrase':
        return (
          <TextField
            fullWidth
            label="Seedphrase"
            type={showSeedphrase ? 'text' : 'password'}
            value={seedphrase}
            onChange={(e) => setSeedphrase(e.target.value)}
            margin="normal"
            required
            disabled={loading}
            error={!!validationError}
            helperText={validationError || 'Enter your 12 or 24 word recovery phrase'}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowSeedphrase(!showSeedphrase)}
                    edge="end"
                  >
                    {showSeedphrase ? <VisibilityOffIcon /> : <VisibilityIcon />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
        );

      case 'backup':
        return (
          <Box>
            <Paper
              sx={{
                p: 3,
                mt: 2,
                minHeight: 120,
                border: '2px dashed',
                borderColor: validationError && !backupFile ? 'error.main' :
                  backupFile ? 'success.main' : 'grey.300',
                bgcolor: validationError && !backupFile ? 'error.light' :
                  backupFile ? 'success.light' : 'grey.50',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                '&:hover': {
                  borderColor: validationError && !backupFile ? 'error.dark' :
                    backupFile ? 'success.main' : 'primary.main',
                  bgcolor: validationError && !backupFile ? 'error.light' :
                    backupFile ? 'success.light' : 'primary.light'
                },
                '&:focus-within': {
                  borderColor: 'primary.main',
                  boxShadow: '0 0 0 3px rgba(25, 118, 210, 0.12)',
                }
              }}
              component="label"
            >
              <input
                type="file"
                hidden
                accept=".json"
                onChange={handleFileUpload}
              />

              <Box display="flex" flexDirection="column" alignItems="center" gap={1}>
                {backupFile ? (
                  <>
                    <InsertDriveFileIcon color="success" sx={{ fontSize: 32 }} />
                    <Typography variant="body1" color="success.main" fontWeight="medium">
                      File Selected
                    </Typography>
                    <Chip
                      label={backupFile.name}
                      color="success"
                      size="small"
                      sx={{
                        maxWidth: '100%',
                        '& .MuiChip-label': {
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }
                      }}
                    />
                    <Typography variant="caption" color="text.secondary">
                      Click to change file
                    </Typography>
                  </>
                ) : (
                  <>
                    <UploadFileIcon sx={{
                      fontSize: 32,
                      color: validationError && !backupFile ? 'error.main' : 'text.secondary'
                    }} />
                    <Typography variant="body1" color={validationError && !backupFile ? 'error.main' : 'text.primary'}>
                      Select Backup File
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Choose your .json backup file
                    </Typography>
                  </>
                )}
              </Box>
            </Paper>

            {/* Password Field - Always show if file is selected */}
            {backupFile && (
              <Box sx={{ mt: 2 }}>
                <TextField
                  fullWidth
                  label="Backup Password"
                  type={showBackupPassword ? 'text' : 'password'}
                  value={backupPassword}
                  onChange={(e) => {
                    setBackupPassword(e.target.value);
                    if (validationError) {
                      setValidationError('');
                    }
                    if (error) {
                      dispatch(clearError());
                    }
                  }}
                  required={isPasswordRequired}
                  disabled={loading}
                  placeholder={isPasswordRequired ? passwordRequiredPlaceholder : passwordPlaceholder}
                  helperText={isPasswordRequired ? passwordErrorMessage : passwordHelperText}
                  error={isPasswordRequired}
                  sx={{
                    '& .MuiFormHelperText-root': {
                      color: isPasswordRequired ? 'error.main' : 'text.secondary'
                    }
                  }}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowBackupPassword(!showBackupPassword)}
                          edge="end"
                        >
                          {showBackupPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              </Box>
            )}
          </Box>
        );

      case 'privatekey':
        return (
          <TextField
            fullWidth
            label="Private Key"
            type={showPrivateKey ? 'text' : 'password'}
            value={privateKey}
            onChange={(e) => setPrivateKey(e.target.value)}
            margin="normal"
            required
            disabled={loading}
            error={!!validationError}
            helperText={validationError || 'Your Forknet account private key'}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowPrivateKey(!showPrivateKey)}
                    edge="end"
                  >
                    {showPrivateKey ? <VisibilityOffIcon /> : <VisibilityIcon />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
        );
    }
  };

  const isSubmitDisabled = () => {
    if (loading) return true;

    switch (loginType) {
      case 'seedphrase':
        return !seedphrase.trim();
      case 'backup':
        return !backupFile;
      case 'privatekey':
        return !privateKey.trim();
      default:
        return true;
    }
  };

  return (
    <Box
      display="flex"
      justifyContent="center"
      alignItems="center"
      minHeight="100vh"
      bgcolor="#edece4"
      p={2}
    >
      <Card sx={{ maxWidth: 500, width: '100%' }}>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom align="center">
            Forknet Login
          </Typography>

          <Typography variant="body2" color="text.secondary" align="center" mb={3}>
            Choose how you'd like to access your Forknet account
          </Typography>

          {/* Login Type Selector - Stacked Vertically */}
          <Paper elevation={0} sx={{ p: 1, mb: 3, bgcolor: 'action.hover', borderRadius: 2 }}>
            <ToggleButtonGroup
              value={loginType}
              exclusive
              onChange={handleLoginTypeChange}
              orientation="vertical"
              fullWidth
              size="large"
              sx={{
                '& .MuiToggleButton-root': {
                  border: 'none',
                  borderRadius: 1.5,
                  m: 0.5,
                  py: 2,
                  justifyContent: 'flex-start',
                  textAlign: 'left',
                  '&.Mui-selected': {
                    bgcolor: 'background.paper',
                    boxShadow: 2,
                  },
                },
              }}
            >
              <ToggleButton value="seedphrase">
                <Box display="flex" alignItems="center" gap={2}>
                  <TextFieldsIcon sx={{ fontSize: 24, color: 'primary.main' }} />
                  <Box>
                    <Typography variant="body1" fontWeight="medium">
                      Seedphrase
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      12 or 24 word recovery phrase
                    </Typography>
                  </Box>
                </Box>
              </ToggleButton>

              <ToggleButton value="backup">
                <Box display="flex" alignItems="center" gap={2}>
                  <UploadFileIcon sx={{ fontSize: 24, color: 'primary.main' }} />
                  <Box>
                    <Typography variant="body1" fontWeight="medium">
                      Backup File
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Encrypted JSON backup file
                    </Typography>
                  </Box>
                </Box>
              </ToggleButton>

              <ToggleButton value="privatekey">
                <Box display="flex" alignItems="center" gap={2}>
                  <KeyIcon sx={{ fontSize: 24, color: 'primary.main' }} />
                  <Box>
                    <Typography variant="body1" fontWeight="medium">
                      Private Key
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      For advanced users
                    </Typography>
                  </Box>
                </Box>
              </ToggleButton>
            </ToggleButtonGroup>
          </Paper>

          {/* Global Error Display - for non-backup types */}
          {(error && loginType !== 'backup') && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {/* Validation errors - show for all types */}
          {validationError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {validationError}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit}>
            {renderLoginForm()}

            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={isSubmitDisabled()}
              sx={{ mt: 3, mb: 2 }}
            >
              {loading ? (
                <>
                  <CircularProgress size={20} color="inherit" sx={{ mr: 1 }} />
                  Logging in...
                </>
              ) : (
                'Login'
              )}
            </Button>
          </Box>

          <Divider sx={{ my: 3 }}>
            <Typography variant="body2" color="text.secondary">
              OR
            </Typography>
          </Divider>

          {/* Create Account Section */}
          <Box textAlign="center">
            <Typography variant="h6" gutterBottom>
              New to Forknet?
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Create a new account with a secure seedphrase
            </Typography>
            <Button
              variant="outlined"
              size="large"
              onClick={() => setShowCreateDialog(true)}
              disabled={loading}
              sx={{ minWidth: 200 }}
            >
              Create New Account
            </Button>
          </Box>

          <Typography variant="caption" color="text.secondary" align="center" display="block" sx={{ mt: 3 }}>
            Make sure you're connecting to a trusted Forknet node
          </Typography>

          {/* Create Account Dialog */}
          <CreateAccountDialog
            open={showCreateDialog}
            onClose={() => setShowCreateDialog(false)}
          />
        </CardContent>
      </Card>
    </Box>
  );
};

export default LoginForm;