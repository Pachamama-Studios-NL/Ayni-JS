import * as THREE from 'three';

class UIController {
  constructor() {
    this.currentDataset = null;
    this.datasets = [];


    this.catalogErrors = [];
    this.catalogLastUpdated = null;
    this.catalogDir = null;


    this.resolutionPresets = new Map([
      ['1024x512', { width: 1024, height: 512 }],
      ['2048x1024', { width: 2048, height: 1024 }],
      ['3072x1536', { width: 3072, height: 1536 }],
      ['4096x2048', { width: 4096, height: 2048 }]
    ]);
    this.currentResolution = { width: 2048, height: 1024 };


    this.mediaElement = null;

    this.electronAPI = null;
    this.ipcListenersAttached = false;


    this.init();
  }

  init() {
    this.setupEventListeners();

    this.loadDatasets({ silent: true });

    this.setupIPCListeners();

    this.initializeResolutionControls();


    this.configureMediaControls();

    this.loadDatasets();


    this.unsubscribeFunctions = []; // Store unsubscribe functions
    this.THREE = null; // Will hold the THREE module
    
    this.init();
  }
  
  async init() {
    try {
      // Dynamically import THREE
      this.THREE = await import('three');
      console.log('THREE module loaded:', this.THREE);
      
      // Check if required UI elements exist
      this.checkUIElements();
      
      this.setupEventListeners();
      this.loadDatasets();
      this.setupIPCListeners();
    } catch (error) {
      console.error('Error initializing UI controller:', error);
      this.showNotification('Failed to initialize application', 'error');
    }
  }

  checkUIElements() {
    const requiredElements = [
      'rotation-x',
      'rotation-x-value',
      'rotation-y',
      'rotation-y-value',
      'zoom',
      'zoom-value',
      'slice-count',
      'apply-slices',
      'play-btn',
      'pause-btn',
      'stop-btn',
      'volume',
      'dataset-list',
      'dataset-info',
      'notification-container'
    ];
    
    const missingElements = [];
    
    requiredElements.forEach(id => {
      if (!document.getElementById(id)) {
        missingElements.push(id);
      }
    });
    
    if (missingElements.length > 0) {
      console.warn('Missing UI elements:', missingElements);
      this.showNotification('Some UI elements are missing. The application may not work correctly.', 'warning');
    }

  }

  setupEventListeners() {
    // Sphere controls
    const rotationX = document.getElementById('rotation-x');
    const rotationY = document.getElementById('rotation-y');
    const zoom = document.getElementById('zoom');
    
    if (rotationX) {
      rotationX.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        if (document.getElementById('rotation-x-value')) {
          document.getElementById('rotation-x-value').textContent = `${value}°`;
        }
        this.updateSphereState({ rotation: { x: value } });
      });
    }
    
    if (rotationY) {
      rotationY.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        if (document.getElementById('rotation-y-value')) {
          document.getElementById('rotation-y-value').textContent = `${value}°`;
        }
        this.updateSphereState({ rotation: { y: value } });
      });
    }
    
    if (zoom) {
      zoom.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        if (document.getElementById('zoom-value')) {
          document.getElementById('zoom-value').textContent = `${value}%`;
        }
        this.updateSphereState({ zoom: value / 100 });
      });
    }
    
    // Slice controls
    const applySlices = document.getElementById('apply-slices');
    if (applySlices) {
      applySlices.addEventListener('click', () => {
        const sliceCount = parseInt(document.getElementById('slice-count').value);
        const sliceAngle = 360 / sliceCount;  // Calculate angle based on slice count
        
        this.updateSphereState({
          sliceConfig: {
            count: sliceCount,
            angle: sliceAngle,
            overlap: 0
          }
        });
        
        this.showNotification(`Applied ${sliceCount} slices`, 'success');
      });
    }
    
    // Reset view button
    const resetViewBtn = document.getElementById('reset-view');
    if (resetViewBtn) {
      resetViewBtn.addEventListener('click', () => {
        if (window.sphereRenderer) {
          window.sphereRenderer.resetView();
        }
      });
    }
    
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


    const refreshCatalogs = document.getElementById('refresh-datasets');
    if (refreshCatalogs) {
      refreshCatalogs.addEventListener('click', () => {
        this.loadDatasets({ refresh: true });

    // Resolution controls
    const resolutionSelect = document.getElementById('resolution-select');
    const customWidthInput = document.getElementById('custom-resolution-width');

    if (resolutionSelect) {
      resolutionSelect.addEventListener('change', (event) => {
        const value = event.target.value;

        if (value === 'custom') {
          this.setCustomControlsEnabled(true);
          if (customWidthInput) {
            customWidthInput.focus();
          }
          return;
        }

        const preset = this.resolutionPresets.get(value);
        if (preset) {
          this.setCustomControlsEnabled(false);
          this.setResolution(preset, { broadcast: true });
        }
      });
    }

    if (customWidthInput) {
      customWidthInput.addEventListener('input', (event) => {
        const width = Number(event.target.value);
        const preview = this.sanitizeResolution({ width });
        this.updateCustomResolutionInput(preview, true);
        this.updateResolutionSummary(preview);
      });

      customWidthInput.addEventListener('change', (event) => {
        const width = Number(event.target.value);
        this.setResolution({ width }, { broadcast: true });


    const playBtn = document.getElementById('play-btn');
    const pauseBtn = document.getElementById('pause-btn');
    const stopBtn = document.getElementById('stop-btn');
    const volume = document.getElementById('volume');
    
    if (playBtn) {
      playBtn.addEventListener('click', () => {
        this.sendMediaControl('play');
      });
    }
    
    if (pauseBtn) {
      pauseBtn.addEventListener('click', () => {
        this.sendMediaControl('pause');
      });
    }
    
    if (stopBtn) {
      stopBtn.addEventListener('click', () => {
        this.sendMediaControl('stop');
      });
    }
    
    if (volume) {
      volume.addEventListener('input', (e) => {
        this.sendMediaControl('volume', parseFloat(e.target.value) / 100);

      });
    }
  }

  setupIPCListeners() {

    if (window.electronAPI) {
      // Listen for sphere updates from main process
      const unsubscribeSphereUpdate = window.electronAPI.onSphereUpdate((data) => {
        this.updateSphereUI(data);
      });
      this.unsubscribeFunctions.push(unsubscribeSphereUpdate);
      
      // Listen for slice updates
      const unsubscribeSliceUpdate = window.electronAPI.onSliceUpdate((data) => {
        this.updateSliceUI(data);
      });
      this.unsubscribeFunctions.push(unsubscribeSliceUpdate);
      
      // Listen for media controls
      const unsubscribeMediaControl = window.electronAPI.onMediaControl((data) => {
        this.handleMediaControl(data);
      });



      this.unsubscribeFunctions.push(unsubscribeMediaControl);
      

      // Listen for dataset loading
      const unsubscribeLoadDataset = window.electronAPI.onLoadDataset((data) => {
        this.handleDatasetLoaded(data);
      });


      if (window.electronAPI.onResolutionChange) {
        window.electronAPI.onResolutionChange((data) => {
          this.setResolution(data, { broadcast: false });
        });
      }

    const api = this.getElectronAPI();

    if (!api) {
      setTimeout(() => this.setupIPCListeners(), 100);
      return;
    }

    if (this.ipcListenersAttached) {
      return;


      this.unsubscribeFunctions.push(unsubscribeLoadDataset);

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


      
      // Add visual indicator if file exists
      const existsIndicator = dataset.exists ? '✓' : '✗';
      
      item.innerHTML = `
        <div class="dataset-name">${dataset.name} ${existsIndicator}</div>
        <div class="dataset-type">${dataset.type}</div>
      `;
      
      // Add disabled class if file doesn't exist
      if (!dataset.exists) {
        item.classList.add('disabled');
        item.title = 'File not found';
      } else {
        item.addEventListener('click', () => {
          this.loadDataset(dataset.id);
        });
      }

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

        const result = await window.electronAPI.loadDataset(datasetId);
        
        if (result.success) {
          // Update UI
          const dataset = this.datasets.find(d => d.id === datasetId);

          if (dataset) {
            this.currentDataset = dataset;
            this.updateDatasetInfo(dataset);
            this.highlightDataset(datasetId);

          }
          this.showNotification('Dataset loaded successfully', 'success');
        } else {
          const errorMessage = (result && result.error) || 'Failed to load dataset';
          this.showNotification(errorMessage, 'error');

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


            
            // Load the texture
            this.loadDatasetTexture(dataset);
          }
        } else {
          this.showNotification(`Failed to load dataset: ${result.error}`, 'error');

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

  
  async loadDatasetTexture(dataset) {
    try {
      if (!this.THREE) {
        console.error('THREE module not loaded');
        return;
      }
      
      let texture;
      
      if (dataset.type === 'image') {
        // Load image texture
        const textureLoader = new this.THREE.TextureLoader();
        
        // Create a promise to handle texture loading
        const loadPromise = new Promise((resolve, reject) => {
          textureLoader.load(
            dataset.path,
            (loadedTexture) => {
              console.log('Texture loaded successfully');
              
              // Ensure the texture has the correct aspect ratio
              const image = loadedTexture.image;
              const aspectRatio = image.width / image.height;
              
              if (Math.abs(aspectRatio - 2.0) > 0.1) {
                console.warn(`Texture has aspect ratio ${aspectRatio}, expected 2:1`);
                
                // Create a canvas to adjust the aspect ratio
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                // Set canvas dimensions to 2:1 aspect ratio
                if (aspectRatio > 2.0) {
                  // Image is wider than 2:1, crop the width
                  canvas.width = image.height * 2;
                  canvas.height = image.height;
                  
                  // Calculate crop position
                  const cropX = (image.width - canvas.width) / 2;
                  
                  // Draw the cropped image
                  ctx.drawImage(image, cropX, 0, canvas.width, canvas.height, 0, 0, canvas.width, canvas.height);
                } else {
                  // Image is taller than 2:1, crop the height
                  canvas.width = image.width;
                  canvas.height = image.width / 2;
                  
                  // Calculate crop position
                  const cropY = (image.height - canvas.height) / 2;
                  
                  // Draw the cropped image
                  ctx.drawImage(image, 0, cropY, canvas.width, canvas.height, 0, 0, canvas.width, canvas.height);
                }
                
                // Create a new texture from the canvas
                const adjustedTexture = new this.THREE.CanvasTexture(canvas);
                resolve(adjustedTexture);
              } else {
                // Texture has correct aspect ratio, use as-is
                resolve(loadedTexture);
              }
            },
            undefined,
            (error) => {
              console.error('Error loading texture:', error);
              reject(error);
            }
          );
        });
        
        texture = await loadPromise;
        
        // Set texture properties
        texture.generateMipmaps = false;
        texture.minFilter = this.THREE.LinearFilter;
        texture.magFilter = this.THREE.LinearFilter;
        
        this.showNotification('Dataset loaded successfully', 'success');
      } else if (dataset.type === 'video') {
        // For videos, we'll create a placeholder texture with 2:1 aspect ratio
        const canvas = document.createElement('canvas');
        canvas.width = 2048;  // 2:1 aspect ratio
        canvas.height = 1024;
        const ctx = canvas.getContext('2d');
        
        // Create a simple gradient for video placeholder
        const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        gradient.addColorStop(0, '#e74c3c');
        gradient.addColorStop(1, '#c0392b');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Add text
        ctx.fillStyle = 'white';
        ctx.font = '96px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(dataset.name, canvas.width/2, canvas.height/2);
        
        texture = new this.THREE.CanvasTexture(canvas);
        
        this.showNotification('Video dataset loaded (placeholder)', 'success');
      }
      
      // Apply to sphere
      if (window.sphereRenderer) {
        window.sphereRenderer.loadTexture(texture);
      }
    } catch (error) {
      console.error('Error loading dataset texture:', error);
      this.showNotification('Failed to load dataset texture: ' + error.message, 'error');
    }
  }
  

  updateDatasetInfo(dataset) {
    const info = document.getElementById('dataset-info');
    const existsText = dataset.exists ? '✓ File exists' : '✗ File not found';
    
    info.innerHTML = `
      <h3>${dataset.name}</h3>

      <p><strong>Media Type:</strong> ${dataset.mediaType}</p>
      ${dataset.format ? `<p><strong>Format:</strong> ${dataset.format}</p>` : ''}
      <p><strong>Source:</strong> ${dataset.sourceUri}</p>
      ${dataset.description ? `<p>${dataset.description}</p>` : ''}
      ${dataset.catalogFile ? `<p class="dataset-origin">Catalog: ${dataset.catalogFile}</p>` : ''}

      <p><strong>Type:</strong> ${dataset.type}</p>
      <p><strong>Description:</strong> ${dataset.description}</p>
      <p><strong>Status:</strong> ${existsText}</p>

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
  
  // In the updateSphereUI method, add slice configuration handling
  updateSphereUI(data) {
    if (!data) return;
    
    // Safely update rotation X
    if (data.rotation && data.rotation.x !== undefined) {
      const rotationX = document.getElementById('rotation-x');
      const rotationXValue = document.getElementById('rotation-x-value');
      
      if (rotationX) {
        rotationX.value = data.rotation.x;
      }
      
      if (rotationXValue) {
        rotationXValue.textContent = `${data.rotation.x}°`;
      }
    }
    
    // Safely update rotation Y
    if (data.rotation && data.rotation.y !== undefined) {
      const rotationY = document.getElementById('rotation-y');
      const rotationYValue = document.getElementById('rotation-y-value');
      
      if (rotationY) {
        rotationY.value = data.rotation.y;
      }
      
      if (rotationYValue) {
        rotationYValue.textContent = `${data.rotation.y}°`;
      }
    }
    
    // Safely update zoom
    if (data.zoom !== undefined) {
      const zoom = document.getElementById('zoom');
      const zoomValue = document.getElementById('zoom-value');
      
      if (zoom) {
        zoom.value = data.zoom * 100;
      }
      
      if (zoomValue) {
        zoomValue.textContent = `${Math.round(data.zoom * 100)}%`;
      }
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


  // In the setupEventListeners method, update the slice controls
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
      
      this.showNotification(`Applied ${sliceCount} slices with ${sliceAngle}° angle`, 'success');
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
        if (container.contains(notification)) {
          container.removeChild(notification);
        }
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


  initializeResolutionControls() {
    const initial = this.setResolution(this.currentResolution, { broadcast: true, force: true });
    if (initial) {
      this.updateResolutionSummary(initial);
    }
  }

  setResolution(resolution, { broadcast = false, force = false } = {}) {
    const sanitized = this.sanitizeResolution(resolution);
    let appliedResolution = sanitized;

    if (window.sphereRenderer && typeof window.sphereRenderer.setResolution === 'function') {
      appliedResolution = window.sphereRenderer.setResolution(sanitized);
    }

    const hasChanged = force || !this.areResolutionsEqual(appliedResolution, this.currentResolution);
    if (!hasChanged) {
      this.updateResolutionSelect(appliedResolution);
      this.updateCustomResolutionInput(appliedResolution, this.shouldUseCustom(appliedResolution));
      this.updateResolutionSummary(appliedResolution);
      return appliedResolution;
    }

    this.currentResolution = appliedResolution;
    const useCustom = this.shouldUseCustom(appliedResolution);

    this.updateResolutionSelect(appliedResolution);
    this.updateCustomResolutionInput(appliedResolution, useCustom);
    this.updateResolutionSummary(appliedResolution);

    if (broadcast && window.electronAPI && typeof window.electronAPI.sendResolutionChange === 'function') {
      window.electronAPI.sendResolutionChange(appliedResolution);
    }

    return appliedResolution;
  }

  sanitizeResolution(resolution = {}) {
    const minWidth = 512;
    const maxWidth = 4096;
    const minHeight = minWidth / 2;
    const maxHeight = 2048;

    let width = Number(resolution.width);
    let height = Number(resolution.height);

    if (!Number.isFinite(width) || width <= 0) {
      width = this.currentResolution.width;
    }

    width = Math.round(width);
    width = Math.min(maxWidth, Math.max(minWidth, width));

    if (!Number.isFinite(height) || height <= 0) {
      height = width / 2;
    }

    height = Math.round(height);
    height = Math.min(maxHeight, Math.max(minHeight, height));

    // Enforce a strict 2:1 aspect ratio
    width = Math.round(height * 2);

    if (width > maxWidth) {
      width = maxWidth;
      height = Math.round(width / 2);
    }

    if (height > maxHeight) {
      height = maxHeight;
      width = height * 2;
    }

    if (width < minWidth) {
      width = minWidth;
      height = Math.round(width / 2);
    }

    if (height < minHeight) {
      height = minHeight;
      width = height * 2;
    }

    return {
      width,
      height
    };
  }

  updateResolutionSelect(resolution) {
    const resolutionSelect = document.getElementById('resolution-select');
    if (!resolutionSelect) return;

    const presetEntry = Array.from(this.resolutionPresets.entries())
      .find(([, preset]) => this.areResolutionsEqual(preset, resolution));

    if (presetEntry) {
      resolutionSelect.value = presetEntry[0];
      this.setCustomControlsEnabled(false);
    } else {
      resolutionSelect.value = 'custom';
      this.setCustomControlsEnabled(true);
    }
  }

  updateCustomResolutionInput(resolution, enableCustom) {
    const customWidthInput = document.getElementById('custom-resolution-width');
    const customHeightLabel = document.getElementById('custom-resolution-height');
    const customContainer = document.getElementById('resolution-custom-controls');

    if (!customWidthInput || !customHeightLabel || !customContainer) {
      return;
    }

    customWidthInput.disabled = !enableCustom;
    customContainer.setAttribute('aria-hidden', enableCustom ? 'false' : 'true');
    customWidthInput.value = resolution.width;
    customHeightLabel.textContent = `${resolution.height}`;
  }

  updateResolutionSummary(resolution) {
    const summary = document.getElementById('resolution-summary');
    if (!summary) return;

    const target = resolution || this.currentResolution;
    summary.textContent = `${target.width} × ${target.height}`;
  }

  setCustomControlsEnabled(enabled) {
    const customContainer = document.getElementById('resolution-custom-controls');
    const customWidthInput = document.getElementById('custom-resolution-width');

    if (!customContainer || !customWidthInput) return;

    customContainer.setAttribute('aria-hidden', enabled ? 'false' : 'true');
    customWidthInput.disabled = !enabled;
  }

  shouldUseCustom(resolution) {
    return !Array.from(this.resolutionPresets.values()).some((preset) => this.areResolutionsEqual(preset, resolution));
  }

  areResolutionsEqual(a, b) {
    if (!a || !b) return false;
    return a.width === b.width && a.height === b.height;

  
  cleanup() {
    // Unsubscribe from all IPC listeners
    this.unsubscribeFunctions.forEach(unsubscribe => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    });
    this.unsubscribeFunctions = [];

  }
}

// Initialize the UI controller when the DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.uiController = new UIController();
  
  // Cleanup when the page is unloaded
  window.addEventListener('beforeunload', () => {
    if (window.uiController) {
      window.uiController.cleanup();
    }
  });
});
