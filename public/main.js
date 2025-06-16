const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const fs = require("fs");
const isDev = require("electron-is-dev");
const axios = require("axios");

// Try to import electron-store, fallback if not available
let Store;
let store;
try {
  Store = require("electron-store");
  store = new Store();
} catch (error) {
  const memoryStore = {};
  store = {
    get: (key, defaultValue) =>
      memoryStore[key] !== undefined ? memoryStore[key] : defaultValue,
    set: (key, value) => {
      memoryStore[key] = value;
    },
  };
}

let mainWindow;
let cachedApiKey = null;

// Function to find and read API key from Forknet installation locations
function findAndReadApiKey() {
  const homeDir = require("os").homedir();

  // Prioritize Forknet-specific locations
  const possiblePaths = [
    // Forknet-core installation (most common)
    path.join(homeDir, "forknet-core", "apikey.txt"),
    // Alternative Forknet locations
    path.join(homeDir, "forknet", "apikey.txt"),
    path.join(homeDir, "Forknet", "apikey.txt"),
    // App directory locations
    path.join(__dirname, "..", "apikey.txt"),
    path.join(process.cwd(), "apikey.txt"),
    // Generic home directory
    path.join(homeDir, "apikey.txt"),
    // Last resort: Qortal locations (for compatibility)
    //path.join(homeDir, "qortal", "apikey.txt"),
  ];

  for (const apiKeyPath of possiblePaths) {
    try {
      if (fs.existsSync(apiKeyPath)) {
        const apiKey = fs.readFileSync(apiKeyPath, "utf8").trim();
        if (apiKey && apiKey.length > 0) {
          cachedApiKey = apiKey;
          return apiKey;
        }
      }
    } catch (error) {
    }
  }
  return null;
}

// Function to get API key (cached or fresh read)
function getApiKey() {
  if (cachedApiKey) {
    return cachedApiKey;
  }
  return findAndReadApiKey();
}

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, "preload.js"),
      webSecurity: true,
      allowRunningInsecureContent: false,
    },
    icon: path.join(__dirname, "icon.png"),
    show: false,
    titleBarStyle: "default",
  });

  const startUrl = isDev
    ? "http://localhost:3000"
    : `file://${path.join(__dirname, "../build/index.html")}`;

  mainWindow.loadURL(startUrl);

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();

    // Check for API key on startup
    const apiKey = getApiKey();
    if (apiKey) {
    } else {

    }
  });

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  // Clear authentication data when window is closed
  mainWindow.on("close", (event) => {

    // Send logout command to renderer before closing
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("app-closing");
    }
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
    cachedApiKey = null; // Clear cached API key
  });
}

// App event listeners
app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// IPC handlers for Forknet API requests
ipcMain.handle("forknet-request", async (event, options) => {
  try {

    const apiBase = store.get("forknet.apiBase", "http://localhost:10391");
    const apiKey = getApiKey(); // Auto-detect API key

    switch (options.action) {
      case "GET_NODE_INFO":
        return await handleGetNodeInfo(apiBase, apiKey);

      case "GET_NODE_STATUS":
        return await handleGetNodeStatus(apiBase, apiKey);

      case "GET_PEERS":
        return await handleGetPeers(apiBase);

      case "ADMIN_ACTION":
        return await handleAdminAction(apiBase, apiKey, options);

      default:
        throw new Error(`Unknown action: ${options.action}`);
    }
  } catch (error) {
    console.error("❌ Forknet request error:", error);
    return { error: error.message };
  }
});

// API request handlers (keep these the same)
async function handleGetNodeInfo(apiBase, apiKey) {
  const response = await axios.get(`${apiBase}/admin/info`, {
    headers: apiKey ? { "X-API-KEY": apiKey } : {},
    timeout: 10000,
  });
  return response.data;
}

async function handleGetNodeStatus(apiBase, apiKey) {
  const response = await axios.get(`${apiBase}/admin/status`, {
    headers: apiKey ? { "X-API-KEY": apiKey } : {},
    timeout: 10000,
  });
  return response.data;
}

async function handleGetPeers(apiBase) {
  const response = await axios.get(`${apiBase}/peers`, {
    timeout: 10000,
  });
  return response.data;
}

async function handleAdminAction(apiBase, apiKey, options) {
  if (!apiKey) {
    throw new Error(
      "❌ Forknet API key not found. Please ensure your Forknet core is running and has generated ~/forknet-core/apikey.txt"
    );
  }

  const headers = {
    "X-API-KEY": apiKey,
    "Content-Type": "text/plain",
  };

  // ... rest of the admin actions remain the same ...
  switch (options.type) {
    case "getmintingaccounts":
      const mintingResponse = await axios.get(
        `${apiBase}/admin/mintingaccounts`,
        {
          headers: { "X-API-KEY": apiKey },
          timeout: 10000,
        }
      );
      return mintingResponse.data;

    case "forcesync":
      // Force sync can take a very long time, so use longer timeout
      const response = await axios.post(
        `${apiBase}/admin/forcesync`,
        options.value,
        {
          headers,
          timeout: 300000, // 5 minutes timeout
        }
      );
      return response.data;

    case "addpeer":
      const addResponse = await axios.post(`${apiBase}/peers`, options.value, {
        headers,
        timeout: 10000,
      });

      return addResponse.data;

    case "removepeer":
      const removeResponse = await axios.delete(`${apiBase}/peers`, {
        headers,
        data: options.value, // Send peer address in request body
        timeout: 10000,
      });
      return removeResponse.data;

    case "addmintingaccount":
      const mintingAddResponse = await axios.post(
        `${apiBase}/admin/mintingaccounts`,
        options.value,
        {
          headers,
          timeout: 10000,
        }
      );
      return mintingAddResponse.data;

    case "removemintingaccount":
      const removeMintingResponse = await axios.delete(
        `${apiBase}/admin/mintingaccounts`, // Remove the path parameter
        {
          headers,
          data: options.value, // Send public key in request body
          timeout: 10000,
        }
      );
      return removeMintingResponse.data;

    case "restart":
      const restartResponse = await axios.get(`${apiBase}/admin/restart`, {
        headers: { "X-API-KEY": apiKey },
        timeout: 10000,
      });
      return restartResponse.data;

    case "stop":
      try {
        const stopResponse = await axios.get(`${apiBase}/admin/stop`, {
          headers: { "X-API-KEY": apiKey },
          timeout: 5000, // Shorter timeout since node stops quickly
        });
        return stopResponse.data;
      } catch (error) {
        // If connection is refused, the stop command likely worked
        if (
          error.code === "ECONNREFUSED" ||
          error.message.includes("ECONNREFUSED")
        ) {
          return true; // Treat as success
        }
        throw error; // Re-throw other errors
      }

    default:
      throw new Error(`Unknown admin action: ${options.type}`);
  }
}

// Settings management (simplified)
ipcMain.handle("get-setting", async (event, key) => {
  return store.get(key);
});

ipcMain.handle("set-setting", async (event, key, value) => {
  store.set(key, value);
  return true;
});

// API Key status check
ipcMain.handle("check-api-key-status", async (event) => {
  const apiKey = getApiKey();
  return {
    hasApiKey: !!apiKey,
    keyLength: apiKey ? apiKey.length : 0,
    message: apiKey ? "API key loaded" : "No API key found",
  };
});

ipcMain.handle("show-save-dialog", async (event, options) => {
  const result = await dialog.showSaveDialog(mainWindow, options);
  return result;
});

ipcMain.handle("show-open-dialog", async (event, options) => {
  const result = await dialog.showOpenDialog(mainWindow, options);
  return result;
});

// Clear authentication data
ipcMain.handle("clear-auth-data", async (event) => {
  try {
    // Clear any stored auth data from main process
    store.delete("forknet.privateKey");
    store.delete("forknet.account");
    return true;
  } catch (error) {
    console.error("Failed to clear auth data:", error);
    return false;
  }
});

// Handle app closing
ipcMain.handle("app-will-close", async (event) => {
  // Clear cached API key
  cachedApiKey = null;
  return true;
});

// Prevent new window creation (security)
app.on("web-contents-created", (event, contents) => {
  contents.setWindowOpenHandler(({ navigationUrl }) => {
    return { action: "deny" };
  });
});
