// Update this to your Forknet node's API endpoint
export const FORKNET_API_BASE = 'http://localhost:10391';

export const ROUTES = {
  LOGIN: '/login',
  DASHBOARD: '/dashboard',
  WALLET: '/wallet',
  MINTING: '/minting',
  NODE_MANAGEMENT: '/node-management',
  EXPLORER: '/explorer',
} as const;

export const STORAGE_KEYS = {
  PRIVATE_KEY: 'forknet_private_key',
  ACCOUNT: 'forknet_account',
} as const;