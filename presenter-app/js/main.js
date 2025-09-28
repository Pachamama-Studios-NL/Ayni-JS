// presenter-app/js/main.js
class PresenterApp {
  constructor() {
    this.socket = null;
    this.sphereControls = {
      rotation: { x: 0, y: 0 },
      zoom: 0,
      isDragging: false
    };
    this.renderResolution = { width: 2048, height: 1024 };
    
    this.init();
  }
  
  init() {
    // Connect to WebSocket server
    this.connectToServer();
    
    // Setup UI
    this.setupUI();
    
    // Setup touch controls
    this.setupTouchControls();
    
    // Setup media controls
    this.setupMediaControls();
  }
  
  connectToServer() {
    const serverUrl = `ws://${window.location.hostname}:8080?type=presenter`;
    
    this.socket = new WebSocket(serverUrl);
    
    this.socket.onopen = () => {
      console.log('Connected to server');
      this.showNotification('Connected to sphere', 'success');
    };
    
    this.socket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      this.handleServerMessage(message);
    };
    
    this.socket.onclose = () => {
      console.log('Disconnected from server');
      this.showNotification('Disconnected from sphere', 'error');
      
      // Attempt to reconnect
      setTimeout(() => this.connectToServer(), 3000);
    };
    
    this.socket.onerror = (error) => {
      console.error('WebSocket error:', error);
      this.showNotification('Connection error', 'error');
    };
  }
  
  handleServerMessage(message) {
    switch (message.type) {
      case 'connection':
        console.log(`Connected as ${message.clientType} with ID ${message.clientId}`);
        break;
        
      case 'sphere-update':
        // Update local sphere state if needed
        break;

      case 'slice-update':
        // Update slice display
        break;

      case 'resolution-change':
        if (message.data) {
          this.renderResolution = message.data;
          console.log(`Render resolution updated to ${this.renderResolution.width}x${this.renderResolution.height}`);
        }
        break;
    }
  }
  
  setupUI() {
    // Setup playlist UI
    this.setupPlaylist();
    
    // Setup dataset search
    this.setupSearch();
    
    // Setup slice controls
    this.setupSliceControls();
  }
  
  setupTouchControls() {
    const sphereContainer = document.getElementById('sphere-container');
    
    // Touch events for rotation
    sphereContainer.addEventListener('touchstart', (e) => {
      this.sphereControls.isDragging = true;
      this.sphereControls.lastTouch = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY
      };
    });
    
    sphereContainer.addEventListener('touchmove', (e) => {
      if (!this.sphereControls.isDragging) return;
      
      const touch = e.touches[0];
      const deltaX = touch.clientX - this.sphereControls.lastTouch.x;
      const deltaY = touch.clientY - this.sphereControls.lastTouch.y;
      
      // Update rotation
      this.sphereControls.rotation.y += deltaX * 0.01;
      this.sphereControls.rotation.x += deltaY * 0.01;
      
      // Send update to server
      this.sendSphereUpdate();
      
      this.sphereControls.lastTouch = {
        x: touch.clientX,
        y: touch.clientY
      };
    });
    
    sphereContainer.addEventListener('touchend', () => {
      this.sphereControls.isDragging = false;
    });
    
    // Pinch to zoom
    let lastDistance = 0;
    
    sphereContainer.addEventListener('touchstart', (e) => {
      if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        lastDistance = Math.sqrt(dx * dx + dy * dy);
      }
    });
    
    sphereContainer.addEventListener('touchmove', (e) => {
      if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (lastDistance > 0) {
          const scale = distance / lastDistance;
          this.sphereControls.zoom *= scale;
          this.sphereControls.zoom = Math.max(0, Math.min(0.85, this.sphereControls.zoom));
          
          this.sendSphereUpdate();
        }
        
        lastDistance = distance;
      }
    });
  }
  
  setupMediaControls() {
    const playButton = document.getElementById('play-button');
    const pauseButton = document.getElementById('pause-button');
    const volumeSlider = document.getElementById('volume-slider');
    
    playButton.addEventListener('click', () => {
      this.sendMediaControl('play');
    });
    
    pauseButton.addEventListener('click', () => {
      this.sendMediaControl('pause');
    });
    
    volumeSlider.addEventListener('input', (e) => {
      this.sendMediaControl('volume', e.target.value);
    });
  }
  
  setupSliceControls() {
    const sliceCountSlider = document.getElementById('slice-count');
    const applyButton = document.getElementById('apply-slices');
    
    applyButton.addEventListener('click', () => {
      const sliceCount = parseInt(sliceCountSlider.value);
      this.sendSliceControl(sliceCount);
    });
  }
  
  setupPlaylist() {
    // Load playlist from server
    this.loadPlaylist();
    
    // Setup playlist item selection
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('playlist-item')) {
        const datasetId = e.target.dataset.id;
        this.loadDataset(datasetId);
      }
    });
  }
  
  setupSearch() {
    const searchInput = document.getElementById('search-input');
    const searchButton = document.getElementById('search-button');
    
    searchButton.addEventListener('click', () => {
      const query = searchInput.value;
      this.searchDatasets(query);
    });
    
    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        const query = searchInput.value;
        this.searchDatasets(query);
      }
    });
  }
  
  sendSphereUpdate() {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;
    
    this.socket.send(JSON.stringify({
      type: 'control-sphere',
      rotation: this.sphereControls.rotation,
      zoom: this.sphereControls.zoom
    }));
  }
  
  sendMediaControl(action, value = null) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;
    
    this.socket.send(JSON.stringify({
      type: 'media-control',
      action: action,
      value: value
    }));
  }
  
  sendSliceControl(sliceCount) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;
    
    this.socket.send(JSON.stringify({
      type: 'request-slice',
      sliceCount: sliceCount
    }));
  }
  
  loadDataset(datasetId) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;
    
    this.socket.send(JSON.stringify({
      type: 'load-dataset',
      datasetId: datasetId
    }));
  }
  
  searchDatasets(query) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;
    
    this.socket.send(JSON.stringify({
      type: 'search-datasets',
      query: query
    }));
  }
  
  loadPlaylist() {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;
    
    this.socket.send(JSON.stringify({
      type: 'load-playlist'
    }));
  }
  
  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.classList.add('show');
    }, 10);
    
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => {
        document.body.removeChild(notification);
      }, 300);
    }, 3000);
  }
}

// Initialize the app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new PresenterApp();
});
