const { app, BrowserWindow, ipcMain, screen } = require('electron');
const path = require('path');
const fs = require('fs');
const WSServer = require('../src/ws-server');
const SphereControl = require('../src/sphere-control');

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
