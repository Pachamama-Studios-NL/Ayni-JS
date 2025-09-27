import * as THREE from 'three';

class UIController {
  constructor() {
    this.currentDataset = null;
    this.datasets = [];
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
      this.unsubscribeFunctions.push(unsubscribeLoadDataset);
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
  }
  
  async loadDataset(datasetId) {
    try {
      if (window.electronAPI) {
        const result = await window.electronAPI.loadDataset(datasetId);
        
        if (result.success) {
          // Update UI
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
      <p><strong>Type:</strong> ${dataset.type}</p>
      <p><strong>Description:</strong> ${dataset.description}</p>
      <p><strong>Status:</strong> ${existsText}</p>
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
