const EventEmitter = require('events');

class SphereControl extends EventEmitter {
  constructor() {
    super();
    
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
    this.resolution = { width: 2048, height: 1024 };
  }
  
  updateSphere(data) {
    if (data.rotation) {
      this.sphereState.rotation = { ...this.sphereState.rotation, ...data.rotation };
    }
    
    if (data.zoom !== undefined) {
      this.sphereState.zoom = Math.max(0, Math.min(0.85, data.zoom));
    }
    
    if (data.sliceConfig) {
      this.sphereState.sliceConfig = { ...this.sphereState.sliceConfig, ...data.sliceConfig };
    }
    
    this.emit('sphere-update', this.sphereState);
  }
  
  updateSlice(data) {
    const { sliceId, controls } = data;
    
    if (!this.sliceStates.has(sliceId)) {
      this.sliceStates.set(sliceId, {
        rotation: { x: 0, y: 0 },
        zoom: 0
      });
    }
    
    const sliceState = this.sliceStates.get(sliceId);
    
    if (controls.rotation) {
      sliceState.rotation = { ...sliceState.rotation, ...controls.rotation };
    }
    
    if (controls.zoom !== undefined) {
      sliceState.zoom = Math.max(0, Math.min(0.85, controls.zoom));
    }
    
    this.emit('slice-update', { sliceId, ...sliceState });
  }
  
  getSphereState() {
    return this.sphereState;
  }
  
  getSliceState(sliceId) {
    return this.sliceStates.get(sliceId);
  }

  updateResolution(resolution) {
    const sanitized = this.sanitizeResolution(resolution);
    const changed = sanitized.width !== this.resolution.width || sanitized.height !== this.resolution.height;

    this.resolution = sanitized;

    if (changed) {
      this.emit('resolution-change', this.resolution);
    }

    return this.resolution;
  }

  sanitizeResolution(resolution = {}) {
    const minWidth = 512;
    const maxWidth = 4096;
    const minHeight = minWidth / 2;
    const maxHeight = 2048;

    const widthValue = Number(resolution.width);
    const heightValue = Number(resolution.height);

    let width = Number.isFinite(widthValue) && widthValue > 0 ? Math.round(widthValue) : this.resolution.width;
    let height = Number.isFinite(heightValue) && heightValue > 0 ? Math.round(heightValue) : Math.round(width / 2);

    width = Math.min(maxWidth, Math.max(minWidth, width));
    height = Math.min(maxHeight, Math.max(minHeight, height));

    height = Math.min(maxHeight, Math.max(minHeight, Math.round(width / 2)));
    width = Math.min(maxWidth, Math.max(minWidth, height * 2));

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

  getResolution() {
    return this.resolution;
  }

  cleanup() {
    this.removeAllListeners();
    this.sliceStates.clear();
  }
}

module.exports = SphereControl;
