import React, { useEffect, Suspense, lazy } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline, Box, CircularProgress, Typography } from '@mui/material';
import { Provider, useDispatch, useSelector } from 'react-redux';
import { store, RootState, AppDispatch } from './store';
import { theme } from './theme';
import { ROUTES } from './utils/constants';
import Login from './pages/Login';
import AppCloseHandler from './components/AppCloseHandler';
import PerformanceMonitor from './components/Performance/PerformanceMonitor';

const LazyDashboard = lazy(() => import('./pages/Dashboard'));
const LazyWallet = lazy(() => import('./pages/Wallet'));
const LazyMinting = lazy(() => import('./pages/Minting'));
const LazyNodeManagement = lazy(() => import('./pages/NodeManagement'));
const LazyExplorer = lazy(() => import('./pages/Explorer'));

const PageLoader: React.FC<{ pageName?: string }> = ({ pageName }) => (
  <Box
    display="flex"
    flexDirection="column"
    justifyContent="center"
    alignItems="center"
    minHeight="100vh"
    sx={{
      background: `linear-gradient(135deg, ${theme.palette.primary.main}15 0%, ${theme.palette.primary.dark}10 100%)`,
    }}
  >
    <CircularProgress
      size={48}
      thickness={4}
      sx={{
        mb: 2,
        color: theme.palette.primary.main
      }}
    />
    <Typography
      variant="h6"
      color="primary"
      sx={{ fontWeight: 500 }}
    >
      Loading {pageName || 'Page'}...
    </Typography>
    <Typography
      variant="body2"
      color="text.secondary"
      sx={{ mt: 1 }}
    >
      Forknet UI
    </Typography>
  </Box>
);

// Error Boundary for lazy-loaded components
interface LazyLoadErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface LazyLoadErrorBoundaryState {
  hasError: boolean;
}

class LazyLoadErrorBoundary extends React.Component<LazyLoadErrorBoundaryProps, LazyLoadErrorBoundaryState> {
  constructor(props: LazyLoadErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_error: Error): LazyLoadErrorBoundaryState {
    console.error('Lazy load error:', _error);
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('Lazy component failed to load:', error, errorInfo);
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      return this.props.fallback || (
        <Box
          display="flex"
          flexDirection="column"
          justifyContent="center"
          alignItems="center"
          minHeight="50vh"
          sx={{ p: 3 }}
        >
          <Typography variant="h6" color="error" gutterBottom>
            Failed to load page
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Please refresh the page to try again
          </Typography>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '8px 16px',
              border: 'none',
              borderRadius: '4px',
              backgroundColor: theme.palette.primary.main,
              color: 'white',
              cursor: 'pointer'
            }}
          >
            Refresh Page
          </button>
        </Box>
      );
    }

    return this.props.children;
  }
}

const withLazyLoad = (
  Component: React.ComponentType<any>,
  pageName: string
) => {
  const WrappedComponent: React.FC<any> = (props) => (
    <LazyLoadErrorBoundary>
      <Suspense fallback={<PageLoader pageName={pageName} />}>
        <Component {...props} />
      </Suspense>
    </LazyLoadErrorBoundary>
  );

  // Add display name for debugging
  WrappedComponent.displayName = `withLazyLoad(${Component.displayName || Component.name || 'Component'})`;

  return WrappedComponent;
};

const Dashboard = withLazyLoad(LazyDashboard, 'Dashboard');
const Wallet = withLazyLoad(LazyWallet, 'Wallet');
const Minting = withLazyLoad(LazyMinting, 'Minting');
const NodeManagement = withLazyLoad(LazyNodeManagement, 'Node Management');
const Explorer = withLazyLoad(LazyExplorer, 'Explorer');

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);

  return isAuthenticated ? <>{children}</> : <Navigate to={ROUTES.LOGIN} replace />;
};

const AppContent: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { isAuthenticated, loading } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    // Don't restore session - always start logged out for security
    console.log('🔐 Starting fresh session - no auto-login for security');
  }, [dispatch]);

  // Show loading for authentication state
  if (loading) {
    return <PageLoader pageName="Authentication" />;
  }

  return (
    <Router>
      <Routes>
        <Route
          path={ROUTES.LOGIN}
          element={
            isAuthenticated ? <Navigate to={ROUTES.DASHBOARD} replace /> : <Login />
          }
        />

        <Route
          path={ROUTES.DASHBOARD}
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.WALLET}
          element={
            <ProtectedRoute>
              <Wallet />
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.MINTING}
          element={
            <ProtectedRoute>
              <Minting />
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.NODE_MANAGEMENT}
          element={
            <ProtectedRoute>
              <NodeManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.EXPLORER}
          element={
            <ProtectedRoute>
              <Explorer />
            </ProtectedRoute>
          }
        />

        <Route path="/" element={<Navigate to={ROUTES.DASHBOARD} replace />} />

        {/* Catch-all route for 404s */}
        <Route
          path="*"
          element={
            <Box
              display="flex"
              flexDirection="column"
              justifyContent="center"
              alignItems="center"
              minHeight="50vh"
              sx={{ p: 3 }}
            >
              <Typography variant="h4" color="primary" gutterBottom>
                404
              </Typography>
              <Typography variant="h6" gutterBottom>
                Page Not Found
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                The page you're looking for doesn't exist.
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <button
                  onClick={() => window.history.back()}
                  style={{
                    padding: '8px 16px',
                    border: 'none',
                    borderRadius: '4px',
                    backgroundColor: theme.palette.primary.main,
                    color: 'white',
                    cursor: 'pointer'
                  }}
                >
                  Go Back
                </button>
                <button
                  onClick={() => window.location.href = ROUTES.DASHBOARD}
                  style={{
                    padding: '8px 16px',
                    border: `1px solid ${theme.palette.primary.main}`,
                    borderRadius: '4px',
                    backgroundColor: 'transparent',
                    color: theme.palette.primary.main,
                    cursor: 'pointer'
                  }}
                >
                  Go to Dashboard
                </button>
              </Box>
            </Box>
          }
        />
      </Routes>
    </Router>
  );
};

const App: React.FC = () => {
  return (
    <Provider store={store}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {/* Performance monitoring only in development */}
        {process.env.NODE_ENV === 'development' && <PerformanceMonitor />}
        <AppCloseHandler />
        <AppContent />
      </ThemeProvider>
    </Provider>
  );
};

export default App;