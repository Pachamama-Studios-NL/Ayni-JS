class UIController {
  constructor() {
    this.currentDataset = null;
    this.datasets = [];
    this.catalogErrors = [];
    this.catalogLastUpdated = null;
    this.catalogDir = null;

    this.init();
  }

  init() {
    this.setupEventListeners();
    this.loadDatasets({ silent: true });
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

    const refreshCatalogs = document.getElementById('refresh-datasets');
    if (refreshCatalogs) {
      refreshCatalogs.addEventListener('click', () => {
        this.loadDatasets({ refresh: true });
      });
    }
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
  
  async loadDatasets({ silent = false, refresh = false } = {}) {
    try {
      if (window.electronAPI) {
        const response = refresh
          ? await window.electronAPI.refreshDatasets()
          : await window.electronAPI.getDatasets();
        this.applyCatalogResponse(response);

        if (!silent) {
          if (this.catalogErrors.length > 0) {
            this.showNotification('Catalog reloaded with validation issues', 'warning');
          } else {
            this.showNotification('Catalogs refreshed successfully', 'success');
          }
        } else if (this.catalogErrors.length > 0) {
          this.showNotification('Catalog validation issues detected', 'warning');
        }
      }
    } catch (error) {
      this.showNotification('Failed to load datasets', 'error');
    }
  }

  applyCatalogResponse(response) {
    if (!response) {
      return;
    }

    this.datasets = Array.isArray(response.datasets) ? response.datasets : [];
    this.catalogErrors = Array.isArray(response.errors) ? response.errors : [];
    this.catalogLastUpdated = response.lastUpdated || null;
    this.catalogDir = response.catalogDir || null;

    this.renderDatasetList();
    this.renderCatalogErrors();
    this.updateCatalogStatus();
  }

  renderDatasetList() {
    const datasetList = document.getElementById('dataset-list');
    datasetList.innerHTML = '';

    if (!this.datasets.length) {
      const emptyState = document.createElement('div');
      emptyState.className = 'empty-state';
      emptyState.textContent = 'No datasets available.';
      datasetList.appendChild(emptyState);
      return;
    }

    this.datasets.forEach(dataset => {
      const item = document.createElement('div');
      item.className = 'dataset-item';
      item.dataset.id = dataset.id;

      item.innerHTML = `
        <div class="dataset-name">${dataset.name}</div>
        <div class="dataset-type">${dataset.mediaType}${dataset.format ? ` · ${dataset.format}` : ''}</div>
      `;

      item.addEventListener('click', () => {
        this.loadDataset(dataset.id);
      });

      datasetList.appendChild(item);
    });

    if (this.currentDataset) {
      this.highlightDataset(this.currentDataset.id);
    }
  }
  
  async loadDataset(datasetId) {
    try {
      if (window.electronAPI) {
        const result = await window.electronAPI.loadDataset(datasetId);

        if (result && result.success) {
          const dataset = result.dataset || this.datasets.find(d => d.id === datasetId);
          if (dataset) {
            this.currentDataset = dataset;
            this.updateDatasetInfo(dataset);
            this.highlightDataset(datasetId);
          }
          this.showNotification('Dataset loaded successfully', 'success');
        } else {
          const errorMessage = (result && result.error) || 'Failed to load dataset';
          this.showNotification(errorMessage, 'error');
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
      <p><strong>Media Type:</strong> ${dataset.mediaType}</p>
      ${dataset.format ? `<p><strong>Format:</strong> ${dataset.format}</p>` : ''}
      <p><strong>Source:</strong> ${dataset.sourceUri}</p>
      ${dataset.description ? `<p>${dataset.description}</p>` : ''}
      ${dataset.catalogFile ? `<p class="dataset-origin">Catalog: ${dataset.catalogFile}</p>` : ''}
    `;
  }

  renderCatalogErrors() {
    const container = document.getElementById('catalog-errors');
    if (!container) {
      return;
    }

    container.innerHTML = '';

    if (!this.catalogErrors.length) {
      const message = document.createElement('div');
      message.className = 'catalog-message';
      message.textContent = 'No validation issues detected.';
      container.appendChild(message);
      container.classList.remove('has-errors');
      return;
    }

    container.classList.add('has-errors');

    const list = document.createElement('ul');
    list.className = 'catalog-error-list';

    this.catalogErrors.forEach((error) => {
      const item = document.createElement('li');
      const source = error.file ? `${error.file}` : error.type;
      const datasetInfo = error.datasetId ? ` (dataset: ${error.datasetId})` : '';
      item.innerHTML = `<span class="error-source">${source}:</span> ${error.message}${datasetInfo}`;
      list.appendChild(item);
    });

    container.appendChild(list);
  }

  updateCatalogStatus() {
    const lastUpdated = document.getElementById('catalog-last-updated');
    const directory = document.getElementById('catalog-directory');

    if (lastUpdated) {
      lastUpdated.textContent = this.catalogLastUpdated
        ? `Last loaded: ${new Date(this.catalogLastUpdated).toLocaleString()}`
        : 'Catalogs have not been loaded yet.';
    }

    if (directory) {
      directory.textContent = this.catalogDir ? `Source: ${this.catalogDir}` : '';
    }
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
