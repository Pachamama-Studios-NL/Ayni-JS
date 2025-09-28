# README Draft: LED Sphere Control Platform

## Overview
The LED Sphere Control Platform is an open-source toolkit for driving modern spherical LED displays with 360° (equirectangular) imagery, video, and data. It combines an Electron desktop core with complementary presenter and kiosk web clients to deliver multi-user, real-time experiences inspired by NOAA’s “Science On a Sphere,” but tuned for contemporary hardware and interaction models.



## Key Features
- **360° content pipeline** with proper equirectangular rendering and zoom support.



- **Modular applications**: an Electron-based control room UI, a full presenter tablet app, and lightweight kiosk controllers for shared exhibits.



- **Live device coordination** via WebSockets for synchronized sphere, slice, and media commands across clients.



- **Flexible slice management** to divide the sphere into multiple viewing zones with per-slice control.



- **Extensible dataset catalog** backed by IPC handlers that can be replaced with dynamic content sources.



## Repository Layout
- `core-app/` – Electron project containing the main process, preload bridge, renderer UI, and build scripts.



- `core-app/src/` – Shared Node modules for sphere state management and the embedded WebSocket server used by the core UI.


- `communication/` – Standalone Node.js WebSocket server prototype with slice assignment logic for multi-kiosk deployments.


- `presenter-app/` – Touch-first web client with playlist, search, and media controls for presenters on tablets or laptops.


- `kiosk-app/` – Simplified web controller that locks each participant to an assigned slice while mirroring core content.



## System Architecture
1. **Electron Core Application**  
   Creates the desktop window, bootstraps the WebSocket server, and relays IPC messages between renderer UI components and connected devices.


2. **Sphere State Orchestrator**  
   Centralizes rotation, zoom, and slice configuration, clamping values to safe ranges before emitting updates to all listeners.


3. **Real-time Messaging Layer**  
   The embedded `WSServer` handles client registration, parses incoming control messages, and broadcasts sphere/slice/media updates with optional source filtering.


4. **Three.js Rendering Pipeline**  
   The renderer builds an orthographic view with a cube camera and custom shader to unwrap the equirectangular feed while reacting to sphere state changes and resize events.


5. **Renderer UI Controller**  
   Bridges user input elements to the renderer and main process, coordinating dataset loading, media controls, and telemetry display within the Electron window.



6. **Remote Web Clients**  
   - *Presenter App*: Establishes a persistent WebSocket link, supports drag-to-rotate, pinch-to-zoom, playlist loading, dataset search, and media commands for the entire sphere.

   - *Kiosk App*: Negotiates slice assignments, mirrors playlist actions, and limits gestures to the assigned slice for collaborative exhibits.


7. **Optional Central Server**  
   The `communication/server.js` prototype demonstrates how to promote the WebSocket broker to its own Node service with slice load balancing across kiosks.



## Getting Started

### Prerequisites
- Node.js ≥ 14, npm or yarn, a modern browser for client apps, and Android hardware if testing the presenter in its target environment.



### Install & Run the Core App
1. Install dependencies in `core-app/` (`npm install` or `yarn`). Dependencies include Electron, Electron Builder, Three.js, and `ws` for WebSockets.

2. Launch the application with `npm start` for packaged behavior or `npm run dev` to open DevTools automatically.


3. Build distributables with `npm run build`, or target-specific commands for Windows and Linux via Electron Builder.



### Serve the Web Clients
- The presenter and kiosk apps are plain HTML/JS bundles; host them from any static server (including `file://` during development). They derive the WebSocket hostname from `window.location` and connect to port 8080 automatically.



### Run the Standalone Communication Server (Optional)
- Execute `node communication/server.js` from the repository root to offload WebSocket responsibilities. Ensure the runtime has access to the `ws` dependency (already declared in the core app).



## Usage Guide

### Core Control Room UI
- Use the dataset list, sphere control sliders, slice configuration inputs, and device panel located in the left sidebar to orchestrate content and geometry.


- The central canvas renders the 3D sphere, while the right sidebar exposes media controls, dataset metadata, and performance telemetry.


- Sample datasets are defined via IPC handlers and can be replaced with dynamic sources or file pickers.



### Presenter Workflow
- Drag to rotate or pinch to zoom directly on the sphere preview; updates are sent as `control-sphere` messages to all clients.


- Initiate playlist loads, dataset searches, slice requests, and media commands through the presenter UI to drive the entire experience.


### Kiosk Experience
- Each kiosk requests a slice and receives assignments broadcast by the communication layer, then limits gestures to its slice while mirroring dataset selections.



## Development Notes
- The preload script exposes a controlled IPC surface (`electronAPI`) to the renderer for dataset queries, update listeners, and outbound sphere state changes; extend it cautiously to expose additional channels.

- Sphere state updates clamp zoom between 0 and 0.85, so adjust these bounds in `sphere-control.js` if your hardware supports different ranges.

- Renderer camera and shader math can be customized inside `three-renderer.js` for alternative projections or post-processing effects.

- The UI controller currently calls `electronAPI.sendMediaControl`, which is not yet exposed by the preload bridge—add the IPC wiring before relying on media commands from the Electron UI.



## Roadmap & Ideas
- Flesh out real dataset management (search, playlists, cloud storage) to match the presenter client’s expectations.

- Harmonize the embedded WebSocket server (`core-app/src/ws-server.js`) and the standalone prototype (`communication/server.js`) into a single deployment story with auth, resilience, and logging.


- Implement kiosk slice visualizations so non-controlling kiosks can still observe peer movements, leveraging the existing `slice-update` events.



## Contributing & License
Contributions are welcome—fork the repository, create feature branches, and submit pull requests. The project is distributed under the MIT License as declared in the package metadata.



---

## Testing
⚠️ Tests not run (static documentation review only)
