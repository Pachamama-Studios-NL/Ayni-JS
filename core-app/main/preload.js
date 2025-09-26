const { contextBridge, ipcRenderer } = require('electron');

// Expose IPC functions to the renderer
contextBridge.exposeInMainWorld('electronAPI', {
  // Dataset functions
  getDatasets: () => ipcRenderer.invoke('get-datasets'),
  loadDataset: (datasetId) => ipcRenderer.invoke('load-dataset', datasetId),
  
  // Event listeners
  onSphereUpdate: (callback) => ipcRenderer.on('sphere-update', (event, data) => callback(data)),
  onSliceUpdate: (callback) => ipcRenderer.on('slice-update', (event, data) => callback(data)),
  onMediaControl: (callback) => ipcRenderer.on('media-control', (event, data) => callback(data)),
  onLoadDataset: (callback) => ipcRenderer.on('load-dataset', (event, data) => callback(data)),
  
  // Send sphere updates to main process
  sendSphereUpdate: (data) => ipcRenderer.send('sphere-update', data),
  
  // Remove all listeners
  removeAllListeners: () => ipcRenderer.removeAllListeners()
});
