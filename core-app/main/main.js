const { app, BrowserWindow, ipcMain, screen } = require('electron');
const path = require('path');
const { pathToFileURL } = require('url');
const WSServer = require('../src/ws-server');
const SphereControl = require('../src/sphere-control');

let mainWindow;
let wsServer;
let sphereControl;

const DATASETS = [
  {
    id: 'dataset1',
    name: 'Earth Day and Night',
    type: 'image',
    file: 'earth-day-night.jpg',
    description: 'Earth showing day and night regions',
    projection: 'sphere'
  },
  {
    id: 'dataset2',
    name: 'Ocean Currents',
    type: 'video',
    file: 'ocean-currents.mp4',
    description: 'Global ocean current patterns',
    projection: 'sphere',
    streaming: {
      loop: true,
      muted: true
    }
  },
  {
    id: 'dataset3',
    name: 'Temperature Map',
    type: 'image',
    file: 'temperature-map.jpg',
    description: 'Global temperature distribution',
    projection: 'sphere'
  }
];

function resolveDatasetDescriptor(dataset) {
  if (!dataset) {
    return null;
  }

  const assetPath = path.resolve(__dirname, '../assets', dataset.file);
  const descriptor = {
    id: dataset.id,
    name: dataset.name,
    type: dataset.type,
    description: dataset.description,
    projection: dataset.projection || 'sphere',
    uri: pathToFileURL(assetPath).href
  };

  if (dataset.streaming) {
    descriptor.streaming = dataset.streaming;
  }

  return descriptor;
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

    if (wsServer) {
      wsServer.broadcast('sphere-update', data);
    }
  });

  // Handle slice control messages
  wsServer.on('slice-control', (data) => {
    if (sphereControl) {
      sphereControl.updateSlice(data);
    }

    if (wsServer) {
      wsServer.broadcast('slice-update', data);
    }
  });

  // Handle media control messages
  wsServer.on('media-control', (data) => {
    if (mainWindow) {
      mainWindow.webContents.send('media-control', data);
    }

    if (wsServer) {
      wsServer.broadcast('media-control', data);
    }
  });
  
  // Handle dataset loading
  wsServer.on('load-dataset', (data) => {
    if (!mainWindow) {
      return;
    }

    const datasetId = typeof data === 'string' ? data : data?.id;
    const dataset = DATASETS.find(d => d.id === datasetId);
    const descriptor = resolveDatasetDescriptor(dataset);

    if (descriptor) {
      mainWindow.webContents.send('load-dataset', descriptor);
    } else if (data && data.uri) {
      mainWindow.webContents.send('load-dataset', data);
    }
  });
  
  console.log('WebSocket server initialized');
}

// Initialize sphere control
function initializeSphereControl() {
  sphereControl = new SphereControl();

  sphereControl.on('sphere-update', (data) => {
    if (mainWindow) {
      mainWindow.webContents.send('sphere-update', data);
    }
  });

  sphereControl.on('slice-update', (data) => {
    if (mainWindow) {
      mainWindow.webContents.send('slice-update', data);
    }
  });

  console.log('Sphere control initialized');
}

// IPC handlers
ipcMain.handle('get-datasets', async () =>
  DATASETS.map(({ id, name, type, description }) => ({
    id,
    name,
    type,
    description
  }))
);

ipcMain.handle('load-dataset', async (event, datasetId) => {
  const dataset = DATASETS.find(d => d.id === datasetId);

  if (!dataset) {
    const errorMessage = `Dataset not found: ${datasetId}`;
    console.error(errorMessage);
    return { success: false, error: errorMessage };
  }

  const descriptor = resolveDatasetDescriptor(dataset);

  if (descriptor && mainWindow) {
    mainWindow.webContents.send('load-dataset', descriptor);
  }

  console.log(`Loaded dataset: ${datasetId}`);

  return descriptor;
});

ipcMain.on('sphere-update', (event, data) => {
  if (sphereControl) {
    sphereControl.updateSphere(data);
  }

  if (wsServer) {
    wsServer.broadcast('sphere-update', data);
  }
});

ipcMain.on('slice-update', (event, data) => {
  if (sphereControl) {
    sphereControl.updateSlice(data);
  }

  if (wsServer) {
    wsServer.broadcast('slice-update', data);
  }
});

ipcMain.on('media-control', (event, data) => {
  if (mainWindow) {
    mainWindow.webContents.send('media-control', data);
  }

  if (wsServer) {
    wsServer.broadcast('media-control', data);
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
