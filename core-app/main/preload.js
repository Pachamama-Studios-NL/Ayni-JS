const { contextBridge, ipcRenderer } = require('electron');

console.log('Preload script loaded');

// Expose a limited API to the renderer
contextBridge.exposeInMainWorld('electronAPI', {
  // Dataset functions

  getDatasets: () => ipcRenderer.invoke('get-datasets'),
  refreshDatasets: () => ipcRenderer.invoke('refresh-datasets'),
  loadDataset: (datasetId) => ipcRenderer.invoke('load-dataset', datasetId),
  
  // Event listeners
  onSphereUpdate: (callback) => ipcRenderer.on('sphere-update', (event, data) => callback(data)),
  onSliceUpdate: (callback) => ipcRenderer.on('slice-update', (event, data) => callback(data)),
  onMediaControl: (callback) => ipcRenderer.on('media-control', (event, data) => callback(data)),
  onLoadDataset: (callback) => ipcRenderer.on('load-dataset', (event, data) => callback(data)),
  onResolutionChange: (callback) => ipcRenderer.on('resolution-change', (event, data) => callback(data)),

  // Send sphere updates to main process
  sendSphereUpdate: (data) => ipcRenderer.send('sphere-update', data),

  sendResolutionChange: (data) => ipcRenderer.send('resolution-change', data),

  sendSliceUpdate: (data) => ipcRenderer.send('slice-update', data),


  // Remove all listeners
  removeAllListeners: () => ipcRenderer.removeAllListeners()

  getDatasets: () => {
    console.log('getDatasets called from renderer');
    return ipcRenderer.invoke('get-datasets');
  },
  
  loadDataset: (datasetId) => {
    console.log('loadDataset called from renderer with:', datasetId);
    return ipcRenderer.invoke('load-dataset', datasetId);
  },
  
  // Event listeners - now returns unsubscribe function
  onSphereUpdate: (callback) => {
    console.log('onSphereUpdate listener added');
    const subscription = (event, data) => callback(data);
    ipcRenderer.on('sphere-update', subscription);
    return () => {
      console.log('onSphereUpdate listener removed');
      ipcRenderer.removeListener('sphere-update', subscription);
    };
  },
  
  onSliceUpdate: (callback) => {
    console.log('onSliceUpdate listener added');
    const subscription = (event, data) => callback(data);
    ipcRenderer.on('slice-update', subscription);
    return () => {
      console.log('onSliceUpdate listener removed');
      ipcRenderer.removeListener('slice-update', subscription);
    };
  },
  
  onMediaControl: (callback) => {
    console.log('onMediaControl listener added');
    const subscription = (event, data) => callback(data);
    ipcRenderer.on('media-control', subscription);
    return () => {
      console.log('onMediaControl listener removed');
      ipcRenderer.removeListener('media-control', subscription);
    };
  },
  
  onLoadDataset: (callback) => {
    console.log('onLoadDataset listener added');
    const subscription = (event, data) => callback(data);
    ipcRenderer.on('load-dataset', subscription);
    return () => {
      console.log('onLoadDataset listener removed');
      ipcRenderer.removeListener('load-dataset', subscription);
    };
  },
  
  // Send sphere updates to main process
  sendSphereUpdate: (data) => {
    console.log('sendSphereUpdate called with:', data);
    ipcRenderer.send('sphere-update', data);
  },
  
  // Send media controls
  sendMediaControl: (data) => {
    console.log('sendMediaControl called with:', data);
    ipcRenderer.send('media-control', data);
  }

});

console.log('electronAPI exposed');
