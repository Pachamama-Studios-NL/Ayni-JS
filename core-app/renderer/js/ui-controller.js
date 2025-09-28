class UIController {
  constructor() {
    this.currentDataset = null;
    this.datasets = [];

    this.mediaElement = null;

    this.electronAPI = null;
    this.ipcListenersAttached = false;


    this.init();
  }

  init() {
    this.setupEventListeners();
    this.setupIPCListeners();

    this.configureMediaControls();

    this.loadDatasets();

  }

  setupEventListeners() {
    // Sphere controls
    const rotationX = document.getElementById('rotation-x');
    const rotationY = document.getElementById('rotation-y');
    const zoom = document.getElementById('zoom');
    
    rotationX.addEventListener('input', (e) => {
      const value = parseFloat(e.target.value);
      document.getElementById('rotation-x-value').textContent = `${value}°`;
      this.updateSphereState({ rotation: { x: value } });
    });
    
    rotationY.addEventListener('input', (e) => {
      const value = parseFloat(e.target.value);
      document.getElementById('rotation-y-value').textContent = `${value}°`;
      this.updateSphereState({ rotation: { y: value } });
    });
    
    zoom.addEventListener('input', (e) => {
      const value = parseFloat(e.target.value);
      document.getElementById('zoom-value').textContent = `${value}%`;
      this.updateSphereState({ zoom: value / 100 });
    });
    
    // Slice controls
    const applySlices = document.getElementById('apply-slices');
    applySlices.addEventListener('click', () => {
      const sliceCount = parseInt(document.getElementById('slice-count').value);
      const sliceAngle = parseInt(document.getElementById('slice-angle').value);
      
      this.updateSphereState({
        sliceConfig: {
          count: sliceCount,
          angle: sliceAngle,
          overlap: 0
        }
      });
    });
    
    // Media controls
    document.getElementById('play-btn').addEventListener('click', () => {
      this.controlMediaElement('play');
      this.sendMediaControl('play');
    });

    document.getElementById('pause-btn').addEventListener('click', () => {
      this.controlMediaElement('pause');
      this.sendMediaControl('pause');
    });

    document.getElementById('stop-btn').addEventListener('click', () => {
      this.controlMediaElement('stop');
      this.sendMediaControl('stop');
    });

    document.getElementById('volume').addEventListener('input', (e) => {
      const level = parseFloat(e.target.value) / 100;
      this.controlMediaElement('volume', level);
      this.sendMediaControl('volume', level);
    });
  }

  setupIPCListeners() {
    const api = this.getElectronAPI();

    if (!api) {
      setTimeout(() => this.setupIPCListeners(), 100);
      return;
    }

    if (this.ipcListenersAttached) {
      return;
    }

    this.ipcListenersAttached = true;

    api.onSphereUpdate?.((data) => {
      this.updateSphereUI(data);
    });

    api.onSliceUpdate?.((data) => {
      this.updateSliceUI(data);
    });

    api.onMediaControl?.((data) => {
      this.handleMediaControl(data);
    });

    api.onLoadDataset?.((data) => {
      this.handleDatasetLoaded(data);
    });
  }

  async loadDatasets() {
    try {
      const api = this.getElectronAPI();

      if (!api?.getDatasets) {
        setTimeout(() => this.loadDatasets(), 200);
        return;
      }

      this.datasets = await api.getDatasets();
      this.renderDatasetList();
    } catch (error) {
      this.showNotification('Failed to load datasets', 'error');
    }
  }
  
  renderDatasetList() {
    const datasetList = document.getElementById('dataset-list');
    datasetList.innerHTML = '';
    
    this.datasets.forEach(dataset => {
      const item = document.createElement('div');
      item.className = 'dataset-item';
      item.dataset.id = dataset.id;
      
      item.innerHTML = `
        <div class="dataset-name">${dataset.name}</div>
        <div class="dataset-type">${dataset.type}</div>
      `;
      
      item.addEventListener('click', () => {
        this.loadDataset(dataset.id);
      });
      
      datasetList.appendChild(item);
    });
  }
  
  async loadDataset(datasetId) {
    try {

      if (window.electronAPI) {
        const descriptor = await window.electronAPI.loadDataset(datasetId);

        if (descriptor && descriptor.success === false) {
          this.showNotification('Failed to load dataset', 'error');
          return;
        }

        // Update UI immediately
        const dataset = this.datasets.find(d => d.id === datasetId);
        if (dataset) {
          this.currentDataset = dataset;
          this.updateDatasetInfo(dataset);
          this.highlightDataset(datasetId);
        }

      const api = this.getElectronAPI();

      if (!api?.loadDataset) {
        return;
      }

      await api.loadDataset(datasetId);

      // Update UI
      const dataset = this.datasets.find(d => d.id === datasetId);
      if (dataset) {
        this.currentDataset = dataset;
        this.updateDatasetInfo(dataset);
        this.highlightDataset(datasetId);

      }
    } catch (error) {
      this.showNotification('Failed to load dataset', 'error');
    }
  }
  
  updateDatasetInfo(dataset) {
    const info = document.getElementById('dataset-info');
    info.innerHTML = `
      <h3>${dataset.name}</h3>
      <p><strong>Type:</strong> ${dataset.type}</p>
      <p><strong>Description:</strong> ${dataset.description}</p>
    `;
  }
  
  highlightDataset(datasetId) {
    const items = document.querySelectorAll('.dataset-item');
    items.forEach(item => {
      if (item.dataset.id === datasetId) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });
  }
  
  updateSphereUI(data) {
    if (data.rotation) {
      if (data.rotation.x !== undefined) {
        const rotationX = document.getElementById('rotation-x');
        rotationX.value = data.rotation.x;
        document.getElementById('rotation-x-value').textContent = `${data.rotation.x}°`;
      }
      
      if (data.rotation.y !== undefined) {
        const rotationY = document.getElementById('rotation-y');
        rotationY.value = data.rotation.y;
        document.getElementById('rotation-y-value').textContent = `${data.rotation.y}°`;
      }
    }
    
    if (data.zoom !== undefined) {
      const zoom = document.getElementById('zoom');
      zoom.value = data.zoom * 100;
      document.getElementById('zoom-value').textContent = `${Math.round(data.zoom * 100)}%`;
    }
    
    // Update Three.js renderer
    if (window.sphereRenderer) {
      window.sphereRenderer.updateSphere(data);
    }
  }
  
  updateSliceUI(data) {
    // Update slice-specific UI elements
    console.log('Slice update:', data);
  }
  
  handleMediaControl(data) {
    if (!data) {
      return;
    }

    this.controlMediaElement(data.action, data.value);
  }

  controlMediaElement(action, value = null) {
    if (!this.mediaElement) {
      return;
    }

    switch (action) {
      case 'play':
        this.mediaElement.play().catch(() => {});
        break;
      case 'pause':
        this.mediaElement.pause();
        break;
      case 'stop':
        this.mediaElement.pause();
        this.mediaElement.currentTime = 0;
        break;
      case 'volume':
        if (typeof value === 'number') {
          this.mediaElement.volume = Math.min(1, Math.max(0, value));
          this.mediaElement.muted = this.mediaElement.volume === 0;
        }
        break;
      default:
        break;
    }
  }

  configureMediaControls() {
    const isVideo = !!this.mediaElement;
    const controls = [
      document.getElementById('play-btn'),
      document.getElementById('pause-btn'),
      document.getElementById('stop-btn')
    ];

    controls.forEach(control => {
      if (control) {
        control.disabled = !isVideo;
      }
    });

    const volume = document.getElementById('volume');
    if (volume) {
      volume.disabled = !isVideo;
      if (isVideo && this.mediaElement) {
        const effectiveVolume = this.mediaElement.muted ? 0 : this.mediaElement.volume;
        volume.value = Math.round(effectiveVolume * 100);
      }
    }
  }
  
  async handleDatasetLoaded(dataset) {
    if (!dataset || dataset.success === false) {
      this.showNotification('Failed to load dataset', 'error');
      return;
    }

    try {
      if (window.sphereRenderer) {
        const result = await window.sphereRenderer.loadDataset(dataset);
        this.mediaElement = result?.mediaElement || null;
      }

      const datasetMeta = this.datasets.find(d => d.id === dataset.id) || dataset;
      this.currentDataset = datasetMeta;
      this.updateDatasetInfo(datasetMeta);
      this.highlightDataset(dataset.id);
      this.configureMediaControls();

      this.showNotification(`Dataset "${dataset.name || dataset.id}" loaded`, 'success');
    } catch (error) {
      console.error('Failed to load dataset in renderer', error);
      this.mediaElement = null;
      this.configureMediaControls();
      this.showNotification('Failed to display dataset', 'error');
    }
  }
  
  updateSphereState(state) {
    // Update Three.js renderer
    if (window.sphereRenderer) {
      window.sphereRenderer.updateSphere(state);
    }

    // Send to main process for broadcasting
    const api = this.getElectronAPI();
    if (api?.sendSphereUpdate) {
      api.sendSphereUpdate(state);
    }
  }

  sendMediaControl(action, value = null) {
    const data = { action, value };

    // Send to main process
    const api = this.getElectronAPI();
    if (api?.sendMediaControl) {
      api.sendMediaControl(data);
    }
  }

  getElectronAPI() {
    if (!this.electronAPI && window.electronAPI) {
      this.electronAPI = window.electronAPI;
    }

    return this.electronAPI;
  }
  
  showNotification(message, type = 'info') {
    const container = document.getElementById('notification-container');
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    container.appendChild(notification);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
      notification.style.opacity = '0';
      setTimeout(() => {
        container.removeChild(notification);
      }, 300);
    }, 3000);
  }
  
  updateConnectionStatus(status) {
    const statusElement = document.getElementById('connection-status');
    statusElement.textContent = status;
    statusElement.className = `status-indicator ${status.toLowerCase()}`;
  }
  
  updateServerStatus(online) {
    const serverStatus = document.getElementById('server-status');
    serverStatus.textContent = `Server: ${online ? 'Online' : 'Offline'}`;
  }
  
  updatePerformance(fps, latency) {
    document.getElementById('fps-counter').textContent = fps;
    document.getElementById('latency-counter').textContent = `${latency}ms`;
  }
}

// Initialize the UI controller when the DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.uiController = new UIController();
});
