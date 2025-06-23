import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { AuthState, Account, LoginCredentials } from "../../types/auth";
import { ForknetApi } from "../../services/forknetApi";
import { BalanceService } from "../../services/balanceService";
import { STORAGE_KEYS } from "../../utils/constants";

const initialState: AuthState = {
  isAuthenticated: false,
  account: null,
  privateKey: null,
  loading: false,
  error: null,
  balanceInfo: null,
  balanceLoading: false,
  balanceError: null,
  lastBalanceUpdate: null,
};

// Helper function to process login after getting private key
const processLogin = async (privateKey: string) => {
  // Step 1: Get public key from private key
  const publicKey = await ForknetApi.getPublicKeyFromPrivate(privateKey);

  // Step 2: Get address from public key
  const address = await ForknetApi.getAddressFromPublicKey(publicKey);

  // Step 3: Try to validate the address and get account info
  try {
    const isValid = await ForknetApi.validateAddress(address);
    if (!isValid) {
      throw new Error("Invalid address format");
    }

    // Try to get account info from the network
    const accountData = await ForknetApi.getAccountInfo(address);
    const balance = await ForknetApi.getBalance(address);

    const account: Account = {
      address,
      publicKey,
      balance,
      level: accountData.level,
    };

    // Store in localStorage
    localStorage.setItem(STORAGE_KEYS.PRIVATE_KEY, privateKey);
    localStorage.setItem(STORAGE_KEYS.ACCOUNT, JSON.stringify(account));

    return { account, privateKey };
  } catch (error: any) {
    // If account doesn't exist on network (404 error), treat as new account
    if (
      error.message.includes("404") ||
      error.message.includes("Not Found") ||
      error.message.includes("Failed to fetch account information")
    ) {
      // Create account object with default values for new account
      const account: Account = {
        address,
        publicKey,
        balance: 0, // New accounts start with 0 balance
        level: 0, // New accounts start at level 0
      };

      // Store in localStorage
      localStorage.setItem(STORAGE_KEYS.PRIVATE_KEY, privateKey);
      localStorage.setItem(STORAGE_KEYS.ACCOUNT, JSON.stringify(account));

      return { account, privateKey };
    }

    // For other errors, re-throw them
    throw error;
  }
};

// Helper function to process new account creation (doesn't require network validation)
const processNewAccount = async (privateKey: string) => {
  // Step 1: Get public key from private key
  const publicKey = await ForknetApi.getPublicKeyFromPrivate(privateKey);

  // Step 2: Get address from public key
  const address = await ForknetApi.getAddressFromPublicKey(publicKey);

  // Step 3: Create account object with default values for new account
  const account: Account = {
    address,
    publicKey,
    balance: 0, // New accounts start with 0 balance
    level: 0, // New accounts start at level 0
  };

  // Store in localStorage
  localStorage.setItem(STORAGE_KEYS.PRIVATE_KEY, privateKey);
  localStorage.setItem(STORAGE_KEYS.ACCOUNT, JSON.stringify(account));

  return { account, privateKey };
};

// Async thunk for login with private key
export const loginWithPrivateKey = createAsyncThunk(
  "auth/loginWithPrivateKey",
  async (credentials: LoginCredentials, { rejectWithValue }) => {
    try {
      const { privateKey } = credentials;
      if (!privateKey) throw new Error("Private key is required");

      return await processLogin(privateKey);
    } catch (error: any) {
      return rejectWithValue(error.message || "Login failed");
    }
  }
);

// Async thunk for login with seedphrase
export const loginWithSeedphrase = createAsyncThunk(
  "auth/loginWithSeedphrase",
  async (credentials: { seedphrase: string }, { rejectWithValue }) => {
    try {
      const { seedphrase } = credentials;

      // Validate seedphrase format
      const words = seedphrase.trim().split(/\s+/);
      if (words.length < 12 || words.length > 24) {
        throw new Error("Seedphrase must be between 12 and 24 words");
      }

      // Convert seedphrase to private key
      const privateKey = await ForknetApi.seedphraseToPrivateKey(seedphrase);

      return await processLogin(privateKey);
    } catch (error: any) {
      return rejectWithValue(error.message || "Seedphrase login failed");
    }
  }
);

// Async thunk for login with backup file
export const loginWithBackupFile = createAsyncThunk(
  "auth/loginWithBackupFile",
  async (
    credentials: { fileContent: string; password: string },
    { rejectWithValue }
  ) => {
    try {
      const { fileContent, password } = credentials;

      // Parse the backup file
      let backupData;
      try {
        backupData = JSON.parse(fileContent);
      } catch (e) {
        throw new Error("Invalid backup file format - not valid JSON");
      }

      // Validate required fields
      const requiredFields = [
        "address0",
        "salt",
        "iv",
        "version",
        "encryptedSeed",
        "mac",
        "kdfThreads",
      ];

      for (const field of requiredFields) {
        if (!(field in backupData)) {
          throw new Error(`Invalid backup file: missing ${field}`);
        }
      }

      // Extract private key from backup with password
      const privateKey = await ForknetApi.extractPrivateKeyFromBackup(
        backupData,
        password
      );

      if (!privateKey) {
        throw new Error(
          "Failed to decrypt backup file - please check your password"
        );
      }

      return await processLogin(privateKey);
    } catch (error: any) {
      // Provide more specific error messages
      let errorMessage = error.message || "Backup file login failed";

      if (error.message && error.message.includes("Invalid password")) {
        errorMessage = "Invalid password or corrupted backup file";
      } else if (
        error.message &&
        error.message.includes("MAC verification failed")
      ) {
        errorMessage =
          "Incorrect password. Please verify you entered the correct backup password.";
      } else if (error.message && error.message.includes("missing")) {
        errorMessage =
          "Invalid backup file format. Please ensure you selected a valid Forknet backup file.";
      }

      return rejectWithValue(errorMessage);
    }
  }
);

// Async thunk for creating a new account
export const createAccount = createAsyncThunk(
  "auth/createAccount",
  async (credentials: { seedphrase: string }, { rejectWithValue }) => {
    try {
      const { seedphrase } = credentials;

      // Validate seedphrase format
      const words = seedphrase.trim().split(/\s+/);
      if (words.length < 12 || words.length > 24) {
        throw new Error("Seedphrase must be between 12 and 24 words");
      }

      // Convert seedphrase to private key
      const privateKey = await ForknetApi.seedphraseToPrivateKey(seedphrase);

      // Process as new account (doesn't require network validation)
      return await processNewAccount(privateKey);
    } catch (error: any) {
      return rejectWithValue(error.message || "Account creation failed");
    }
  }
);

// Async thunk for logout
export const logout = createAsyncThunk("auth/logout", async () => {
  localStorage.removeItem(STORAGE_KEYS.PRIVATE_KEY);
  localStorage.removeItem(STORAGE_KEYS.ACCOUNT);
});

// Async thunk for fetching balance
export const fetchAccountBalance = createAsyncThunk(
  "auth/fetchAccountBalance",
  async (address: string, { rejectWithValue }) => {
    try {
      const balanceInfo = await BalanceService.getAccountBalance(address);
      return { balanceInfo, timestamp: Date.now() };
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to fetch balance");
    }
  }
);

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearAuthOnClose: (state) => {
      state.isAuthenticated = false;
      state.account = null;
      state.privateKey = null;
      state.error = null;
      state.loading = false;
    },
  },
  extraReducers: (builder) => {
    // Helper function to handle fulfilled login cases
    const handleLoginFulfilled = (state: AuthState, action: any) => {
      state.loading = false;
      state.isAuthenticated = true;
      state.account = action.payload.account;
      state.privateKey = action.payload.privateKey;
      state.error = null;
    };

    // Helper function to handle rejected login cases
    const handleLoginRejected = (state: AuthState, action: any) => {
      state.loading = false;
      state.error = action.payload as string;
    };

    builder
      // Login with private key
      .addCase(loginWithPrivateKey.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginWithPrivateKey.fulfilled, handleLoginFulfilled)
      .addCase(loginWithPrivateKey.rejected, handleLoginRejected)

      // Login with seedphrase
      .addCase(loginWithSeedphrase.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginWithSeedphrase.fulfilled, handleLoginFulfilled)
      .addCase(loginWithSeedphrase.rejected, handleLoginRejected)

      // Login with backup file
      .addCase(loginWithBackupFile.pending, (state) => {
        state.loading = true;
      })
      .addCase(loginWithBackupFile.fulfilled, (state, action) => {
        state.loading = false;
        state.isAuthenticated = true;
        state.account = action.payload.account;
        state.privateKey = action.payload.privateKey;
        state.error = null;
      })
      .addCase(loginWithBackupFile.rejected, (state, action) => {
        state.loading = false;
      })

      // Create account
      .addCase(createAccount.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createAccount.fulfilled, handleLoginFulfilled)
      .addCase(createAccount.rejected, handleLoginRejected)

      // Logout
      .addCase(logout.fulfilled, (state) => {
        state.isAuthenticated = false;
        state.account = null;
        state.privateKey = null;
        state.error = null;
      })

      // Balance
      .addCase(fetchAccountBalance.pending, (state) => {
        state.balanceLoading = true;
        state.balanceError = null;
      })
      .addCase(fetchAccountBalance.fulfilled, (state, action) => {
        state.balanceLoading = false;
        state.balanceInfo = action.payload.balanceInfo;
        state.lastBalanceUpdate = action.payload.timestamp;
        state.balanceError = null;
      })
      .addCase(fetchAccountBalance.rejected, (state, action) => {
        state.balanceLoading = false;
        state.balanceError = action.payload as string;
      });
  },
});

export const { clearError, clearAuthOnClose } = authSlice.actions;
export default authSlice.reducer;
