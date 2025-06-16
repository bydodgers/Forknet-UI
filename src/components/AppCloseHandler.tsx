import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '../store';
import { clearAuthOnClose } from '../store/slices/authSlice';
import { STORAGE_KEYS } from '../utils/constants';

const AppCloseHandler: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();

  useEffect(() => {
    const handleAppClosing = async () => {
      console.log('🚪 App is closing - logging out user');
      
      // Clear Redux state
      dispatch(clearAuthOnClose());
      
      // Clear localStorage
      localStorage.removeItem(STORAGE_KEYS.PRIVATE_KEY);
      localStorage.removeItem(STORAGE_KEYS.ACCOUNT);
      
      // Clear main process auth data
      if ((window as any).electronAPI) {
        try {
          await (window as any).electronAPI.clearAuthData();
          await (window as any).electronAPI.appWillClose();
        } catch (error) {
          console.error('Failed to clear auth data:', error);
        }
      }
      
      console.log('✅ Logout completed');
    };

    // Set up app closing listener
    if ((window as any).electronAPI) {
      (window as any).electronAPI.onAppClosing(handleAppClosing);
    }

    // Also handle browser beforeunload for web version
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      handleAppClosing();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    // Cleanup
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [dispatch]);

  return null; // This component doesn't render anything
};

export default AppCloseHandler;