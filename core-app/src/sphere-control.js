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
  
  cleanup() {
    this.removeAllListeners();
    this.sliceStates.clear();
  }
}

module.exports = SphereControl;
