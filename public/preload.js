const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Settings management
  getSetting: (key) => ipcRenderer.invoke('get-setting', key),
  setSetting: (key, value) => ipcRenderer.invoke('set-setting', key, value),
  
  // API Key status
  checkApiKeyStatus: () => ipcRenderer.invoke('check-api-key-status'),
  
  // Authentication cleanup
  clearAuthData: () => ipcRenderer.invoke('clear-auth-data'),
  appWillClose: () => ipcRenderer.invoke('app-will-close'),
  
  // Listen for app closing
  onAppClosing: (callback) => ipcRenderer.on('app-closing', callback),
  
  // File dialogs
  showSaveDialog: (options) => ipcRenderer.invoke('show-save-dialog', options),
  showOpenDialog: (options) => ipcRenderer.invoke('show-open-dialog', options),
});

// Create the forknetRequest function similar to qortalRequest
contextBridge.exposeInMainWorld('forknetRequest', async (options) => {
  try {
    console.log('ForknetRequest called:', options);
    const result = await ipcRenderer.invoke('forknet-request', options);
    
    if (result && result.error) {
      throw new Error(result.error);
    }
    
    return result;
  } catch (error) {
    console.error('ForknetRequest error:', error);
    throw error;
  }
});

// Provide app information (without requiring package.json)
contextBridge.exposeInMainWorld('appInfo', {
  isElectron: true,
  isForknetUI: true,
  version: '0.2.0',
  platform: process.platform,
});

console.log('Preload script loaded - forknetRequest and API management available');