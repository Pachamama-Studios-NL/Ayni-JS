import * as THREE from 'three';

class SphereRenderer {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.sphere = null;
    this.cubeCamera = null;
    this.outputPlane = null;
    
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

    this.renderResolution = { width: 2048, height: 1024 };
    this.maxRenderResolution = { width: 4096, height: 2048 };

    this.init();
  }
  
  init() {
    // Initialize Three.js components
    this.setupScene();
    this.setupCamera();
    this.setupRenderer();
    this.setupSphere();
    this.setupCubeCamera();
    this.setupOutputPlane();
    
    // Start animation loop
    this.animate();
    
    // Hide loading indicator
    const loadingIndicator = document.getElementById('loading-indicator');
    if (loadingIndicator) {
      loadingIndicator.style.display = 'none';
    }
  }
  
  setupScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000000);
  }
  
  setupCamera() {
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
    this.camera.position.z = 1;
  }
  
  setupRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true
    });

    this.applyRenderResolution();

    // Handle window resize
    window.addEventListener('resize', () => this.handleResize());
  }
  
  setupSphere() {
    const geometry = new THREE.SphereGeometry(10, 64, 32);
    const material = new THREE.MeshBasicMaterial({
      color: 0x888888,
      side: THREE.BackSide
    });
    
    this.sphere = new THREE.Mesh(geometry, material);
    this.scene.add(this.sphere);
  }
  
  setupCubeCamera() {
    this.cubeCamera = new THREE.CubeCamera(1, 1000, 2048);
    this.scene.add(this.cubeCamera);
  }
  
  setupOutputPlane() {
    const vertexShader = `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `;
    
    const fragmentShader = `
      uniform samplerCube tCube;
      varying vec2 vUv;
      const float PI = 3.141592653589793;
      
      void main() {
        float lon = vUv.x * 2.0 * PI - PI;
        float lat = vUv.y * PI;
        float x = cos(lat) * sin(lon);
        float y = sin(lat);
        float z = cos(lat) * cos(lon);
        vec3 direction = normalize(vec3(x, y, z));
        gl_FragColor = textureCube(tCube, direction);
      }
    `;
    
    const planeGeometry = new THREE.PlaneGeometry(2, 2);
    const planeMaterial = new THREE.ShaderMaterial({
      uniforms: {
        tCube: { value: this.cubeCamera.renderTarget.texture }
      },
      vertexShader,
      fragmentShader,
      side: THREE.DoubleSide
    });
    
    this.outputPlane = new THREE.Mesh(planeGeometry, planeMaterial);
    this.scene.add(this.outputPlane);
  }
  
  updateSphere(state) {
    this.sphereState = { ...this.sphereState, ...state };
    
    if (this.sphere) {
      this.sphere.rotation.x = THREE.MathUtils.degToRad(this.sphereState.rotation.x);
      this.sphere.rotation.y = THREE.MathUtils.degToRad(this.sphereState.rotation.y);
      
      // Update zoom by adjusting camera position
      const zoomDistance = this.sphereState.zoom * 10;
      const direction = new THREE.Vector3(0, 0, 1);
      this.cubeCamera.position.copy(direction.multiplyScalar(zoomDistance));
    }
  }
  
  updateSlice(sliceId, state) {
    this.sliceStates.set(sliceId, state);
    // Handle slice-specific rendering logic
  }
  
  loadTexture(texture) {
    if (this.sphere && this.sphere.material) {
      this.sphere.material.map = texture;
      this.sphere.material.needsUpdate = true;
    }
  }
  
  handleResize() {
    if (this.renderer && this.camera) {
      this.applyRenderResolution();

      // Update orthographic camera
      const aspect = this.canvas.clientWidth / this.canvas.clientHeight;
      this.camera.left = -aspect;
      this.camera.right = aspect;
      this.camera.updateProjectionMatrix();
    }
  }

  setResolution(resolution) {
    this.renderResolution = this.sanitizeResolution(resolution);
    this.applyRenderResolution();
    return this.renderResolution;
  }

  sanitizeResolution(resolution = {}) {
    const minWidth = 512;
    const minHeight = minWidth / 2;

    const widthValue = Number(resolution.width);
    const heightValue = Number(resolution.height);

    const target = {
      width: Number.isFinite(widthValue) ? Math.round(widthValue) : this.renderResolution.width,
      height: Number.isFinite(heightValue) ? Math.round(heightValue) : this.renderResolution.height
    };

    if (target.width <= 0) {
      target.width = this.renderResolution.width;
    }

    if (target.height <= 0) {
      target.height = Math.round(target.width / 2);
    }

    target.width = Math.min(this.maxRenderResolution.width, Math.max(minWidth, target.width));
    target.height = Math.min(this.maxRenderResolution.height, Math.max(minHeight, target.height));

    // Enforce 2:1 aspect ratio (width = 2 * height)
    target.height = Math.min(this.maxRenderResolution.height, Math.max(minHeight, Math.round(target.width / 2)));
    target.width = Math.min(this.maxRenderResolution.width, Math.max(minWidth, target.height * 2));

    if (target.width > this.maxRenderResolution.width) {
      target.width = this.maxRenderResolution.width;
      target.height = Math.round(target.width / 2);
    }

    if (target.height > this.maxRenderResolution.height) {
      target.height = this.maxRenderResolution.height;
      target.width = target.height * 2;
    }

    if (target.width < minWidth) {
      target.width = minWidth;
      target.height = Math.round(target.width / 2);
    }

    if (target.height < minHeight) {
      target.height = minHeight;
      target.width = target.height * 2;
    }

    return target;
  }

  applyRenderResolution() {
    if (!this.renderer || !this.canvas) {
      return;
    }

    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    const width = this.renderResolution.width;
    const height = this.renderResolution.height;
    const cssWidth = Math.max(1, Math.round(width / pixelRatio));
    const cssHeight = Math.max(1, Math.round(height / pixelRatio));

    this.renderer.setPixelRatio(pixelRatio);
    this.renderer.setSize(cssWidth, cssHeight, false);

    this.canvas.width = width;
    this.canvas.height = height;

    if (this.cubeCamera && this.cubeCamera.renderTarget && typeof this.cubeCamera.renderTarget.setSize === 'function') {
      const cubeSize = Math.min(this.maxRenderResolution.height, Math.max(256, height));
      this.cubeCamera.renderTarget.setSize(cubeSize, cubeSize);
    }
  }
  
  animate() {
    requestAnimationFrame(() => this.animate());
    
    // Update cube camera
    if (this.cubeCamera) {
      this.cubeCamera.update(this.renderer, this.scene);
    }
    
    // Render scene
    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
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
      this.sphere.material.dispose();
    }
  }
}

// Initialize the renderer when the DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.sphereRenderer = new SphereRenderer('sphere-canvas');
});
