const { app, BrowserWindow, ipcMain, screen } = require('electron');
const path = require('path');
const WSServer = require('../src/ws-server');
const SphereControl = require('../src/sphere-control');

let mainWindow;
let wsServer;
let sphereControl;

function broadcastResolution(resolution, excludeClientId = null) {
  if (mainWindow) {
    mainWindow.webContents.send('resolution-change', resolution);
  }

  if (wsServer) {
    wsServer.broadcast('resolution-change', resolution, excludeClientId);
  }
}

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

  wsServer.on('resolution-change', (data, clientId) => {
    const payload = data && data.data ? data.data : data;

    if (sphereControl) {
      const updated = sphereControl.updateResolution(payload);
      broadcastResolution(updated, clientId);
    } else {
      broadcastResolution(payload, clientId);
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
  // Return list of available datasets
  return [
    {
      id: 'dataset1',
      name: 'Earth Day and Night',
      type: 'image',
      path: './assets/earth-day-night.jpg',
      description: 'Earth showing day and night regions'
    },
    {
      id: 'dataset2',
      name: 'Ocean Currents',
      type: 'video',
      path: './assets/ocean-currents.mp4',
      description: 'Global ocean current patterns'
    },
    {
      id: 'dataset3',
      name: 'Temperature Map',
      type: 'image',
      path: './assets/temperature-map.jpg',
      description: 'Global temperature distribution'
    }
  ];
});

ipcMain.handle('load-dataset', async (event, datasetId) => {
  // Load the specified dataset
  console.log(`Loading dataset: ${datasetId}`);
  return { success: true };
});

ipcMain.on('sphere-update', (event, data) => {
  if (sphereControl) {
    sphereControl.updateSphere(data);
  }
});

ipcMain.on('resolution-change', (event, data) => {
  if (sphereControl) {
    const updated = sphereControl.updateResolution(data);
    broadcastResolution(updated);
  } else {
    broadcastResolution(data);
  }
});

// App event handlers
app.whenReady().then(() => {
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
