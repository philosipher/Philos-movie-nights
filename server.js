import express from "express";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { Server } from "socket.io";

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: true, credentials: true },
  maxHttpBufferSize: 1e6,
});

const roomStates = new Map();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 4173;
const production = process.argv.includes("--production") || process.env.NODE_ENV === "production";

const cleanRoom = (value) =>
  String(value || "")
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, "")
    .slice(0, 12);

const cleanName = (value) =>
  String(value || "Guest")
    .replace(/[<>]/g, "")
    .trim()
    .slice(0, 24) || "Guest";

const roomMembers = (room) => {
  const ids = io.sockets.adapter.rooms.get(room) || new Set();
  return [...ids]
    .map((id) => io.sockets.sockets.get(id)?.data.user)
    .filter(Boolean);
};

const getRoomState = (room) => {
  if (!roomStates.has(room)) roomStates.set(room, { queue: [], nowPlaying: null });
  return roomStates.get(room);
};

const publicRoomState = (room) => {
  const state = getRoomState(room);
  return {
    nowPlaying: state.nowPlaying,
    queue: state.queue.map((item) => ({ ...item, votes: item.voters.length })),
  };
};

const broadcastRoomState = (room) => io.to(room).emit("room-state", publicRoomState(room));

io.on("connection", (socket) => {
  socket.on("join-room", ({ roomCode, username }, reply = () => {}) => {
    const room = cleanRoom(roomCode);
    const name = cleanName(username);

    if (!room || room.length < 4) {
      reply({ ok: false, error: "That room code is too short." });
      return;
    }

    const existing = roomMembers(room);
    if (existing.length >= 12) {
      reply({ ok: false, error: "This room is full (12 people max)." });
      return;
    }

    const user = { id: socket.id, username: name };
    socket.data.room = room;
    socket.data.user = user;
    socket.join(room);

    reply({ ok: true, self: user, users: existing, roomState: publicRoomState(room) });
    socket.to(room).emit("participant-joined", user);
    io.to(room).emit("room-count", roomMembers(room).length);
  });

  socket.on("signal", ({ target, type, sdp, candidate, streams }) => {
    const room = socket.data.room;
    if (!room || !target || !io.sockets.adapter.rooms.get(room)?.has(target)) return;
    io.to(target).emit("signal", {
      from: socket.id,
      type,
      sdp,
      candidate,
      streams,
    });
  });

  socket.on("chat-message", ({ text }, reply = () => {}) => {
    const room = socket.data.room;
    const user = socket.data.user;
    const message = String(text || "").trim().slice(0, 500);
    if (!room || !user || !message) return;

    const payload = {
      id: `${socket.id}-${Date.now()}`,
      userId: socket.id,
      username: user.username,
      text: message,
      sentAt: new Date().toISOString(),
    };
    io.to(room).emit("chat-message", payload);
    reply({ ok: true });
  });

  socket.on("reaction", ({ emoji }) => {
    const room = socket.data.room;
    const user = socket.data.user;
    const allowed = ["🍿", "😂", "😱", "❤️", "👏"];
    if (!room || !user || !allowed.includes(emoji)) return;
    io.to(room).emit("reaction", {
      id: `${socket.id}-${Date.now()}`,
      emoji,
      username: user.username,
    });
  });

  socket.on("queue-add", ({ title }, reply = () => {}) => {
    const room = socket.data.room;
    const user = socket.data.user;
    const cleanTitle = String(title || "").replace(/[<>]/g, "").trim().slice(0, 64);
    if (!room || !user || !cleanTitle) return;

    const state = getRoomState(room);
    if (state.queue.length >= 12) {
      reply({ ok: false, error: "The queue already has 12 films." });
      return;
    }

    state.queue.push({
      id: `${socket.id}-${Date.now()}`,
      title: cleanTitle,
      addedBy: user.username,
      addedById: socket.id,
      voters: [socket.id],
    });
    broadcastRoomState(room);
    reply({ ok: true });
  });

  socket.on("queue-vote", ({ itemId }) => {
    const room = socket.data.room;
    if (!room) return;
    const item = getRoomState(room).queue.find((entry) => entry.id === itemId);
    if (!item) return;
    item.voters = item.voters.includes(socket.id)
      ? item.voters.filter((id) => id !== socket.id)
      : [...item.voters, socket.id];
    broadcastRoomState(room);
  });

  socket.on("queue-remove", ({ itemId }) => {
    const room = socket.data.room;
    if (!room) return;
    const state = getRoomState(room);
    state.queue = state.queue.filter((entry) => entry.id !== itemId);
    broadcastRoomState(room);
  });

  socket.on("set-now-playing", ({ itemId }) => {
    const room = socket.data.room;
    if (!room) return;
    const item = getRoomState(room).queue.find((entry) => entry.id === itemId);
    if (!item) return;
    getRoomState(room).nowPlaying = { id: item.id, title: item.title };
    broadcastRoomState(room);
    io.to(room).emit("chat-message", {
      id: `now-playing-${Date.now()}`,
      system: true,
      text: `Now watching: ${item.title}`,
    });
  });

  socket.on("start-countdown", () => {
    const room = socket.data.room;
    const user = socket.data.user;
    if (!room || !user) return;
    io.to(room).emit("countdown-start", {
      startsAt: Date.now() + 600,
      startedBy: user.username,
    });
  });

  socket.on("disconnect", () => {
    const { room, user } = socket.data;
    if (!room || !user) return;
    socket.to(room).emit("participant-left", { id: socket.id, username: user.username });
    io.to(room).emit("room-count", roomMembers(room).length);
    const state = roomStates.get(room);
    if (state) state.queue.forEach((item) => { item.voters = item.voters.filter((id) => id !== socket.id); });
    if (roomMembers(room).length === 0) roomStates.delete(room);
    else broadcastRoomState(room);
  });
});

if (production) {
  app.use(express.static(path.join(__dirname, "dist")));
  app.use((_request, response) => {
    response.sendFile(path.join(__dirname, "dist", "index.html"));
  });
} else {
  const { createServer: createViteServer } = await import("vite");
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "spa",
  });
  app.use(vite.middlewares);
}

httpServer.listen(PORT, () => {
  console.log(`Philos Movie Nights is live at http://localhost:${PORT}`);
});
