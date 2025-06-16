import { lazy } from 'react';

// Lazy load heavy components
export const LazyDashboard = lazy(() => import('../pages/Dashboard'));
export const LazyNodeManagement = lazy(() => import('../pages/NodeManagement'));
export const LazyExplorer = lazy(() => import('../pages/Explorer'));
export const LazyWallet = lazy(() => import('../pages/Wallet'));
export const LazyMinting = lazy(() => import('../pages/Minting'));