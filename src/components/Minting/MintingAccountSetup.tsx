import React, { useState, useEffect, useCallback } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Typography,
    Box,
    Alert,
    TextField,
    Stepper,
    Step,
    StepLabel,
    CircularProgress,
    Card,
    CardContent,
    useTheme,
    alpha,
    LinearProgress,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    IconButton,
    Chip,
} from '@mui/material';
import {
    AccountCircle,
    Check,
    CheckCircle,
    Build,
    Key,
    Person,
    Share,
    AutoMode,
    Add,
    Visibility,
    Delete,
    Refresh,
} from '@mui/icons-material';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { NodeApi, MintingAccount } from '../../services/nodeApi';

interface MintingAccountSetupProps {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

type SetupType = 'direct' | 'self-reward-share' | 'existing-key' | 'manage' | 'need-sponsorship' | 'sponsor-others';

const MintingAccountSetup: React.FC<MintingAccountSetupProps> = ({
    open,
    onClose,
    onSuccess
}) => {
    const theme = useTheme();
    const { account } = useSelector((state: RootState) => state.auth);

    const [currentStep, setCurrentStep] = useState(0);
    const [accountLevel, setAccountLevel] = useState<number | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [setupType, setSetupType] = useState<SetupType | null>(null);

    // Current minting accounts
    const [currentMintingAccounts, setCurrentMintingAccounts] = useState<MintingAccount[]>([]);
    const [loadingAccounts, setLoadingAccounts] = useState(false);

    // For direct minting and existing keys
    const [privateKey, setPrivateKey] = useState('');

    // For self-reward-share and sponsorship process
    const [processProgress, setProcessProgress] = useState<string[]>([]);
    const [rewardSharePrivateKey, setRewardSharePrivateKey] = useState('');
    const [transactionSignature, setTransactionSignature] = useState('');

    const getSteps = () => {
        if (setupType === 'manage') {
            return ['Check Account', 'Manage Minting Accounts'];
        }
        if (setupType === 'self-reward-share') {
            return ['Check Account', 'Choose Setup Type', 'Create Reward Share', 'Complete Setup'];
        }
        return ['Check Account', 'Choose Setup Type', 'Configuration', 'Complete Setup'];
    };

    const steps = getSteps();

    const loadCurrentMintingAccounts = useCallback(async () => {
        setLoadingAccounts(true);
        try {
            const accounts = await NodeApi.getMintingAccounts();
            setCurrentMintingAccounts(accounts);
        } catch (err: any) {
            console.warn('Could not fetch minting accounts:', err);
            setCurrentMintingAccounts([]);
        } finally {
            setLoadingAccounts(false);
        }
    }, []);

    const checkAccountLevel = useCallback(async () => {
        if (!account) return;

        setLoading(true);
        setError(null);

        try {
            const level = account.level || 0;
            setAccountLevel(level);

            // Load current minting accounts
            await loadCurrentMintingAccounts();

            setCurrentStep(1);
        } catch (err: any) {
            setError(`Failed to check account level: ${err.message}`);
        } finally {
            setLoading(false);
        }
    }, [account, loadCurrentMintingAccounts]);

    useEffect(() => {
        if (open && account && accountLevel === null) {
            checkAccountLevel();
        }
    }, [open, account, accountLevel, checkAccountLevel]);

    const addProgressStep = (step: string) => {
        setProcessProgress(prev => [...prev, step]);
    };

    const removeMintingAccount = async (publicKey: string) => {
        try {
            await NodeApi.removeMintingAccount(publicKey);
            await loadCurrentMintingAccounts(); // Refresh the list
            setSuccess('Minting account removed successfully');
        } catch (err: any) {
            setError(`Failed to remove minting account: ${err.message}`);
        }
    };

    const addExistingKey = async () => {
        if (!privateKey.trim()) {
            setError('Private key is required');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            await NodeApi.addMintingAccount(privateKey.trim());
            await loadCurrentMintingAccounts(); // Refresh the list
            setSuccess('✅ Existing key added successfully!');
            setPrivateKey('');
        } catch (err: any) {
            console.error('Add existing key error:', err);

            let errorMessage = 'Failed to add minting account';

            if (err.message?.includes('400')) {
                errorMessage = 'The node rejected your key. This usually means the key format is invalid or there\'s already a minting key for this account.';
            } else if (err.message?.includes('403')) {
                errorMessage = 'API key required. Please ensure your Forknet core is running with API access.';
            } else if (err.message) {
                errorMessage = `Failed to add minting account: ${err.message}`;
            }

            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const createSelfRewardShare = async () => {
        if (!account || !privateKey.trim()) {
            setError('Account information and private key are required');
            return;
        }

        // Enhanced validation
        if (accountLevel === null || accountLevel < 1) {
            setError('Self-minting requires Level 1 or higher. Your current level: ' + (accountLevel || 'Unknown'));
            return;
        }

        setLoading(true);
        setError(null);
        setProcessProgress([]);

        try {
            addProgressStep('🚀 Starting self-minting reward share creation...');
            addProgressStep(`📊 Account Level: ${accountLevel} (✅ Eligible for self-minting)`);
            addProgressStep(`👤 Account Address: ${account.address}`);
            addProgressStep(`🔑 Account Public Key: ${account.publicKey}`);

            // Step 1: Create self-minting reward share private key
            addProgressStep('🔑 Creating self-minting reward share private key...');

            const rewardShareData = {
                mintingAccountPrivateKey: privateKey.trim(),
                recipientAccountPublicKey: account.publicKey
            };

            addProgressStep(`🔧 API Call: POST /addresses/rewardsharekey`);

            const rewardShareResponse = await fetch('http://localhost:10391/addresses/rewardsharekey', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(rewardShareData)
            });

            if (!rewardShareResponse.ok) {
                const errorText = await rewardShareResponse.text();
                console.error('❌ Reward share creation failed:', errorText);
                throw new Error(`Failed to create self-reward share key: ${rewardShareResponse.status} - ${errorText}`);
            }

            const rewardSharePrivKey = await rewardShareResponse.text();
            setRewardSharePrivateKey(rewardSharePrivKey);
            addProgressStep('✅ Self-reward share private key created successfully');
            addProgressStep(`🔑 Generated key: ${rewardSharePrivKey.substring(0, 15)}...`);

            // Step 2: Convert to public key
            addProgressStep('🔄 Converting to public key...');
            addProgressStep(`🔧 API Call: POST /utils/publickey`);

            const publicKeyResponse = await fetch('http://localhost:10391/utils/publickey', {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain' },
                body: rewardSharePrivKey
            });

            if (!publicKeyResponse.ok) {
                const errorText = await publicKeyResponse.text();
                console.error('❌ Public key conversion failed:', errorText);
                throw new Error(`Failed to get public key: ${publicKeyResponse.status} - ${errorText}`);
            }

            const rewardSharePubKey = await publicKeyResponse.text();
            addProgressStep('✅ Self-reward share public key obtained');
            addProgressStep(`🔑 Public key: ${rewardSharePubKey.substring(0, 15)}...`);

            // Step 3: Get last reference for YOUR account
            addProgressStep('📋 Getting YOUR account reference...');
            addProgressStep(`🔧 API Call: GET /addresses/lastreference/${account.address}`);

            const referenceResponse = await fetch(`http://localhost:10391/addresses/lastreference/${account.address}`);

            if (!referenceResponse.ok) {
                const errorText = await referenceResponse.text();
                console.error('❌ Reference fetch failed:', errorText);
                throw new Error(`Failed to get YOUR account reference: ${referenceResponse.status} - ${errorText}`);
            }

            const reference = await referenceResponse.text();
            addProgressStep('✅ YOUR account reference obtained');
            addProgressStep(`📋 Reference: ${reference.substring(0, 15)}...`);

            // Step 4: Get timestamp
            addProgressStep('⏰ Getting current timestamp...');
            addProgressStep(`🔧 API Call: GET /utils/timestamp`);

            const timestampResponse = await fetch('http://localhost:10391/utils/timestamp');

            if (!timestampResponse.ok) {
                const errorText = await timestampResponse.text();
                console.error('❌ Timestamp fetch failed:', errorText);
                throw new Error(`Failed to get timestamp: ${timestampResponse.status} - ${errorText}`);
            }

            const timestamp = await timestampResponse.text();
            addProgressStep('✅ Timestamp obtained');
            addProgressStep(`⏰ Timestamp: ${timestamp}`);

            // Step 5: Create unsigned transaction (SELF-MINTING: you are both minter and recipient)
            addProgressStep('📝 Creating SELF-MINTING reward share transaction...');

            const transactionData = {
                timestamp: parseInt(timestamp),
                reference: reference,
                fee: "0.001",
                recipient: account.address,           // YOU are the recipient
                minterPublicKey: account.publicKey,   // YOU are also the minter
                rewardSharePublicKey: rewardSharePubKey,
                sharePercent: 0 // 0% means you keep all rewards
            };

            addProgressStep(`🔧 API Call: POST /addresses/rewardshare`);
            addProgressStep(`📝 Transaction data: recipient=${account.address.substring(0, 10)}... (YOU)`);
            addProgressStep(`📝 Transaction data: minter=${account.publicKey.substring(0, 10)}... (YOU)`);
            addProgressStep(`📝 Transaction data: sharePercent=0 (you keep 100% of rewards)`);

            const unsignedResponse = await fetch('http://localhost:10391/addresses/rewardshare', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(transactionData)
            });

            if (!unsignedResponse.ok) {
                const errorText = await unsignedResponse.text();
                console.error('❌ Unsigned transaction creation failed:', errorText);
                throw new Error(`Failed to create transaction: ${unsignedResponse.status} - ${errorText}`);
            }

            const unsignedTransaction = await unsignedResponse.text();
            addProgressStep('✅ Self-minting transaction created');
            addProgressStep(`📝 Unsigned transaction: ${unsignedTransaction.substring(0, 20)}...`);

            // Step 6: Sign transaction with YOUR private key
            addProgressStep('✍️ Signing transaction with YOUR private key...');
            addProgressStep(`🔧 API Call: POST /transactions/sign`);

            const signData = {
                privateKey: privateKey.trim(),
                transactionBytes: unsignedTransaction
            };

            const signedResponse = await fetch('http://localhost:10391/transactions/sign', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(signData)
            });

            if (!signedResponse.ok) {
                const errorText = await signedResponse.text();
                console.error('❌ Transaction signing failed:', errorText);
                throw new Error(`Failed to sign transaction: ${signedResponse.status} - ${errorText}`);
            }

            const signedTransaction = await signedResponse.text();
            addProgressStep('✅ Transaction signed with YOUR private key');
            addProgressStep(`✍️ Signed transaction: ${signedTransaction.substring(0, 20)}...`);

            // Step 7: Process transaction
            addProgressStep('📡 Broadcasting self-minting transaction to network...');
            addProgressStep(`🔧 API Call: POST /transactions/process`);

            const processResponse = await fetch('http://localhost:10391/transactions/process', {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain' },
                body: signedTransaction
            });

            if (!processResponse.ok) {
                const errorText = await processResponse.text();
                console.error('❌ Transaction processing failed:', errorText);
                throw new Error(`Failed to process transaction: ${processResponse.status} - ${errorText}`);
            }

            const txSignature = await processResponse.text();
            setTransactionSignature(txSignature);
            addProgressStep('✅ Self-minting transaction broadcasted successfully');
            addProgressStep(`📡 Transaction signature: ${txSignature.substring(0, 20)}...`);

            // Step 8: Add to minting accounts (with retry logic)
            addProgressStep('⚡ Adding self-reward share key to minting accounts...');
            addProgressStep(`🔧 API Call: POST /admin/mintingaccounts`);

            try {
                await NodeApi.addMintingAccount(rewardSharePrivKey);
                addProgressStep('✅ Self-reward share key added to minting accounts');
                addProgressStep('🎉 Self-minting setup complete! You can now mint blocks.');
                setSuccess('Self-minting reward share created successfully! You can now mint blocks with your own reward share.');
                await loadCurrentMintingAccounts(); // Refresh the list
            } catch (mintingError: any) {
                console.warn('Initial attempt to add minting account failed:', mintingError);
                addProgressStep('⚠️ Initial minting account add failed - transaction may need confirmation');

                addProgressStep('⏳ Waiting 10 seconds for transaction confirmation...');
                await new Promise(resolve => setTimeout(resolve, 10000));

                try {
                    addProgressStep('🔄 Retrying minting account addition...');
                    await NodeApi.addMintingAccount(rewardSharePrivKey);
                    addProgressStep('✅ Self-reward share key added to minting accounts (retry successful)');
                    addProgressStep('🎉 Self-minting setup complete! You can now mint blocks.');
                    setSuccess('Self-minting reward share created successfully! You can now mint blocks with your own reward share.');
                    await loadCurrentMintingAccounts(); // Refresh the list
                } catch (retryError: any) {
                    console.warn('Retry also failed:', retryError);
                    addProgressStep('⚠️ Automatic minting account addition failed');
                    addProgressStep('✅ Self-reward share transaction completed successfully');
                    addProgressStep('📝 Manual step: You can try adding this key manually:');
                    addProgressStep(`🔑 Key: ${rewardSharePrivKey}`);

                    setCurrentStep(3);
                    setSuccess('Self-reward share transaction completed! You may need to manually add the key to minting accounts once the transaction is confirmed.');
                    setError(null);
                }
            }

        } catch (err: any) {
            console.error('Self-reward share creation error:', err);
            addProgressStep(`❌ Error: ${err.message}`);

            // Provide specific guidance based on error type
            if (err.message.includes('400')) {
                setError(`API Error (400): ${err.message}\n\nThis usually means:\n• Your private key doesn't match your account\n• Your account level is insufficient\n• Invalid transaction data`);
            } else if (err.message.includes('403')) {
                setError(`API Error (403): ${err.message}\n\nThis usually means:\n• API key required for admin operations\n• Node authentication issue`);
            } else if (err.message.includes('500')) {
                setError(`Server Error (500): ${err.message}\n\nThis usually means:\n• Node internal error\n• Database issues\n• Node not fully synchronized`);
            } else {
                setError(`Self-minting creation failed: ${err.message}\n\nCheck the console for detailed logs.`);
            }
        } finally {
            setLoading(false);
            setCurrentStep(3);
        }
    };

    const validatePrivateKey = (key: string): boolean => {
        const trimmedKey = key.trim();

        if (trimmedKey.length < 40 || trimmedKey.length > 50) {
            setError('Private key should be between 40-50 characters long');
            return false;
        }

        const base58Regex = /^[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]+$/;
        if (!base58Regex.test(trimmedKey)) {
            setError('Private key contains invalid characters. Should only contain Base58 characters.');
            return false;
        }

        return true;
    };

    const handleDirectMinting = async () => {
        if (!privateKey.trim()) {
            setError('Private key is required');
            return;
        }

        if (!validatePrivateKey(privateKey)) {
            return;
        }

        setLoading(true);
        setError(null);

        try {
            await NodeApi.addMintingAccount(privateKey.trim());
            setSuccess('✅ Minting account added successfully!');
            await loadCurrentMintingAccounts(); // Refresh the list
            setCurrentStep(3);

        } catch (err: any) {
            console.error('Direct minting error:', err);

            let errorMessage = 'Failed to add minting account';

            if (err.message?.includes('400')) {
                errorMessage =
                    'The node rejected your private key (HTTP 400). This usually means:\n\n' +
                    '• The private key doesn\'t match your account address\n' +
                    '• The private key format is invalid\n' +
                    '• There\'s already a minting key for this account\n\n' +
                    'Double-check that this private key belongs to your account address:\n' +
                    account?.address;
            } else if (err.message?.includes('403')) {
                errorMessage = 'API key required. Please ensure your Forknet core is running with API access.';
            } else if (err.message) {
                errorMessage = `Failed to add minting account: ${err.message}`;
            }

            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setCurrentStep(0);
        setAccountLevel(null);
        setSetupType(null);
        setPrivateKey('');
        setRewardSharePrivateKey('');
        setTransactionSignature('');
        setProcessProgress([]);
        setCurrentMintingAccounts([]);
        setError(null);
        setSuccess(null);
        setLoading(false);
        onClose();
    };

    const renderCurrentMintingAccounts = () => (
        <Box sx={{ mb: 3 }}>
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                <Typography variant="h6">
                    Current Minting Accounts ({currentMintingAccounts.length})
                </Typography>
                <IconButton onClick={loadCurrentMintingAccounts} disabled={loadingAccounts}>
                    <Refresh />
                </IconButton>
            </Box>

            {loadingAccounts ? (
                <Box display="flex" justifyContent="center" py={2}>
                    <CircularProgress size={24} />
                </Box>
            ) : currentMintingAccounts.length === 0 ? (
                <Alert severity="info">
                    <Typography variant="body2">
                        No minting accounts found. You can add your first minting account using the options below.
                    </Typography>
                </Alert>
            ) : (
                <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>Minting Account</TableCell>
                                <TableCell>Recipient</TableCell>
                                <TableCell>Type</TableCell>
                                <TableCell>Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {currentMintingAccounts.map((account, index) => (
                                <TableRow key={index}>
                                    <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                                        {account.mintingAccount}
                                    </TableCell>
                                    <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                                        {account.recipientAccount}
                                    </TableCell>
                                    <TableCell>
                                        <Chip
                                            size="small"
                                            label={
                                                account.mintingAccount === account.recipientAccount ? 'Self-Minting' :
                                                    'Reward Share'
                                            }
                                            color={
                                                account.mintingAccount === account.recipientAccount ? 'primary' :
                                                    'secondary'
                                            }
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <IconButton
                                            size="small"
                                            color="error"
                                            onClick={() => removeMintingAccount(account.publicKey)}
                                        >
                                            <Delete />
                                        </IconButton>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}
        </Box>
    );

    const renderStepContent = () => {
        switch (currentStep) {
            case 0:
                return (
                    <Box textAlign="center">
                        <CircularProgress sx={{ mb: 2 }} />
                        <Typography>Checking your account level and minting accounts...</Typography>
                    </Box>
                );

            case 1:
                if (accountLevel === null) return null;

                if (setupType === 'manage') {
                    return (
                        <Box>
                            <Typography variant="h6" gutterBottom>
                                Manage Your Minting Accounts
                            </Typography>

                            {renderCurrentMintingAccounts()}

                            <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
                                Add Minting Key
                            </Typography>

                            <TextField
                                fullWidth
                                label="Minting Key"
                                variant="outlined"
                                value={privateKey}
                                onChange={(e) => setPrivateKey(e.target.value)}
                                placeholder="Paste your minting key here"
                                multiline
                                maxRows={3}
                                helperText="This could be a sponsorship key someone created for you, or your own minting key"
                                sx={{
                                    mb: 2,
                                    '& .MuiInputBase-input': {
                                        fontFamily: 'monospace',
                                        fontSize: '0.9rem'
                                    }
                                }}
                            />

                            <Button
                                variant="contained"
                                onClick={addExistingKey}
                                disabled={loading || !privateKey.trim()}
                                startIcon={<Add />}
                            >
                                {loading ? 'Adding...' : 'Add Minting Key'}
                            </Button>
                        </Box>
                    );
                }

                // Level 0 User Experience - Simple and Clear
                if (accountLevel === 0 && !setupType) {
                    return (
                        <Box>
                            <Alert severity="info" sx={{ mb: 3 }}>
                                <Typography variant="body2">
                                    <strong>Welcome to Forknet!</strong><br />
                                    New accounts need sponsorship to start minting blocks. Once you reach Level 1 (after 10 blocks),
                                    you can create your own minting keys.
                                </Typography>
                            </Alert>

                            {renderCurrentMintingAccounts()}

                            <Card
                                variant="outlined"
                                sx={{
                                    mb: 2,
                                    border: `2px solid ${alpha(theme.palette.primary.main, 0.3)}`,
                                    cursor: 'pointer',
                                    '&:hover': {
                                        borderColor: theme.palette.primary.main,
                                        backgroundColor: alpha(theme.palette.primary.main, 0.05)
                                    }
                                }}
                                onClick={() => setSetupType('manage')}
                            >
                                <CardContent>
                                    <Box display="flex" alignItems="center" gap={2} mb={2}>
                                        <Box
                                            sx={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                width: 40,
                                                height: 40,
                                                borderRadius: '50%',
                                                bgcolor: alpha(theme.palette.primary.main, 0.1),
                                                color: theme.palette.primary.main,
                                            }}
                                        >
                                            <Key sx={{ fontSize: 20 }} />
                                        </Box>
                                        <Typography variant="h6" color="primary.dark" sx={{ fontWeight: 'bold' }}>
                                            🎯 I Have a Sponsorship Key
                                        </Typography>
                                    </Box>
                                    <Typography variant="body2" sx={{ mb: 1 }}>
                                        • <strong>Someone Helped You:</strong> Another user created a sponsorship key for you
                                    </Typography>
                                    <Typography variant="body2" sx={{ mb: 1 }}>
                                        • <strong>Ready to Use:</strong> Just paste the key and start minting
                                    </Typography>
                                    <Typography variant="body2">
                                        • <strong>Most Common:</strong> This is how most new users get started
                                    </Typography>
                                </CardContent>
                            </Card>

                            <Card
                                variant="outlined"
                                sx={{
                                    mb: 2,
                                    border: `2px solid ${alpha(theme.palette.info.main, 0.3)}`,
                                    cursor: 'pointer',
                                    '&:hover': {
                                        borderColor: theme.palette.info.main,
                                        backgroundColor: alpha(theme.palette.info.main, 0.05)
                                    }
                                }}
                                onClick={() => setSetupType('need-sponsorship')}
                            >
                                <CardContent>
                                    <Box display="flex" alignItems="center" gap={2} mb={2}>
                                        <Box
                                            sx={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                width: 40,
                                                height: 40,
                                                borderRadius: '50%',
                                                bgcolor: alpha(theme.palette.info.main, 0.1),
                                                color: theme.palette.info.main,
                                            }}
                                        >
                                            <Person sx={{ fontSize: 20 }} />
                                        </Box>
                                        <Typography variant="h6" color="info.dark" sx={{ fontWeight: 'bold' }}>
                                            🤝 I Need Sponsorship
                                        </Typography>
                                    </Box>
                                    <Typography variant="body2" sx={{ mb: 1 }}>
                                        • <strong>New to Forknet:</strong> Get help from existing Level 1+ users
                                    </Typography>
                                    <Typography variant="body2" sx={{ mb: 1 }}>
                                        • <strong>Community Support:</strong> Ask in chat or forums for sponsorship
                                    </Typography>
                                    <Typography variant="body2">
                                        • <strong>Alternative:</strong> Wait to reach Level 1, then create your own keys
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Box>
                    );
                }

                // Level 1+ User Experience - Empowered Options
                else if (accountLevel && accountLevel >= 1 && !setupType) {
                    return (
                        <Box>
                            <Alert severity="success" sx={{ mb: 3 }}>
                                <Typography variant="body2">
                                    <strong>🎉 Level {accountLevel} Account - Full Minting Access</strong><br />
                                    You can create your own minting keys and help sponsor other users!
                                </Typography>
                            </Alert>

                            {renderCurrentMintingAccounts()}

                            <Card
                                variant="outlined"
                                sx={{
                                    mb: 2,
                                    border: `2px solid ${alpha(theme.palette.success.main, 0.3)}`,
                                    cursor: 'pointer',
                                    '&:hover': {
                                        borderColor: theme.palette.success.main,
                                        backgroundColor: alpha(theme.palette.success.main, 0.05)
                                    }
                                }}
                                onClick={() => setSetupType('self-reward-share')}
                            >
                                <CardContent>
                                    <Box display="flex" alignItems="center" gap={2} mb={2}>
                                        <Box
                                            sx={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                width: 40,
                                                height: 40,
                                                borderRadius: '50%',
                                                bgcolor: alpha(theme.palette.success.main, 0.1),
                                                color: theme.palette.success.main,
                                            }}
                                        >
                                            <AutoMode sx={{ fontSize: 20 }} />
                                        </Box>
                                        <Typography variant="h6" color="success.dark" sx={{ fontWeight: 'bold' }}>
                                            🎯 Create My Own Minting Key
                                        </Typography>
                                    </Box>
                                    <Typography variant="body2" sx={{ mb: 1 }}>
                                        • <strong>Recommended:</strong> Most secure and independent option
                                    </Typography>
                                    <Typography variant="body2" sx={{ mb: 1 }}>
                                        • <strong>Full Control:</strong> You control the key and earn all rewards
                                    </Typography>
                                    <Typography variant="body2">
                                        • <strong>Best Practice:</strong> Preferred method for Level 1+ accounts
                                    </Typography>
                                </CardContent>
                            </Card>

                            <Card
                                variant="outlined"
                                sx={{
                                    mb: 2,
                                    border: `2px solid ${alpha(theme.palette.primary.main, 0.3)}`,
                                    cursor: 'pointer',
                                    '&:hover': {
                                        borderColor: theme.palette.primary.main,
                                        backgroundColor: alpha(theme.palette.primary.main, 0.05)
                                    }
                                }}
                                onClick={() => setSetupType('sponsor-others')}
                            >
                                <CardContent>
                                    <Box display="flex" alignItems="center" gap={2} mb={2}>
                                        <Box
                                            sx={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                width: 40,
                                                height: 40,
                                                borderRadius: '50%',
                                                bgcolor: alpha(theme.palette.primary.main, 0.1),
                                                color: theme.palette.primary.main,
                                            }}
                                        >
                                            <Share sx={{ fontSize: 20 }} />
                                        </Box>
                                        <Typography variant="h6" color="primary.dark" sx={{ fontWeight: 'bold' }}>
                                            🤝 Sponsor Someone Else
                                        </Typography>
                                    </Box>
                                    <Typography variant="body2" sx={{ mb: 1 }}>
                                        • <strong>Help Others:</strong> Create sponsorship keys for Level 0 users
                                    </Typography>
                                    <Typography variant="body2" sx={{ mb: 1 }}>
                                        • <strong>Community Growth:</strong> Help grow the Forknet network
                                    </Typography>
                                    <Typography variant="body2">
                                        • <strong>Share Keys:</strong> Give the generated key to the person you're helping
                                    </Typography>
                                </CardContent>
                            </Card>

                            <Card
                                variant="outlined"
                                sx={{
                                    mb: 2,
                                    border: `2px solid ${alpha(theme.palette.grey[500], 0.3)}`,
                                    cursor: 'pointer',
                                    '&:hover': {
                                        borderColor: theme.palette.grey[500],
                                        backgroundColor: alpha(theme.palette.grey[500], 0.05)
                                    }
                                }}
                                onClick={() => setSetupType('manage')}
                            >
                                <CardContent>
                                    <Box display="flex" alignItems="center" gap={2} mb={2}>
                                        <Box
                                            sx={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                width: 40,
                                                height: 40,
                                                borderRadius: '50%',
                                                bgcolor: alpha(theme.palette.grey[500], 0.1),
                                                color: theme.palette.grey[700],
                                            }}
                                        >
                                            <Visibility sx={{ fontSize: 20 }} />
                                        </Box>
                                        <Typography variant="h6" color="text.primary" sx={{ fontWeight: 'bold' }}>
                                            🔧 Manage Existing Keys
                                        </Typography>
                                    </Box>
                                    <Typography variant="body2" sx={{ mb: 1 }}>
                                        • <strong>Add Keys:</strong> Use sponsorship keys others created for you
                                    </Typography>
                                    <Typography variant="body2" sx={{ mb: 1 }}>
                                        • <strong>Remove Keys:</strong> Clean up old or unused minting accounts
                                    </Typography>
                                    <Typography variant="body2">
                                        • <strong>Multiple Keys:</strong> Add multiple minting keys for increased chances
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Box>
                    );
                }

                // Handle specific setup types (add cases for new ones)
                else if (setupType === 'need-sponsorship') {
                    return (
                        <Box>
                            <Typography variant="h6" gutterBottom>
                                How to Get Sponsorship
                            </Typography>

                            <Alert severity="info" sx={{ mb: 3 }}>
                                <Typography variant="body2">
                                    <strong>You need a Level 1+ user to create a sponsorship key for you.</strong><br />
                                    Here's how to get help:
                                </Typography>
                            </Alert>

                            <Paper sx={{ p: 3, mb: 3 }}>
                                <Typography variant="h6" gutterBottom>
                                    📋 Information to Share
                                </Typography>
                                <Typography variant="body2" gutterBottom>
                                    When asking for sponsorship, provide this information:
                                </Typography>
                                <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
                                    <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.9rem' }}>
                                        My Address: {account?.address}<br />
                                        My Public Key: {account?.publicKey}
                                    </Typography>
                                </Box>
                            </Paper>

                            <Typography variant="h6" gutterBottom>
                                💡 Ways to Get Sponsorship
                            </Typography>

                            <Box sx={{ mb: 2 }}>
                                <Typography variant="body1" sx={{ fontWeight: 'bold', mb: 1 }}>
                                    1. Ask in Community Channels
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Post in Forknet chat, Discord, or forums asking for sponsorship
                                </Typography>
                            </Box>

                            <Box sx={{ mb: 2 }}>
                                <Typography variant="body1" sx={{ fontWeight: 'bold', mb: 1 }}>
                                    2. Find a Friend with Level 1+
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Ask someone you know who already uses Forknet
                                </Typography>
                            </Box>

                            <Box sx={{ mb: 2 }}>
                                <Typography variant="body1" sx={{ fontWeight: 'bold', mb: 1 }}>
                                    3. Wait and Level Up Naturally
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    After 10 blocks (Level 1), you can create your own minting keys
                                </Typography>
                            </Box>

                            <Alert severity="success" sx={{ mt: 3 }}>
                                <Typography variant="body2">
                                    <strong>Once you get a sponsorship key:</strong><br />
                                    Come back here, choose "I Have a Sponsorship Key", and paste the key they give you!
                                </Typography>
                            </Alert>
                        </Box>
                    );
                }

                // Add new case for sponsor-others
                else if (setupType === 'sponsor-others') {
                    return (
                        <Box>
                            <Typography variant="h6" gutterBottom>
                                Sponsor a Level 0 User
                            </Typography>

                            <Alert severity="info" sx={{ mb: 3 }}>
                                <Typography variant="body2">
                                    Help someone new get started by creating a sponsorship key for them.
                                    They need to provide you their address or public key.
                                </Typography>
                            </Alert>

                            <TextField
                                fullWidth
                                label="Their Address or Public Key"
                                variant="outlined"
                                value={privateKey}
                                onChange={(e) => setPrivateKey(e.target.value)}
                                placeholder="Enter the Level 0 user's address or public key"
                                helperText="They can find this in their account information"
                                sx={{ mb: 2 }}
                            />

                            <Alert severity="warning" sx={{ mb: 2 }}>
                                <Typography variant="body2">
                                    <strong>Note:</strong> You can only create a limited number of sponsorship keys.
                                    Make sure you trust the person you're sponsoring.
                                </Typography>
                            </Alert>

                            <Button
                                variant="contained"
                                onClick={() => {
                                    // TODO: Implement sponsor-others logic
                                    setError('Sponsoring others feature coming soon!');
                                }}
                                disabled={loading || !privateKey.trim()}
                                startIcon={<Share />}
                            >
                                {loading ? 'Creating Sponsorship...' : 'Create Sponsorship Key'}
                            </Button>
                        </Box>
                    );
                }

                break;

            case 2:
                if (setupType === 'self-reward-share') {
                    return (
                        <Box>
                            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Build color="primary" />
                                {setupType === 'self-reward-share' ? 'Creating Self-Minting Reward Share' : 'Creating Sponsorship Key'}
                            </Typography>

                            {loading && (
                                <Box sx={{ mb: 3 }}>
                                    <LinearProgress />
                                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                        Processing {setupType === 'self-reward-share' ? 'self-minting' : 'sponsorship'} setup... This may take a moment.
                                    </Typography>
                                </Box>
                            )}

                            <Paper sx={{ p: 2, mb: 2, maxHeight: 300, overflow: 'auto' }}>
                                {processProgress.map((step, index) => (
                                    <Typography
                                        key={index}
                                        variant="body2"
                                        sx={{
                                            fontFamily: 'monospace',
                                            fontSize: '0.85rem',
                                            mb: 0.5,
                                            color: step.includes('❌') ? 'error.main' :
                                                step.includes('✅') ? 'success.main' : 'text.primary'
                                        }}
                                    >
                                        {step}
                                    </Typography>
                                ))}
                            </Paper>

                            {rewardSharePrivateKey && (
                                <Alert severity="success" sx={{ mb: 2 }}>
                                    <Typography variant="body2" gutterBottom>
                                        <strong>{setupType === 'self-reward-share' ? 'Self-Minting' : 'Sponsorship'} Key Created:</strong>
                                    </Typography>
                                    <Typography
                                        variant="body2"
                                        sx={{
                                            fontFamily: 'monospace',
                                            fontSize: '0.8rem',
                                            wordBreak: 'break-all',
                                            backgroundColor: 'rgba(255,255,255,0.2)',
                                            p: 1,
                                            borderRadius: 1,
                                            mt: 1
                                        }}
                                    >
                                        {rewardSharePrivateKey}
                                    </Typography>
                                </Alert>
                            )}

                            {transactionSignature && (
                                <Alert severity="info" sx={{ mb: 2 }}>
                                    <Typography variant="body2" gutterBottom>
                                        <strong>Transaction Processed:</strong>
                                    </Typography>
                                    <Typography
                                        variant="body2"
                                        sx={{
                                            fontFamily: 'monospace',
                                            fontSize: '0.8rem',
                                            wordBreak: 'break-all'
                                        }}
                                    >
                                        {transactionSignature}
                                    </Typography>
                                </Alert>
                            )}
                        </Box>
                    );
                }
                return null;

            case 3:
                return (
                    <Box textAlign="center">
                        {success ? (
                            <>
                                <Check color="success" sx={{ fontSize: 48, mb: 2 }} />
                                <Typography variant="h6" color="success.main" gutterBottom>
                                    {success}
                                </Typography>

                                {setupType === 'self-reward-share' && !success.includes('manually add') && (
                                    <Alert severity="info" sx={{ mt: 2, textAlign: 'left' }}>
                                        <Typography variant="body2" gutterBottom>
                                            <strong>Self-Minting Active:</strong>
                                        </Typography>
                                        <Typography variant="body2" component="div">
                                            • Your self-minting reward share is now active<br />
                                            • You control both the minting key and receive all rewards<br />
                                            • This is more secure than using your main private key directly<br />
                                            • You can monitor your minting activity in the Node Management section
                                        </Typography>
                                    </Alert>
                                )}

                                {setupType === 'direct' && (
                                    <Alert severity="info" sx={{ mt: 2, textAlign: 'left' }}>
                                        <Typography variant="body2" gutterBottom>
                                            <strong>Direct Minting Active:</strong>
                                        </Typography>
                                        <Typography variant="body2" component="div">
                                            • Your private key is now active for block minting<br />
                                            • You have full control over your minting process<br />
                                            • Block rewards will go directly to your account<br />
                                            • Monitor your minting activity in the Node Management section
                                        </Typography>
                                    </Alert>
                                )}

                                <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                                    You can now participate in Forknet block minting!
                                </Typography>
                            </>
                        ) : (
                            <Box>
                                <CircularProgress sx={{ mb: 2 }} />
                                <Typography>Completing setup...</Typography>
                            </Box>
                        )}
                    </Box>
                );

            default:
                return null;
        }
    };

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="lg" fullWidth>
            <DialogTitle>
                <Box display="flex" alignItems="center" gap={1}>
                    <AccountCircle />
                    <Typography variant="h6">Setup Forknet Testnet Minting</Typography>
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
                {error && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {error}
                    </Alert>
                )}

                {renderStepContent()}
            </DialogContent>

            <DialogActions>
                <Button onClick={handleClose} disabled={loading}>
                    {success ? 'Close' : 'Cancel'}
                </Button>

                {/* Back button for non-manage flows */}
                {currentStep === 1 && setupType && setupType !== 'manage' && (
                    <Button
                        onClick={() => setSetupType(null)}
                        disabled={loading}
                    >
                        Back to Options
                    </Button>
                )}

                {/* Show Complete button when successful */}
                {success && currentStep === 3 && (
                    <Button
                        variant="contained"
                        color="success"
                        onClick={() => {
                            onSuccess();
                            handleClose();
                        }}
                        startIcon={<CheckCircle />}
                    >
                        Complete Setup
                    </Button>
                )}

                {/* Self-reward-share button */}
                {currentStep === 1 && setupType === 'self-reward-share' && (
                    <Button
                        variant="contained"
                        onClick={() => {
                            setCurrentStep(2);
                            createSelfRewardShare();
                        }}
                        disabled={loading || !privateKey.trim()}
                        color="primary"
                    >
                        {loading ? 'Creating...' : 'Create Self-Minting Key'}
                    </Button>
                )}

                {/* Direct minting button */}
                {currentStep === 1 && setupType === 'direct' && (
                    <Button
                        variant="contained"
                        onClick={handleDirectMinting}
                        disabled={loading || !privateKey.trim()}
                        color="warning"
                    >
                        {loading ? 'Adding Account...' : 'Add Minting Account'}
                    </Button>
                )}
            </DialogActions>
        </Dialog>
    );
};

export default MintingAccountSetup;