import { BalanceInfo } from '../services/balanceService';

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
    balanceInfo: BalanceInfo | null;
    balanceLoading: boolean;
    balanceError: string | null;
    lastBalanceUpdate: number | null;
}