// kiosk-app/js/main.js
class KioskApp {
  constructor() {
    this.socket = null;
    this.sliceId = null;
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
  }
  
  connectToServer() {
    const serverUrl = `ws://${window.location.hostname}:8080?type=kiosk`;
    
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
        
      case 'slice-assignment':
        this.handleSliceAssignment(message.slices);
        break;
        
      case 'slice-update':
        // Update slice display if not controlled by this kiosk
        break;

      case 'resolution-change':
        if (message.data) {
          this.renderResolution = message.data;
          console.log(`Render resolution updated to ${this.renderResolution.width}x${this.renderResolution.height}`);
        }
        break;
    }
  }
  
  handleSliceAssignment(slices) {
    // Find slice assigned to this kiosk
    const clientId = this.getClientId();
    const assignedSlice = slices.find(slice => slice.clientId === clientId);
    
    if (assignedSlice) {
      this.sliceId = assignedSlice.sliceId;
      this.showNotification(`Controlling slice ${this.sliceId + 1}`, 'success');
      
      // Update UI to show slice info
      this.updateSliceInfo();
    }
  }
  
  getClientId() {
    // Extract client ID from WebSocket connection
    if (this.socket && this.socket.url) {
      const url = new URL(this.socket.url);
      return url.searchParams.get('clientId');
    }
    return null;
  }
  
  setupUI() {
    // Setup simplified playlist
    this.setupPlaylist();
    
    // Setup dataset info display
    this.setupDatasetInfo();
    
    // Setup slice info display
    this.setupSliceInfo();
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
      this.sendSliceUpdate();
      
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
          
          this.sendSliceUpdate();
        }
        
        lastDistance = distance;
      }
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
  
  setupDatasetInfo() {
    // Display will be updated when dataset is loaded
  }
  
  setupSliceInfo() {
    const sliceInfo = document.getElementById('slice-info');
    if (sliceInfo && this.sliceId !== null) {
      sliceInfo.textContent = `Controlling Slice ${this.sliceId + 1}`;
    }
  }
  
  sendSliceUpdate() {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN || this.sliceId === null) return;
    
    this.socket.send(JSON.stringify({
      type: 'control-slice',
      sliceId: this.sliceId,
      controls: {
        rotation: this.sphereControls.rotation,
        zoom: this.sphereControls.zoom
      }
    }));
  }
  
  loadDataset(datasetId) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;
    
    this.socket.send(JSON.stringify({
      type: 'load-dataset',
      datasetId: datasetId
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
  new KioskApp();
});
