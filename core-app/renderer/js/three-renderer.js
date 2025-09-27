import * as THREE from 'three';

class SphereRenderer {
  constructor(canvasId) {
    console.log('Creating SphereRenderer with canvas ID:', canvasId);
    
    this.canvas = document.getElementById(canvasId);
    
    if (!this.canvas) {
      console.error('Canvas element not found with ID:', canvasId);
      return;
    }
    
    console.log('Canvas element found:', this.canvas);
    
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.sphere = null;
    this.texture = null;
    
    this.sphereState = {
      rotation: { x: 0, y: 0 },
      zoom: 0,
      sliceConfig: {
        count: 1,
        angle: 360,
        overlap: 0
      }
    };
    
    this.sliceStates = new Map();
    this.isInitialized = false;
    this.isDragging = false;
    this.previousMousePosition = { x: 0, y: 0 };
    
    // Configuration for better control
    this.config = {
      rotationSpeed: 0.005,
      maxZoomPercentage: 0.85
    };
    
    this.init();
  }
  
  init() {
    try {
      console.log('Initializing SphereRenderer...');
      
      // Create scene
      this.scene = new THREE.Scene();
      this.scene.background = new THREE.Color(0x000000);
      console.log('Scene created');
      
      // Create camera
      this.camera = new THREE.PerspectiveCamera(75, this.canvas.clientWidth / this.canvas.clientHeight, 0.1, 1000);
      this.camera.position.z = 15;
      console.log('Camera created');
      
      // Create renderer
      this.renderer = new THREE.WebGLRenderer({
        canvas: this.canvas,
        antialias: true,
        alpha: true
      });
      
      this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      console.log('Renderer created');
      
      // Create sphere
      this.setupSphere();
      
      // Add sphere to scene
      this.scene.add(this.sphere);
      console.log('Sphere added to scene');
      
      // Setup mouse controls
      this.setupMouseControls();
      
      // Handle window resize
      window.addEventListener('resize', () => this.handleResize());
      
      this.isInitialized = true;
      console.log('SphereRenderer initialized successfully');
      
      // Start animation loop
      this.animate();
      
      // Hide loading indicator
      const loadingIndicator = document.getElementById('loading-indicator');
      if (loadingIndicator) {
        loadingIndicator.style.display = 'none';
        console.log('Loading indicator hidden');
      }
    } catch (error) {
      console.error('Error initializing SphereRenderer:', error);
    }
  }
  
  setupSphere() {
    console.log('Setting up sphere...');
    
    try {
      // Create a canvas texture with 2:1 aspect ratio
      const canvas = document.createElement('canvas');
      canvas.width = 2048;  // 2:1 aspect ratio
      canvas.height = 1024;
      const ctx = canvas.getContext('2d');
      
      console.log('Canvas created:', canvas.width, 'x', canvas.height);
      
      // Create a simple gradient
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      gradient.addColorStop(0, '#3498db');
      gradient.addColorStop(1, '#2980b9');
      
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Add some text
      ctx.fillStyle = 'white';
      ctx.font = '96px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('LED Sphere Control', canvas.width/2, canvas.height/2);
      
      console.log('Canvas drawing complete');
      
      // Create texture from canvas
      this.texture = new THREE.CanvasTexture(canvas);
      console.log('Texture created');
      
      // Create sphere geometry
      const geometry = new THREE.SphereGeometry(10, 64, 32);
      console.log('Sphere geometry created');
      
      // Create material with the texture
      const material = new THREE.MeshBasicMaterial({
        map: this.texture,
        side: THREE.BackSide
      });
      console.log('Sphere material created');
      
      this.sphere = new THREE.Mesh(geometry, material);
      console.log('Sphere mesh created');
      
    } catch (error) {
      console.error('Error setting up sphere:', error);
    }
  }
  
  setupMouseControls() {
    this.canvas.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      this.previousMousePosition = {
        x: e.clientX,
        y: e.clientY
      };
      this.canvas.style.cursor = 'grabbing';
    });
    
    this.canvas.addEventListener('mousemove', (e) => {
      if (!this.isDragging) return;
      
      const deltaX = e.clientX - this.previousMousePosition.x;
      const deltaY = e.clientY - this.previousMousePosition.y;
      
      // Update sphere rotation directly
      this.sphere.rotation.y += deltaX * this.config.rotationSpeed;
      this.sphere.rotation.x += deltaY * this.config.rotationSpeed;
      
      // Clamp rotation
      this.sphere.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.sphere.rotation.x));
      
      // Update sphere state for UI
      this.sphereState.rotation.x = THREE.MathUtils.radToDeg(this.sphere.rotation.x);
      this.sphereState.rotation.y = THREE.MathUtils.radToDeg(this.sphere.rotation.y);
      
      // Send update to UI - with error handling
      try {
        if (window.uiController) {
          window.uiController.updateSphereUI(this.sphereState);
        }
      } catch (error) {
        console.error('Error updating UI:', error);
      }
      
      this.previousMousePosition = {
        x: e.clientX,
        y: e.clientY
      };
    });
    
    this.canvas.addEventListener('mouseup', () => {
      this.isDragging = false;
      this.canvas.style.cursor = 'grab';
    });
    
    this.canvas.addEventListener('mouseleave', () => {
      this.isDragging = false;
      this.canvas.style.cursor = 'grab';
    });
    
    // Add wheel zoom
    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.sphereState.zoom += e.deltaY * -0.001;
      this.sphereState.zoom = Math.max(0, Math.min(this.config.maxZoomPercentage, this.sphereState.zoom));
      
      // Update sphere scale based on zoom
      const scale = 1 + this.sphereState.zoom * 2;
      this.sphere.scale.set(scale, scale, scale);
      
      // Send update to UI - with error handling
      try {
        if (window.uiController) {
          window.uiController.updateSphereUI(this.sphereState);
        }
      } catch (error) {
        console.error('Error updating UI:', error);
      }
    });
    
    // Set initial cursor style
    this.canvas.style.cursor = 'grab';
  }
  
  updateSphereScale() {
    // Update sphere scale based on zoom
    const scale = 1 + this.sphereState.zoom * 2;
    this.sphere.scale.set(scale, scale, scale);
  }
  
  resetView() {
    this.sphere.rotation.set(0, 0, 0);
    this.sphere.scale.set(1, 1, 1);
    this.sphereState.rotation = { x: 0, y: 0 };
    this.sphereState.zoom = 0;
    
    // Send update to UI - with error handling
    try {
      if (window.uiController) {
        window.uiController.updateSphereUI(this.sphereState);
      }
    } catch (error) {
      console.error('Error updating UI:', error);
    }
  }
  
  updateSphere(state) {
    if (!this.isInitialized) return;
    
    this.sphereState = { ...this.sphereState, ...state };
    
    if (state.rotation) {
      this.sphere.rotation.x = THREE.MathUtils.degToRad(state.rotation.x);
      this.sphere.rotation.y = THREE.MathUtils.degToRad(state.rotation.y);
    }
    
    if (state.zoom !== undefined) {
      this.sphereState.zoom = state.zoom;
      this.updateSphereScale();
    }
    
    if (state.sliceConfig) {
      this.sphereState.sliceConfig = state.sliceConfig;
    }
  }
  
  updateSlice(sliceId, state) {
    this.sliceStates.set(sliceId, state);
    // Handle slice-specific rendering logic
  }
  
  loadTexture(texture) {
    if (texture) {
      // Dispose of the old texture if it exists
      if (this.texture) {
        this.texture.dispose();
      }
      
      // Set the new texture
      this.texture = texture;
      
      // Update sphere material
      if (this.sphere && this.sphere.material) {
        this.sphere.material.map = texture;
        this.sphere.material.needsUpdate = true;
      }
    }
  }
  
  handleResize() {
    if (this.renderer && this.camera) {
      this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight);
      
      // Update perspective camera
      this.camera.aspect = this.canvas.clientWidth / this.canvas.clientHeight;
      this.camera.updateProjectionMatrix();
    }
  }
  
  animate() {
    requestAnimationFrame(() => this.animate());
    
    if (!this.isInitialized) {
      console.log('Renderer not initialized');
      return;
    }
    
    try {
      // Check if all components are available
      if (!this.renderer) {
        console.error('Renderer not available');
        return;
      }
      
      if (!this.scene) {
        console.error('Scene not available');
        return;
      }
      
      if (!this.camera) {
        console.error('Camera not available');
        return;
      }
      
      if (!this.sphere) {
        console.error('Sphere not available');
        return;
      }
      
      // Log sphere state for debugging
      if (Math.random() < 0.01) { // Only log occasionally to avoid spam
        console.log('Sphere state:', {
          position: {
            x: this.sphere.position.x,
            y: this.sphere.position.y,
            z: this.sphere.position.z
          },
          rotation: {
            x: THREE.MathUtils.radToDeg(this.sphere.rotation.x),
            y: THREE.MathUtils.radToDeg(this.sphere.rotation.y),
            z: THREE.MathUtils.radToDeg(this.sphere.rotation.z)
          },
          scale: {
            x: this.sphere.scale.x,
            y: this.sphere.scale.y,
            z: this.sphere.scale.z
          }
        });
      }
      
      // Render scene
      this.renderer.render(this.scene, this.camera);
    } catch (error) {
      console.error('Error in animation loop:', error);
    }
  }
  
  dispose() {
    if (this.renderer) {
      this.renderer.dispose();
    }
    
    if (this.sphere && this.sphere.geometry) {
      this.sphere.geometry.dispose();
    }
    
    if (this.sphere && this.sphere.material) {
      if (this.sphere.material.map) {
        this.sphere.material.map.dispose();
      }
      this.sphere.material.dispose();
    }
    
    if (this.texture) {
      this.texture.dispose();
    }
    
    this.isInitialized = false;
  }
}

// Initialize the renderer when the DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  try {
    window.sphereRenderer = new SphereRenderer('sphere-canvas');
    console.log('SphereRenderer initialized successfully');
  } catch (error) {
    console.error('Error initializing SphereRenderer:', error);
  }
});
