// communication/server.js
const WebSocket = require('ws');
const EventEmitter = require('events');

class WSServer extends EventEmitter {
  constructor(port = 8080) {
    super();
    this.port = port;
    this.server = new WebSocket.Server({ port });
    this.clients = new Map(); // Map of client IDs to client info
    this.slices = new Map();   // Map of slice IDs to controlling client
    
    this.setupServer();
  }
  
  setupServer() {
    this.server.on('connection', (ws, req) => {
      const clientId = this.generateClientId();
      const clientType = this.getClientType(req);
      
      // Store client info
      this.clients.set(clientId, {
        id: clientId,
        type: clientType,
        ws: ws,
        connected: true
      });
      
      console.log(`${clientType} connected: ${clientId}`);
      
      // Send client ID to client
      ws.send(JSON.stringify({
        type: 'connection',
        clientId: clientId,
        clientType: clientType
      }));
      
      // Handle messages
      ws.on('message', (message) => {
        this.handleMessage(clientId, message);
      });
      
      // Handle disconnect
      ws.on('close', () => {
        this.handleDisconnect(clientId);
      });
    });
    
    console.log(`WebSocket server running on port ${this.port}`);
  }
  
  generateClientId() {
    return Math.random().toString(36).substring(2, 15);
  }
  
  getClientType(req) {
    const url = new URL(req.url, `http://${req.headers.host}`);
    return url.searchParams.get('type') || 'unknown';
  }
  
  handleMessage(clientId, message) {
    try {
      const data = JSON.parse(message);
      
      switch (data.type) {
        case 'control-sphere':
          this.handleSphereControl(clientId, data);
          break;

        case 'control-slice':
          this.handleSliceControl(clientId, data);
          break;

        case 'request-slice':
          this.handleSliceRequest(clientId, data);
          break;

        case 'resolution-change':
          this.handleResolutionChange(clientId, data);
          break;

        default:
          console.log(`Unknown message type: ${data.type}`);
      }
    } catch (error) {
      console.error('Error handling message:', error);
    }
  }
  
  handleSphereControl(clientId, data) {
    // Broadcast to all clients
    this.broadcast({
      type: 'sphere-update',
      data: data,
      source: clientId
    }, clientId);
    
    // Emit to core app
    this.emit('sphere-update', data);
  }
  
  handleSliceControl(clientId, data) {
    const { sliceId, controls } = data;
    
    // Update slice control mapping
    this.slices.set(sliceId, clientId);
    
    // Broadcast to all clients
    this.broadcast({
      type: 'slice-update',
      sliceId: sliceId,
      controls: controls,
      source: clientId
    }, clientId);
    
    // Emit to core app
    this.emit('slice-update', { sliceId, controls });
  }
  
  handleSliceRequest(clientId, data) {
    const { sliceCount } = data;
    
    // Assign slices to clients
    const assignedSlices = [];
    const clientArray = Array.from(this.clients.values())
      .filter(client => client.type === 'kiosk' && client.connected);
    
    for (let i = 0; i < sliceCount; i++) {
      const clientIndex = i % clientArray.length;
      const assignedClient = clientArray[clientIndex];
      
      if (assignedClient) {
        assignedSlices.push({
          sliceId: i,
          clientId: assignedClient.id
        });
        
        this.slices.set(i, assignedClient.id);
      }
    }
    
    // Send assignment to clients
    this.broadcast({
      type: 'slice-assignment',
      slices: assignedSlices
    });
  }
  
  handleDisconnect(clientId) {
    const client = this.clients.get(clientId);
    if (client) {
      client.connected = false;
      console.log(`${client.type} disconnected: ${clientId}`);
      
      // Remove from slices mapping
      for (const [sliceId, controllingClient] of this.slices.entries()) {
        if (controllingClient === clientId) {
          this.slices.delete(sliceId);
        }
      }
    }
  }
  
  broadcast(message, excludeClientId = null) {
    const messageString = JSON.stringify(message);
    
    this.clients.forEach((client, clientId) => {
      if (client.connected && clientId !== excludeClientId) {
        try {
          client.ws.send(messageString);
        } catch (error) {
          console.error(`Error sending message to client ${clientId}:`, error);
        }
      }
    });
  }

  handleResolutionChange(clientId, data) {
    const payload = data.data || data;

    this.broadcast({
      type: 'resolution-change',
      data: payload,
      source: clientId
    }, null);

    this.emit('resolution-change', payload);
  }
}

module.exports = WSServer;
