import * as THREE from 'three';

class SphereRenderer {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.sphereMesh = null;
    this.planeMesh = null;
    this.sphereMaterial = null;
    this.planeMaterial = null;

    this.activeTexture = null;
    this.activeVideoTexture = null;
    this.activeVideoElement = null;

    this.currentProjection = 'sphere';

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

    this.animate = this.animate.bind(this);


    this.init();
  }

  init() {
    this.setupRenderer();
    this.setupScene();
    this.setupCamera();
    this.setupMeshes();
    this.handleResize();

    window.addEventListener('resize', () => this.handleResize());

    this.animationFrameId = requestAnimationFrame(this.animate);

    const loadingIndicator = document.getElementById('loading-indicator');
    if (loadingIndicator) {
      loadingIndicator.style.display = 'none';
    }
  }

  setupRenderer() {
    const contextOptions = {
      canvas: this.canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    };

    this.renderer = new THREE.WebGLRenderer(contextOptions);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight, false);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
  }

  setupScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000000);
  }

  setupCamera() {
    const aspect = this.canvas.clientWidth / Math.max(1, this.canvas.clientHeight);
    this.camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 100);
    this.camera.position.set(0, 0, 2.2);
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


  setupMeshes() {
    const sphereGeometry = new THREE.SphereGeometry(1, 128, 64);
    this.sphereMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,

      side: THREE.BackSide
    });
    this.sphereMesh = new THREE.Mesh(sphereGeometry, this.sphereMaterial);
    this.scene.add(this.sphereMesh);

    const planeGeometry = new THREE.PlaneGeometry(2, 1);
    this.planeMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      side: THREE.DoubleSide
    });
    this.planeMesh = new THREE.Mesh(planeGeometry, this.planeMaterial);
    this.planeMesh.visible = false;
    this.scene.add(this.planeMesh);
  }

  async loadDataset(descriptor) {
    await this.disposeActiveMedia();

    this.currentProjection = descriptor?.projection || 'sphere';

    if (!descriptor || !descriptor.uri) {
      throw new Error('Invalid dataset descriptor received');
    }

    if (descriptor.type === 'video') {
      const { texture, element } = await this.createVideoTexture(descriptor);
      this.applyTexture(texture);
      this.activeVideoTexture = texture;
      this.activeVideoElement = element;
      return { mediaElement: element };
    }

    const texture = await this.createImageTexture(descriptor);
    this.applyTexture(texture);
    this.activeTexture = texture;

    return { mediaElement: null };
  }

  async createImageTexture(descriptor) {
    const loader = new THREE.TextureLoader();

    const texture = await loader.loadAsync(descriptor.uri);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;

    this.configureTextureForHighResolution(texture);

    return texture;
  }

  async createVideoTexture(descriptor) {
    const video = document.createElement('video');
    video.src = descriptor.uri;
    video.crossOrigin = 'anonymous';
    const streaming = descriptor.streaming || {};
    video.loop = streaming.loop ?? true;
    video.muted = streaming.muted ?? false;
    const initialVolume = streaming.muted ? 0 : (typeof streaming.volume === 'number' ? streaming.volume : 1);
    video.volume = THREE.MathUtils.clamp(initialVolume, 0, 1);
    video.preload = descriptor.streaming?.preload ?? 'auto';
    video.playsInline = true;
    video.controls = false;
    video.style.display = 'none';
    document.body.appendChild(video);

    await new Promise((resolve, reject) => {
      const cleanup = () => {
        video.removeEventListener('loadeddata', onLoadedData);
        video.removeEventListener('error', onError);
      };

      const onLoadedData = () => {
        cleanup();
        resolve();
      };

      const onError = (event) => {
        cleanup();
        reject(new Error(`Failed to load video: ${event?.message || descriptor.uri}`));
      };

      video.addEventListener('loadeddata', onLoadedData, { once: true });
      video.addEventListener('error', onError, { once: true });
    });

    const texture = new THREE.VideoTexture(video);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = false;

    this.configureTextureForHighResolution(texture);

    return { texture, element: video };
  }

  configureTextureForHighResolution(texture) {
    if (!this.renderer || !texture) {
      return;
    }

    const capabilities = this.renderer.capabilities;
    if (capabilities && typeof capabilities.getMaxAnisotropy === 'function') {
      texture.anisotropy = capabilities.getMaxAnisotropy();
    }

    texture.needsUpdate = true;
  }

  applyTexture(texture) {
    if (this.currentProjection === 'plane') {
      this.sphereMesh.visible = false;
      this.planeMesh.visible = true;
      this.planeMaterial.map = texture;
      this.planeMaterial.needsUpdate = true;
    } else {
      this.planeMesh.visible = false;
      this.sphereMesh.visible = true;
      this.sphereMaterial.map = texture;
      this.sphereMaterial.needsUpdate = true;
    }

    this.updateSphere({
      rotation: { ...this.sphereState.rotation },
      zoom: this.sphereState.zoom
    });
  }

  async disposeActiveMedia() {
    if (this.activeVideoElement) {
      this.activeVideoElement.pause();
      this.activeVideoElement.removeAttribute('src');
      this.activeVideoElement.load();
      this.activeVideoElement.remove();
      this.activeVideoElement = null;
    }

    if (this.activeVideoTexture) {
      this.activeVideoTexture.dispose();
      this.activeVideoTexture = null;
    }

    if (this.activeTexture) {
      this.activeTexture.dispose();
      this.activeTexture = null;
    }

    if (this.sphereMaterial) {
      this.sphereMaterial.map = null;
    }

    if (this.planeMaterial) {
      this.planeMaterial.map = null;
    }
  }

  updateSphere(state) {
    this.sphereState = { ...this.sphereState, ...state };

    const rotation = this.sphereState.rotation || {};
    const xRotation = THREE.MathUtils.degToRad(rotation.x || 0);
    const yRotation = THREE.MathUtils.degToRad(rotation.y || 0);

    if (this.sphereMesh) {
      this.sphereMesh.rotation.x = xRotation;
      this.sphereMesh.rotation.y = yRotation;
    }

    if (this.planeMesh) {
      this.planeMesh.rotation.x = xRotation;
      this.planeMesh.rotation.y = yRotation;
    }

    const zoom = THREE.MathUtils.clamp(this.sphereState.zoom || 0, 0, 1);
    const baseDistance = this.currentProjection === 'plane' ? 2.4 : 1.8;
    const zoomRange = this.currentProjection === 'plane' ? 1.2 : 1.4;
    const targetZ = Math.max(0.6, baseDistance - zoom * zoomRange);

    if (this.camera) {
      this.camera.position.z = targetZ;
    }
  }

  updateSlice(sliceId, state) {
    this.sliceStates.set(sliceId, state);
  }

  handleResize() {

    if (this.renderer && this.camera) {
      this.applyRenderResolution();

      // Update orthographic camera
      const aspect = this.canvas.clientWidth / this.canvas.clientHeight;
      this.camera.left = -aspect;
      this.camera.right = aspect;
      this.camera.updateProjectionMatrix();

    if (!this.renderer || !this.camera) {
      return;

    }

    const width = this.canvas.clientWidth || this.canvas.width || 1;
    const height = this.canvas.clientHeight || this.canvas.height || 1;

    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
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
    if (this.activeVideoTexture) {
      this.activeVideoTexture.needsUpdate = true;
    }

    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }

    this.animationFrameId = requestAnimationFrame(this.animate);
  }

  dispose() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    if (this.renderer) {
      this.renderer.dispose();
    }

    if (this.sphereMesh) {
      this.sphereMesh.geometry.dispose();
      if (this.sphereMesh.material) {
        this.sphereMesh.material.dispose();
      }
    }

    if (this.planeMesh) {
      this.planeMesh.geometry.dispose();
      if (this.planeMesh.material) {
        this.planeMesh.material.dispose();
      }
    }

    this.disposeActiveMedia();
  }
}

// Initialize the renderer when the DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.sphereRenderer = new SphereRenderer('sphere-canvas');
});
