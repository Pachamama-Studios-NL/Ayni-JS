// main.js (Core App)
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const WebSocketServer = require('./communication/server');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  // Load the app
  mainWindow.loadFile('index.html');
  
  // Initialize WebSocket server
  const wsServer = new WebSocketServer();
  
  // Handle sphere updates from WebSocket
  wsServer.on('sphere-update', (data) => {
    mainWindow.webContents.send('sphere-update', data);
  });
}

app.whenReady().then(createWindow);
