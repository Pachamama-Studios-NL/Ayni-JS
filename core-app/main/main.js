const { app, BrowserWindow, ipcMain, screen } = require('electron');
const path = require('path');

const { pathToFileURL } = require('url');

const fs = require('fs');

const WSServer = require('../src/ws-server');
const SphereControl = require('../src/sphere-control');
const catalogManager = require('../src/catalog-manager');

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
      nodeIntegration: false,  // Must be false for security
      contextIsolation: true,   // Must be true for contextBridge to work
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, '../assets/icons/icon.png'),
    show: false
  });

  // Load the index.html
  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html')).then(() => {
    console.log('Index HTML loaded successfully');
  }).catch(err => {
    console.error('Failed to load index HTML:', err);
  });

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

  // Log webPreferences for debugging
  console.log('WebPreferences:', mainWindow.webPreferences);
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

  try {
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
  } catch (error) {
    console.error('Failed to initialize WebSocket server:', error);
  }

}

// Initialize sphere control
function initializeSphereControl() {

  sphereControl = new SphereControl();


  // Handle sphere updates from renderer

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

  try {
    sphereControl = new SphereControl();
    
    // Handle sphere updates from renderer
    sphereControl.on('sphere-update', (data) => {
      // Broadcast to all connected clients
      if (wsServer) {
        wsServer.broadcast('sphere-update', data);
      }
    });
    
    console.log('Sphere control initialized');
  } catch (error) {
    console.error('Failed to initialize sphere control:', error);
  }

}

// Store datasets in memory to avoid recreating them
let cachedDatasets = null;

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
app.whenReady().then(async () => {
  try {
    await catalogManager.getCatalogs();
  } catch (error) {
    console.error('Failed to preload dataset catalogs:', error);
  }

  console.log('get-datasets called');
  
  // Return cached datasets if available
  if (cachedDatasets) {
    return cachedDatasets;
  }
  
  // Check if the assets directory exists
  const assetsDir = path.join(__dirname, '../assets');
  const imagesDir = path.join(assetsDir, 'images');
  const videosDir = path.join(assetsDir, 'videos');
  
  // Create directories if they don't exist
  if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
  }
  
  if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir, { recursive: true });
  }
  
  if (!fs.existsSync(videosDir)) {
    fs.mkdirSync(videosDir, { recursive: true });
  }
  
  // Scan for available files
  const imageFiles = fs.existsSync(imagesDir) ? fs.readdirSync(imagesDir) : [];
  const videoFiles = fs.existsSync(videosDir) ? fs.readdirSync(videosDir) : [];
  
  // Create dataset list
  const datasets = [
    {
      id: 'dataset1',
      name: 'Earth Day and Night',
      type: 'image',
      path: imageFiles.length > 0 ? path.join(imagesDir, imageFiles[0]) : path.join(imagesDir, '4096.jpg'),
      description: 'Earth showing day and night regions',
      exists: fs.existsSync(imageFiles.length > 0 ? path.join(imagesDir, imageFiles[0]) : path.join(imagesDir, '4096.jpg'))
    },
    {
      id: 'dataset2',
      name: 'Ocean Currents',
      type: 'video',
      path: videoFiles.length > 0 ? path.join(videosDir, videoFiles[0]) : path.join(videosDir, 'ECCO.mp4'),
      description: 'Global ocean current patterns',
      exists: fs.existsSync(videoFiles.length > 0 ? path.join(videosDir, videoFiles[0]) : path.join(videosDir, 'ECCO.mp4'))
    },
    {
      id: 'dataset3',
      name: 'Temperature Map',
      type: 'image',
      path: imageFiles.length > 1 ? path.join(imagesDir, imageFiles[1]) : path.join(imagesDir, '1.png'),
      description: 'Global temperature distribution',
      exists: fs.existsSync(imageFiles.length > 1 ? path.join(imagesDir, imageFiles[1]) : path.join(imagesDir, '1.png'))
    }
  ];
  
  // Cache the datasets
  cachedDatasets = datasets;
  
  return datasets;
});

ipcMain.handle('load-dataset', async (event, datasetId) => {
  console.log('load-dataset called with:', datasetId);
  
  try {
    // Get the datasets from the cache or create them
    let datasets = cachedDatasets;
    if (!datasets) {
      // This is a workaround to get the datasets without calling the handler directly
      datasets = await ipcMain.handlers['get-datasets'](null, null);
    }
    
    const dataset = datasets.find(d => d.id === datasetId);
    
    if (!dataset) {
      console.error('Dataset not found:', datasetId);
      return { success: false, error: 'Dataset not found' };
    }
    
    // Check if the file exists
    if (!dataset.exists) {
      console.error('Dataset file does not exist:', dataset.path);
      return { success: false, error: 'Dataset file does not exist' };
    }
    
    // Load the dataset
    console.log('Loading dataset:', dataset.path);
    
    // For now, just return success
    // In a real implementation, you would load the texture/video here
    return { success: true, dataset: dataset };
  } catch (error) {
    console.error('Error loading dataset:', error);
    return { success: false, error: error.message };
  }
});

// App event handlers
app.whenReady().then(() => {
  console.log('App ready, creating window');

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
