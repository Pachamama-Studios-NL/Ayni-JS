const WebSocket = require('ws');
const EventEmitter = require('events');

class WSServer extends EventEmitter {
  constructor(port = 8080) {
    super();
    this.port = port;
    this.server = new WebSocket.Server({ port });
    this.clients = new Map();
    
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
          this.emit('sphere-control', data);
          break;

        case 'control-slice':
          this.emit('slice-control', data);
          break;

        case 'media-control':
          this.emit('media-control', data);
          break;

        case 'load-dataset':
          this.emit('load-dataset', data);
          break;

        case 'resolution-change': {
          const payload = data.data || data;
          this.emit('resolution-change', payload, clientId);
          break;
        }

        default:
          console.log(`Unknown message type: ${data.type}`);
      }
    } catch (error) {
      console.error('Error handling message:', error);
    }
  }
  
  handleDisconnect(clientId) {
    const client = this.clients.get(clientId);
    if (client) {
      client.connected = false;
      console.log(`${client.type} disconnected: ${clientId}`);
    }
    this.clients.delete(clientId);
  }
  
  broadcast(type, data, excludeClientId = null) {
    const message = JSON.stringify({ type, data });
    
    this.clients.forEach((client, clientId) => {
      if (client.connected && clientId !== excludeClientId) {
        try {
          client.ws.send(message);
        } catch (error) {
          console.error(`Error sending message to client ${clientId}:`, error);
        }
      }
    });
  }
  
  close() {
    this.server.close();
    this.clients.forEach(client => {
      if (client.connected) {
        client.ws.close();
      }
    });
    this.clients.clear();
  }
}

module.exports = WSServer;
