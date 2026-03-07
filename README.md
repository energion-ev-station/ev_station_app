# EV Charging Station Manager

A full-stack monorepo for an EV Scooter Charging Station platform — real-time charging session management, QR-code station pairing, and live status updates.

```
ev-charging-station-manager/
├── server/          # Node.js · Express · MongoDB · Socket.IO · MQTT
├── client/          # React · Vite · Tailwind CSS
├── package.json     # Root scripts (run both workspaces together)
└── .gitignore
```

---

## Tech Stack

| Layer    | Technology |
|----------|------------|
| Backend  | Node.js, Express, MongoDB (Mongoose), Socket.IO, MQTT, JWT |
| Frontend | React 19, Vite 7, Tailwind CSS v4, React Router, Axios, html5-qrcode |

---

## Quick Start

### Prerequisites
- Node.js ≥ 22.12
- MongoDB (local or Atlas)
- MQTT broker (e.g. Mosquitto)

### Setup

```bash
# 1. Install all dependencies
npm run install:all

# 2. Configure the backend
cp server/.env.example server/.env
# Edit server/.env with your MongoDB URI, JWT secret, MQTT broker, etc.

# 3. Run both server and client concurrently
npm run dev
```

| Service | URL |
|---------|-----|
| API     | http://localhost:5000/api |
| Client  | http://localhost:3000 |

---

## Individual Workspace Commands

```bash
# Backend only
npm run dev:server

# Frontend only
npm run dev:client

# Build frontend for production
npm run build
```

---

## API Overview

### Auth — `/api/auth`
`POST /register` · `POST /login` · `POST /refresh` · `POST /logout` · `GET /me`

### Stations — `/api/stations`
`GET /` · `GET /:id` · `POST /` · `PATCH /:id` · `DELETE /:id` · `POST /:id/command`

### Sessions — `/api/sessions`
`POST /start` · `PATCH /:id/stop` · `GET /` · `GET /:id`

---

## Real-time (Socket.IO)

| Event | Direction | Description |
|-------|-----------|-------------|
| `subscribe:station` | Client → Server | Join a station room |
| `station:status` | Server → Client | Station status update |
| `session:started` | Server → Client | Charging session started |
| `session:completed` | Server → Client | Charging session completed |

---

## MQTT Topics

| Topic | Direction | Description |
|-------|-----------|-------------|
| `ev/station/<id>/status` | Station → API | Heartbeat / status |
| `ev/station/<id>/command` | API → Station | Start/stop/reset |
| `ev/session/<id>/update` | Station → API | Live energy readings |
