class UIController {
  constructor() {
    this.currentDataset = null;
    this.datasets = [];
    
    this.init();
  }
  
  init() {
    this.setupEventListeners();
    this.loadDatasets();
    this.setupIPCListeners();
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
      this.sendMediaControl('play');
    });
    
    document.getElementById('pause-btn').addEventListener('click', () => {
      this.sendMediaControl('pause');
    });
    
    document.getElementById('stop-btn').addEventListener('click', () => {
      this.sendMediaControl('stop');
    });
    
    document.getElementById('volume').addEventListener('input', (e) => {
      this.sendMediaControl('volume', parseFloat(e.target.value) / 100);
    });
  }
  
  setupIPCListeners() {
    if (window.electronAPI) {
      // Listen for sphere updates from main process
      window.electronAPI.onSphereUpdate((data) => {
        this.updateSphereUI(data);
      });
      
      // Listen for slice updates
      window.electronAPI.onSliceUpdate((data) => {
        this.updateSliceUI(data);
      });
      
      // Listen for media controls
      window.electronAPI.onMediaControl((data) => {
        this.handleMediaControl(data);
      });
      
      // Listen for dataset loading
      window.electronAPI.onLoadDataset((data) => {
        this.handleDatasetLoaded(data);
      });
    }
  }
  
  async loadDatasets() {
    try {
      if (window.electronAPI) {
        this.datasets = await window.electronAPI.getDatasets();
        this.renderDatasetList();
      }
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
        await window.electronAPI.loadDataset(datasetId);
        
        // Update UI
        const dataset = this.datasets.find(d => d.id === datasetId);
        if (dataset) {
          this.currentDataset = dataset;
          this.updateDatasetInfo(dataset);
          this.highlightDataset(datasetId);
        }
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
    // Handle media control updates
    console.log('Media control:', data);
  }
  
  handleDatasetLoaded(data) {
    if (data.success) {
      this.showNotification('Dataset loaded successfully', 'success');
    } else {
      this.showNotification('Failed to load dataset', 'error');
    }
  }
  
  updateSphereState(state) {
    // Update Three.js renderer
    if (window.sphereRenderer) {
      window.sphereRenderer.updateSphere(state);
    }
    
    // Send to main process for broadcasting
    if (window.electronAPI) {
      window.electronAPI.sendSphereUpdate(state);
    }
  }
  
  sendMediaControl(action, value = null) {
    const data = { action, value };
    
    // Send to main process
    if (window.electronAPI) {
      window.electronAPI.sendMediaControl(data);
    }
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
