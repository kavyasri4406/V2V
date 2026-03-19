# V2V AlertCast - Project Technical Overview

## 1. Project Mission
V2V AlertCast is a real-time Vehicle-to-Vehicle (V2V) communication and safety monitoring system. It leverages high-frequency sensor data (MPU6050) via Firebase Realtime Database to provide drivers with live telemetry, safety analytics, and automated hazard broadcasting.

## 2. Core Architecture
### 2.1 Technology Stack
- **Framework**: Next.js 15 (App Router)
- **Styling**: Tailwind CSS + Shadcn UI (Modern "Neon-Pastel" Theme)
- **Database (Real-time)**: Firebase Realtime Database (RTDB) for high-frequency sensor streaming.
- **Database (Persistent)**: Cloud Firestore for alerts, user profiles, and notes.
- **Authentication**: Firebase Authentication (Email/Password).
- **AI Engine**: Google Genkit (Gemini 1.5 Flash) for location-based service discovery and weather processing.

### 2.2 Data Pipeline
1. **Sensor Ingest**: Raw data (X, Y, Z) is streamed from the Car Kit to RTDB.
2. **Processing**: Client-side hooks convert raw LSB values into physical units (m/s², °/s, KM/H).
3. **Analytics**:
   - **Speedometer**: Integrated acceleration with noise-gate filtering and dynamic gravity removal.
   - **Lean Angle**: Real-time roll/pitch calculation using `atan2`.
   - **Safety Score**: Event-driven scoring based on G-force thresholds.
4. **V2V Broadcast**: Critical thresholds (Crash, SOS, Breach) trigger shared Firestore alerts.

## 3. Key Modules & Logic
### 3.1 V2V Telemetry (Accelerometer)
- **Logic**: Calculates speed (KM/H) and G-force load. 
- **Broadcast**: Automatically triggers alerts for speed > 90 KM/H or impacts > 2.5G.

### 3.2 Vehicle Stability (Gyroscope)
- **Logic**: Monitors lean angle. Includes **eCall (Fall Detection)** logic.
- **SOS Countdown**: A 5-second countdown starts if tilt > 70° is detected while stationary, allowing the driver to cancel before an SOS is broadcasted.

### 3.3 Driving Insights (Analytics)
- **Logic**: Identifies "Harsh Braking", "Rapid Accel", and "Potholes" via Z-axis spikes.
- **Safety Index**: A real-time 1-100 score reflecting riding smoothness.

### 3.4 Anti-Theft Security
- **Logic**: "Parked Mode" sets a baseline. Any vibration or tilt change triggers a local vocal alarm and a network-wide "Security Breach" alert.

### 3.5 AI-Powered Discovery
- **Logic**: Uses Genkit to discover essential nearby services (Petrol, Hospitals) based on user coordinates.

### 3.6 Live Network Feed
- **Logic**: A real-time V2V stream that displays hazards from other drivers, calculating relative distance to the user's location.

## 4. UI/UX Principles
- **Snappy Response**: Optimized React state management for 10Hz data streams.
- **Safety Overlays**: High-priority red overlays for emergency states (SOS, Impact).
- **Accessible Design**: High-contrast visuals and voice alerts for hands-free safety notifications.

---
*Created by the App Prototyper in Firebase Studio.*