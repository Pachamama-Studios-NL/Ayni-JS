const { contextBridge, ipcRenderer } = require('electron');

console.log('Preload script loaded');

// Expose a limited API to the renderer
contextBridge.exposeInMainWorld('electronAPI', {
  // Dataset functions
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
