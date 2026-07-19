# Philos Movie Nights

A browser-based watch-party site with guest rooms, screen and audio sharing, camera/microphone controls, reactions, live chat, a shared movie queue, room voting, synchronized countdowns, theatre ambience, and picture-in-picture. Guests join with a room link and display name—no account required.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:4173`. To test multiple guests, open the invite link in another browser or device.

## Monolith Production (Single Node Server)

```bash
npm run build
npm start
```

---

## Deploying to EdgeOne Pages (Static Frontend + Node Signaling Backend)

### Why EdgeOne Pages Needs a Signaling Server
EdgeOne Pages hosts static frontend files (`dist`). This watch party app requires a long-running **WebRTC signaling and Socket.IO backend** (`server.js`) for room management, real-time chat, and video peer connections.

### Step 1: Deploy the Node Backend (`server.js`)
Deploy `server.js` to a Node.js hosting platform (e.g. Render, Railway, Fly.io, Heroku, or your own server/VPS):
- **Build Command**: `npm install`
- **Start Command**: `npm start` or `node server.js`
- Copy your deployed backend URL (e.g., `https://philos-signaling.onrender.com`).

### Step 2: Deploy Frontend to EdgeOne Pages
1. Connect your repository to **Tencent EdgeOne Pages**.
2. Set Build Settings:
   - **Framework Preset**: Vite / React
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
3. Add Environment Variable in EdgeOne Pages settings:
   - **Key**: `VITE_SOCKET_URL`
   - **Value**: `https://philos-signaling.onrender.com` (Replace with your Node backend URL)
4. Trigger build and deploy.

> **Note**: Screen capture requires HTTPS. Ensure both your EdgeOne Pages frontend and Node backend run on `https://` and `wss://`.
