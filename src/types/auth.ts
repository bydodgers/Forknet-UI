export interface LoginCredentials {
    privateKey: string;
}

export interface Account {
    address: string;
    publicKey: string;
    balance?: number;
    level?: number;
}

export interface AuthState {
    isAuthenticated: boolean;
    account: Account | null;
    privateKey: string | null;
    loading: boolean;
    error: string | null;
}