LED Sphere Control Platform
Overview
This is a modern, open-source software platform designed to control and present equirectangular images, videos, and data on spherical LED displays. The platform provides a core application for rendering and controlling content, with support for remote presenter and kiosk applications for interactive experiences.

Table of Contents
Overview
Architecture
Installation
Project Structure
Core Components
Usage
API Reference
Development
Contributing
License
Overview
The LED Sphere Control Platform is inspired by NOAA's Science On a Sphere but designed for modern LED spheres using contemporary web technologies. The platform consists of:

Core Application: Electron-based desktop application that renders equirectangular content and handles device communication
Presenter App: Web-based application for Android tablets with full control over the sphere
Kiosk App: Simplified web applications for multiplayer-style interactions with up to 6 simultaneous connections
Key Features
Equirectangular Content Support: Full support for 360° images and videos with proper aspect ratio handling
Real-time Control: Smooth, responsive controls for rotation, zoom, and playback
Slice Configuration: Divide the sphere into 2, 3, or 4 slices with content replication
Multi-Device Support: Connect multiple devices simultaneously for collaborative experiences
Low Latency: Optimized for minimal latency in control responses
Modern UI: Clean, intuitive interface with visual feedback
Architecture
System Architecture

Line Wrapping

Collapse
Copy
1
2
3
4
5
6
7
8
9
10
11
12
13
14
15
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Core App      │    │  Presenter App   │    │   Kiosk App     │
│   (Electron)    │    │   (Web/Android)  │    │   (Web)         │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┘───────────────────────│
                 ┌─────────────────────────────────┐
                 │ WebSocket Communication Server  │
                 │     (Node.js, Real-time)        │
                 └─────────────────────────────────┘
                              │
                    ┌─────────────────┐
                    │  LED Sphere     │
                    │  (HDMI/WiFi)    │
                    └─────────────────┘
Technology Stack
Frontend: HTML5, CSS3, JavaScript (ES6+)
3D Rendering: Three.js
Desktop App: Electron
Communication: WebSocket (Socket.io)
Backend: Node.js
UI Framework: Custom CSS with responsive design
Data Flow
Content Loading: Equirectangular media loaded from local filesystem or cloud sources
Rendering: Three.js renders content to equirectangular projection
Control: User interactions captured and processed
Communication: WebSocket server broadcasts updates to all connected devices
Display: HDMI output to LED sphere controller
Installation
Prerequisites
Node.js (v14 or higher)
npm or yarn
Modern web browser (Chrome, Firefox, Safari, Edge)
Android device (for presenter app testing)
Setup
