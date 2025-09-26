// renderer.js (Core App)
class SphereRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
    this.renderer = new THREE.WebGLRenderer({ canvas });
    
    // Sphere setup
    this.setupSphere();
    
    // Slice configuration
    this.sliceConfig = {
      count: 1,       // Number of slices
      angle: 360,     // Total angle covered
      overlap: 0      // Overlap between slices
    };
  }
  
  setupSphere() {
    // Create sphere geometry
    const geometry = new THREE.SphereGeometry(10, 64, 32);
    
    // Create material
    this.material = new THREE.MeshBasicMaterial({
      map: null,
      side: THREE.BackSide
    });
    
    // Create mesh
    this.sphere = new THREE.Mesh(geometry, this.material);
    this.scene.add(this.sphere);
    
    // Create cube camera for rendering
    this.cubeCamera = new THREE.CubeCamera(1, 1000, 2048);
    this.scene.add(this.cubeCamera);
    
    // Create output plane with shader for equirectangular projection
    this.setupOutputPlane();
  }
  
  setupOutputPlane() {
    const vertexShader = `varying vec2 vUv; 
                          void main() { 
                            vUv = uv; 
                            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); 
                          }`;
                          
    const fragmentShader = `uniform samplerCube tCube; 
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
                            }`;
    
    const planeGeometry = new THREE.PlaneGeometry(2, 2);
    const planeMaterial = new THREE.ShaderMaterial({
      uniforms: { tCube: { value: this.cubeCamera.renderTarget.texture } },
      vertexShader,
      fragmentShader,
      side: THREE.DoubleSide
    });
    
    this.outputPlane = new THREE.Mesh(planeGeometry, planeMaterial);
    this.scene.add(this.outputPlane);
  }
  
  setSliceConfig(count, angle, overlap = 0) {
    this.sliceConfig = { count, angle, overlap };
    this.updateSliceMaterials();
  }
  
  updateSliceMaterials() {
    // Create materials for each slice
    const sliceAngle = this.sliceConfig.angle / this.sliceConfig.count;
    
    for (let i = 0; i < this.sliceConfig.count; i++) {
      // Calculate slice UV bounds
      const uMin = i / this.sliceConfig.count;
      const uMax = (i + 1) / this.sliceConfig.count;
      
      // Create slice-specific material
      const sliceMaterial = this.material.clone();
      // Apply slice-specific configuration
      sliceMaterial.needsUpdate = true;
      
      // Store slice material
      if (!this.sliceMaterials) this.sliceMaterials = [];
      this.sliceMaterials[i] = sliceMaterial;
    }
  }
  
  render() {
    // Update cube camera
    this.cubeCamera.update(this.renderer, this.scene);
    
    // Render main scene
    this.renderer.render(this.scene, this.camera);
  }
}
