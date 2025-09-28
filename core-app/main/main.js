const { app, BrowserWindow, ipcMain, screen } = require('electron');
const path = require('path');
const WSServer = require('../src/ws-server');
const SphereControl = require('../src/sphere-control');
const catalogManager = require('../src/catalog-manager');

let mainWindow;
let wsServer;
let sphereControl;

function createWindow() {
  // Get primary display dimensions
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;

  // Create the browser window
  mainWindow = new BrowserWindow({
    width: Math.min(1400, width - 100),
    height: Math.min(900, height - 100),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, '../assets/icons/icon.png'),
    show: false
  });

  // Load the index.html
  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    
    // Open DevTools in development mode
    if (process.argv.includes('--dev')) {
      mainWindow.webContents.openDevTools();
    }
  });

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Initialize WebSocket server
function initializeWSServer() {
  wsServer = new WSServer(8080);
  
  // Handle sphere control messages
  wsServer.on('sphere-control', (data) => {
    if (sphereControl) {
      sphereControl.updateSphere(data);
    }
    
    // Forward to renderer for UI update
    if (mainWindow) {
      mainWindow.webContents.send('sphere-update', data);
    }
  });
  
  // Handle slice control messages
  wsServer.on('slice-control', (data) => {
    if (sphereControl) {
      sphereControl.updateSlice(data);
    }
    
    // Forward to renderer for UI update
    if (mainWindow) {
      mainWindow.webContents.send('slice-update', data);
    }
  });
  
  // Handle media control messages
  wsServer.on('media-control', (data) => {
    if (mainWindow) {
      mainWindow.webContents.send('media-control', data);
    }
  });
  
  // Handle dataset loading
  wsServer.on('load-dataset', (data) => {
    if (mainWindow) {
      mainWindow.webContents.send('load-dataset', data);
    }
  });
  
  console.log('WebSocket server initialized');
}

// Initialize sphere control
function initializeSphereControl() {
  sphereControl = new SphereControl();
  
  // Handle sphere updates from renderer
  sphereControl.on('sphere-update', (data) => {
    // Broadcast to all connected clients
    if (wsServer) {
      wsServer.broadcast('sphere-update', data);
    }
  });
  
  console.log('Sphere control initialized');
}

// IPC handlers
ipcMain.handle('get-datasets', async () => {
  return catalogManager.getCatalogs();
});

ipcMain.handle('refresh-datasets', async () => {
  return catalogManager.refreshCatalogs();
});

ipcMain.handle('load-dataset', async (event, datasetId) => {
  await catalogManager.getCatalogs();
  const dataset = catalogManager.getDatasetById(datasetId);

  if (!dataset) {
    return { success: false, error: `Dataset not found: ${datasetId}` };
  }

  console.log(`Loading dataset: ${datasetId} (${dataset.sourceUri})`);
  return { success: true, dataset };
});

// App event handlers
app.whenReady().then(async () => {
  try {
    await catalogManager.getCatalogs();
  } catch (error) {
    console.error('Failed to preload dataset catalogs:', error);
  }
  createWindow();
  initializeWSServer();
  initializeSphereControl();
  
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  // Clean up resources
  if (wsServer) {
    wsServer.close();
  }
  if (sphereControl) {
    sphereControl.cleanup();
  }
});
