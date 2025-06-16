import api from "./api";

// Transaction types from the API
export const TRANSACTION_TYPES = [
  'GENESIS', 'PAYMENT', 'REGISTER_NAME', 'UPDATE_NAME', 'SELL_NAME', 
  'CANCEL_SELL_NAME', 'BUY_NAME', 'CREATE_POLL', 'VOTE_ON_POLL', 
  'ARBITRARY', 'ISSUE_ASSET', 'TRANSFER_ASSET', 'CREATE_ASSET_ORDER', 
  'CANCEL_ASSET_ORDER', 'MULTI_PAYMENT', 'DEPLOY_AT', 'MESSAGE', 
  'CHAT', 'PUBLICIZE', 'AIRDROP', 'AT', 'CREATE_GROUP', 'UPDATE_GROUP', 
  'ADD_GROUP_ADMIN', 'REMOVE_GROUP_ADMIN', 'GROUP_BAN', 'CANCEL_GROUP_BAN', 
  'GROUP_KICK', 'GROUP_INVITE', 'CANCEL_GROUP_INVITE', 'JOIN_GROUP', 
  'LEAVE_GROUP', 'GROUP_APPROVAL', 'SET_GROUP', 'UPDATE_ASSET', 
  'ACCOUNT_FLAGS', 'ENABLE_FORGING', 'REWARD_SHARE', 'ACCOUNT_LEVEL', 
  'TRANSFER_PRIVS', 'PRESENCE'
] as const;

export type TransactionType = typeof TRANSACTION_TYPES[number];
export type ConfirmationStatus = 'CONFIRMED' | 'UNCONFIRMED' | 'BOTH';

export interface TransactionSearchParams {
  startBlock?: number;
  blockLimit?: number;
  txGroupId?: number;
  txType?: TransactionType[];
  address?: string;
  confirmationStatus: ConfirmationStatus;
  limit?: number;
  offset?: number;
  reverse?: boolean;
}

// Updated interface to match actual API response
export interface TransactionData {
  signature: string;
  type?: string;
  txType?: string;
  creatorAddress: string;
  blockHeight?: number;
  timestamp: number;
  fee?: number;
  approvalStatus?: string;
  reference?: string;
  txGroupId?: number;
  recipient?: string;
  // REWARD_SHARE specific fields
  minterPublicKey?: string;
  rewardSharePublicKey?: string;
  sharePercent?: string;
  // Add other transaction fields as needed
}

export class ExplorerApi {
  static async searchTransactions(params: TransactionSearchParams): Promise<TransactionData[]> {
    try {
      const queryParams = new URLSearchParams();
      
      // Add all parameters to query
      if (params.startBlock) queryParams.append('startBlock', params.startBlock.toString());
      if (params.blockLimit) queryParams.append('blockLimit', params.blockLimit.toString());
      if (params.txGroupId) queryParams.append('txGroupId', params.txGroupId.toString());
      if (params.txType && params.txType.length > 0) {
        params.txType.forEach(type => queryParams.append('txType', type));
      }
      if (params.address) queryParams.append('address', params.address);
      queryParams.append('confirmationStatus', params.confirmationStatus);
      if (params.limit) queryParams.append('limit', params.limit.toString());
      if (params.offset) queryParams.append('offset', params.offset.toString());
      if (params.reverse !== undefined) queryParams.append('reverse', params.reverse.toString());
      
      const response = await api.get(`/transactions/search?${queryParams.toString()}`);
      
      // Log first transaction to see structure
      if (response.data && response.data.length > 0) {

      }
      
      // Transform the response to normalize the type field
      const normalizedData = response.data.map((tx: any) => ({
        ...tx,
        // Ensure we have txType field for backwards compatibility
        txType: tx.type || tx.txType
      }));
      
      return normalizedData;
    } catch (error: any) {
      console.error('❌ API Error:', error);
      throw new Error(`Failed to search transactions: ${error.message}`);
    }
  }

  static async getTransaction(signature: string): Promise<TransactionData> {
    try {
      const response = await api.get(`/transactions/${signature}`);
      
      // Normalize the response
      const normalizedData = {
        ...response.data,
        txType: response.data.type || response.data.txType
      };
      
      return normalizedData;
    } catch (error: any) {
      throw new Error(`Failed to get transaction: ${error.message}`);
    }
  }

  static formatTransactionType(txType: string | undefined | null): string {
    // Handle undefined, null, or empty transaction types
    if (!txType || typeof txType !== 'string') {
      return 'Unknown';
    }
    
    try {
      return txType.split('_').map(word => 
        word.charAt(0) + word.slice(1).toLowerCase()
      ).join(' ');
    } catch (error) {
      console.warn('Error formatting transaction type:', txType, error);
      return txType; // Return original if formatting fails
    }
  }

  static formatTimestamp(timestamp: number | undefined): string {
    if (!timestamp || isNaN(timestamp)) {
      return 'Unknown';
    }
    
    try {
      return new Date(timestamp).toLocaleString();
    } catch (error) {
      console.warn('Error formatting timestamp:', timestamp, error);
      return 'Invalid Date';
    }
  }

  static formatAddress(address: string | undefined): string {
    if (!address || typeof address !== 'string' || address.length < 16) {
      return 'Invalid Address';
    }
    
    try {
      return `${address.slice(0, 8)}...${address.slice(-8)}`;
    } catch (error) {
      console.warn('Error formatting address:', address, error);
      return address;
    }
  }
}