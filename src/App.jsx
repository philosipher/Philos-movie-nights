import React, { useCallback, useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { Peer } from "peerjs";
import {
  ArrowRight,
  Camera,
  CameraOff,
  Check,
  ChevronRight,
  Clapperboard,
  Copy,
  DoorOpen,
  Expand,
  Film,
  Heart,
  ListVideo,
  Link2,
  MessageCircle,
  Mic,
  MicOff,
  Moon,
  MonitorUp,
  MoreHorizontal,
  PictureInPicture2,
  Play,
  PlayCircle,
  Plus,
  Popcorn,
  Send,
  Settings,
  Share2,
  Sparkles,
  Sun,
  ThumbsUp,
  Timer,
  Trash2,
  Users,
  Volume2,
  X,
} from "lucide-react";

const REACTIONS = ["🍿", "😂", "😱", "❤️", "👏"];
const AVATAR_COLORS = ["#ef6d5b", "#7c8ff5", "#56b49b", "#d991d0", "#e6a84b", "#8d72db"];

const GLOBAL_ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun2.l.google.com:19302" },
  { urls: "stun:openrelay.metered.ca:80" },
  { urls: "stun:openrelay.metered.ca:443" },
  {
    urls: "turn:openrelay.metered.ca:80",
    username: "openrelay",
    credential: "openrelay",
  },
  {
    urls: "turn:openrelay.metered.ca:443",
    username: "openrelay",
    credential: "openrelay",
  },
  {
    urls: "turn:openrelay.metered.ca:443?transport=tcp",
    username: "openrelay",
    credential: "openrelay",
  },
];

function safeGetStorage(storageType, key, fallback = "") {
  try {
    const store = storageType === "session" ? sessionStorage : localStorage;
    return store.getItem(key) || fallback;
  } catch {
    return fallback;
  }
}

function safeSetStorage(storageType, key, value) {
  try {
    const store = storageType === "session" ? sessionStorage : localStorage;
    if (value) store.setItem(key, value);
    else store.removeItem(key);
  } catch {
    // Storage blocked in browser strict privacy modes
  }
}

function makeRoomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bits = Array.from({ length: 5 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `MN-${bits}`;
}

function cleanRoomCode(value) {
  return value.toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 12);
}

function initials(name = "Guest") {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

function colorFor(value = "guest") {
  const total = [...value].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return AVATAR_COLORS[total % AVATAR_COLORS.length];
}

function Brand({ compact = false }) {
  return (
    <div className={`brand ${compact ? "brand--compact" : ""}`}>
      <span className="brand__mark"><Play size={15} fill="currentColor" /></span>
      <span>PHILOS <span>MOVIE NIGHTS</span></span>
    </div>
  );
}

function Avatar({ name, id, size = "md", online = false }) {
  return (
    <span
      className={`avatar avatar--${size}`}
      style={{ "--avatar": colorFor(id || name) }}
      aria-label={name}
    >
      {initials(name)}
      {online && <i />}
    </span>
  );
}

function Landing({ onEnter }) {
  const queryRoom = new URLSearchParams(window.location.search).get("room") || "";
  const [username, setUsername] = useState(() => safeGetStorage("session", "philos-movie-nights-name", ""));
  const [roomCode, setRoomCode] = useState(() => cleanRoomCode(queryRoom));
  const [serverUrl, setServerUrl] = useState(() => safeGetStorage("local", "philos-server-url", import.meta.env.VITE_SOCKET_URL || ""));
  const [showServerInput, setShowServerInput] = useState(false);
  const [mode, setMode] = useState(queryRoom ? "join" : "create");
  const [error, setError] = useState("");

  const submit = (event) => {
    event.preventDefault();
    const name = username.trim();
    const code = mode === "create" ? makeRoomCode() : cleanRoomCode(roomCode);
    if (!name) {
      setError("Add a name so your friends know it’s you.");
      return;
    }
    if (mode === "join" && code.length < 4) {
      setError("Enter the room code from your invite.");
      return;
    }
    safeSetStorage("session", "philos-movie-nights-name", name);
    safeSetStorage("local", "philos-server-url", serverUrl.trim());
    onEnter({ username: name, roomCode: code, serverUrl: serverUrl.trim(), isHost: mode === "create" });
  };

  return (
    <main className="landing">
      <div className="grain" />
      <nav className="landing__nav shell">
        <Brand />
        <div className="nav__links">
          <a href="#how">How it works</a>
          <a href="#features">Features</a>
        </div>
        <button className="nav__join" onClick={() => setMode("join")}>Join a room <ArrowRight size={16} /></button>
      </nav>

      <section className="hero shell">
        <div className="hero__copy">
          <div className="eyebrow"><span /> MOVIE NIGHT, MINUS THE DISTANCE</div>
          <h1>The lights are down.<br /><em>Your people are here.</em></h1>
          <p>Share your screen, hear every gasp, and watch together—wherever everyone happens to be.</p>
          <div className="trust-row">
            <div className="avatar-stack">
              {["Maya", "Sam", "Theo", "Lia"].map((name) => <Avatar key={name} name={name} size="sm" />)}
            </div>
            <span><strong>No accounts.</strong> Just send the link.</span>
          </div>
        </div>

        <div className="join-card-wrap">
          <div className="join-card__glow" />
          <form className="join-card" onSubmit={submit}>
            <div className="join-card__top">
              <span className="live-pill"><i /> READY WHEN YOU ARE</span>
              <Clapperboard size={23} />
            </div>
            <h2>{mode === "create" ? "Start a movie night" : "Join the watch party"}</h2>
            <p>{mode === "create" ? "Your room is one click away." : "Enter the code your friend sent you."}</p>

            <label>
              <span>YOUR NAME</span>
              <div className="input-wrap"><Users size={18} /><input value={username} onChange={(e) => { setUsername(e.target.value); setError(""); }} placeholder="What should we call you?" maxLength={24} autoFocus /></div>
            </label>

            {mode === "join" && (
              <label>
                <span>ROOM CODE</span>
                <div className="input-wrap"><Link2 size={18} /><input value={roomCode} onChange={(e) => { setRoomCode(cleanRoomCode(e.target.value)); setError(""); }} placeholder="MN-7K9PX" maxLength={12} /></div>
              </label>
            )}

            {showServerInput && (
              <label>
                <span>SIGNALING SERVER URL (OPTIONAL)</span>
                <div className="input-wrap"><Settings size={18} /><input value={serverUrl} onChange={(e) => setServerUrl(e.target.value)} placeholder="https://your-signaling-server.onrender.com" /></div>
              </label>
            )}

            {error && <div className="form-error">{error}</div>}

            <button className="primary-action" type="submit">
              {mode === "create" ? <><Play size={18} fill="currentColor" /> Create a room</> : <>Enter the room <ArrowRight size={18} /></>}
            </button>
            <button type="button" className="switch-mode" onClick={() => { setMode(mode === "create" ? "join" : "create"); setError(""); }}>
              {mode === "create" ? "Have an invite? Join a room" : "Hosting tonight? Create a room"} <ChevronRight size={15} />
            </button>

            <button type="button" className="switch-mode" style={{ marginTop: "4px", fontSize: "12px", opacity: 0.75 }} onClick={() => setShowServerInput((v) => !v)}>
              <Settings size={13} /> {showServerInput ? "Hide server settings" : "Custom signaling server URL"}
            </button>
            <div className="join-card__note"><Check size={14} /> Camera and mic are always your choice</div>
          </form>
        </div>
      </section>

      <section className="feature-strip shell" id="features">
        <div><span><MonitorUp size={21} /></span><p><strong>Crisp screen sharing</strong><small>Movies and sound, in sync</small></p></div>
        <div><span><MessageCircle size={21} /></span><p><strong>Talk or type</strong><small>Reactions, chat, camera & mic</small></p></div>
        <div><span><Sparkles size={21} /></span><p><strong>Zero sign-up</strong><small>A name and a link is all it takes</small></p></div>
      </section>

      <section className="how shell" id="how">
        <div className="how__poster">
          <div className="poster poster--one"><span>FRIDAY</span><strong>THE<br />LAST<br />SIGNAL</strong><small>01:48:22</small></div>
          <div className="poster poster--two"><Film size={48} /><strong>YOUR FILM<br />GOES HERE</strong></div>
          <div className="poster poster--three"><span>MOVIE NIGHT</span><strong>STAY<br />FOR THE<br />CREDITS</strong></div>
        </div>
        <div className="how__copy">
          <span className="section-number">01 — HOW IT WORKS</span>
          <h2>From “what should we watch?”<br />to watching in seconds.</h2>
          <ol>
            <li><b>01</b><p><strong>Make the room</strong><span>Choose a name. No profile, email, or password.</span></p></li>
            <li><b>02</b><p><strong>Send the link</strong><span>Friends join from any modern browser.</span></p></li>
            <li><b>03</b><p><strong>Share & press play</strong><span>Pick a tab with audio and settle in.</span></p></li>
          </ol>
        </div>
      </section>

      <footer className="landing__footer shell"><Brand compact /><span>Good films. Better company.</span><small>© 2026 Philos Movie Nights</small></footer>
    </main>
  );
}

function VideoSurface({ stream, muted = false, className = "", style = {} }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (el) {
      if (el.srcObject !== stream) {
        el.srcObject = stream || null;
      }
      if (stream) {
        const attemptPlay = () => {
          const playPromise = el.play();
          if (playPromise !== undefined) {
            playPromise.catch(() => {
              const unblock = () => {
                el.play().catch(() => {});
                window.removeEventListener("touchstart", unblock);
                window.removeEventListener("click", unblock);
              };
              window.addEventListener("touchstart", unblock, { once: true });
              window.addEventListener("click", unblock, { once: true });
            });
          }
        };
        attemptPlay();
      }
    }
  }, [stream]);

  return (
    <video
      ref={ref}
      className={className}
      style={style}
      autoPlay
      playsInline
      webkit-playsinline="true"
      muted={muted}
    />
  );
}

function ParticipantTile({ participant, stream, self = false, micOn = false }) {
  const hasVideo = Boolean(stream?.getVideoTracks().some((track) => track.readyState === "live"));
  const hasAudio = Boolean(stream?.getAudioTracks().some((track) => track.readyState === "live"));
  const hasMedia = hasVideo || hasAudio;
  return (
    <div className={`participant ${hasVideo ? "participant--video" : ""}`}>
      {hasMedia && <VideoSurface stream={stream} muted={self} className={hasVideo ? "participant__video" : "participant__audio-only"} style={hasVideo ? {} : { display: "none" }} />}
      {!hasVideo && <Avatar name={participant.username} id={participant.id} size="lg" online />}
      <div className="participant__shade" />
      <div className="participant__name"><span>{self ? "You" : participant.username}</span>{micOn ? <Mic size={13} /> : <MicOff size={13} />}</div>
    </div>
  );
}

function EmptySeat() {
  return (
    <div className="participant participant--empty">
      <div className="empty-seat"><Users size={18} /></div>
      <div className="participant__name"><span>Open seat</span></div>
    </div>
  );
}

function Toast({ toast }) {
  if (!toast) return null;
  return <div className={`toast toast--${toast.type || "info"}`}>{toast.type === "success" && <Check size={16} />}{toast.text}</div>;
}

function QueuePanel({ queue, nowPlaying, queueTitle, setQueueTitle, selfId, onAdd, onVote, onPlay, onRemove }) {
  return (
    <div className="queue-panel">
      {nowPlaying && (
        <div className="now-playing-card">
          <span><i /> NOW WATCHING</span>
          <strong>{nowPlaying.title}</strong>
          <small>Picked by the room</small>
        </div>
      )}
      <form className="queue-add" onSubmit={onAdd}>
        <div><Plus size={16} /><input value={queueTitle} onChange={(event) => setQueueTitle(event.target.value)} placeholder="Add a movie idea…" maxLength={64} /></div>
        <button type="submit" disabled={!queueTitle.trim()}>Add</button>
      </form>
      <div className="queue-label"><span>THE SHORTLIST</span><small>{queue.length}/12</small></div>
      <div className="queue-list">
        {!queue.length && (
          <div className="queue-empty"><ListVideo size={27} /><strong>Your queue is wide open</strong><span>Add a film and let everyone vote.</span></div>
        )}
        {queue.map((item, index) => (
          <article className={`queue-item ${nowPlaying?.id === item.id ? "queue-item--playing" : ""}`} key={item.id}>
            <b>{String(index + 1).padStart(2, "0")}</b>
            <div><strong>{item.title}</strong><span>Added by {item.addedBy}</span></div>
            <div className="queue-item__actions">
              <button className={item.voters?.includes(selfId) ? "is-voted" : ""} onClick={() => onVote(item.id)} aria-label={`Vote for ${item.title}. ${item.votes} votes`} title={`Vote for ${item.title}`}><ThumbsUp size={13} /><span>{item.votes}</span></button>
              <button onClick={() => onPlay(item.id)} title={`Set ${item.title} as now playing`}><PlayCircle size={14} /></button>
              <button onClick={() => onRemove(item.id)} title={`Remove ${item.title}`}><Trash2 size={13} /></button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function MovieRoom({ session, onLeave }) {
  const socketRef = useRef(null);
  const peersRef = useRef(new Map());
  const cameraStreamRef = useRef(null);
  const screenStreamRef = useRef(null);
  const chatEndRef = useRef(null);
  const toastTimer = useRef(null);
  const countdownTimersRef = useRef([]);
  const screenStopInProgress = useRef(false);

  const [participants, setParticipants] = useState([]);
  const [messages, setMessages] = useState([]);
  const [remoteMedia, setRemoteMedia] = useState({});
  const [mediaVersion, setMediaVersion] = useState(0);
  const [connected, setConnected] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [micOn, setMicOn] = useState(false);
  const [screenOn, setScreenOn] = useState(false);
  const [chatText, setChatText] = useState("");
  const [toast, setToast] = useState(null);
  const [reactions, setReactions] = useState([]);
  const [copied, setCopied] = useState(false);
  const [chatOpen, setChatOpen] = useState(true);
  const [sharingBusy, setSharingBusy] = useState(false);
  const [panelTab, setPanelTab] = useState("chat");
  const [queue, setQueue] = useState([]);
  const [queueTitle, setQueueTitle] = useState("");
  const [nowPlaying, setNowPlaying] = useState(null);
  const [countdown, setCountdown] = useState(null);
  const [ambience, setAmbience] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const showToast = useCallback((text, type = "info") => {
    clearTimeout(toastTimer.current);
    setToast({ text, type });
    toastTimer.current = setTimeout(() => setToast(null), 3400);
  }, []);

  const runCountdown = useCallback(({ startsAt, startedBy }) => {
    countdownTimersRef.current.forEach((timer) => {
      clearTimeout(timer);
      clearInterval(timer);
    });
    countdownTimersRef.current = [];
    const startTimer = setTimeout(() => {
      let step = 3;
      setCountdown(step);
      const interval = setInterval(() => {
        step -= 1;
        if (step > 0) setCountdown(step);
        else if (step === 0) setCountdown("PLAY");
        else {
          clearInterval(interval);
          setCountdown(null);
        }
      }, 900);
      countdownTimersRef.current.push(interval);
    }, Math.max(0, startsAt - Date.now()));
    countdownTimersRef.current.push(startTimer);
    showToast(`${startedBy} started the countdown`);
  }, [showToast]);

  const streamMeta = useCallback(() => {
    const result = {};
    if (cameraStreamRef.current?.getTracks().length) result[cameraStreamRef.current.id] = "camera";
    if (screenStreamRef.current?.getTracks().length) result[screenStreamRef.current.id] = "screen";
    return result;
  }, []);

  const addLocalTracks = useCallback((pc) => {
    const senderTrackIds = new Set(pc.getSenders().map((sender) => sender.track?.id).filter(Boolean));
    [cameraStreamRef.current, screenStreamRef.current].filter(Boolean).forEach((stream) => {
      stream.getTracks().forEach((track) => {
        if (!senderTrackIds.has(track.id)) pc.addTrack(track, stream);
      });
    });
  }, []);

  const createPeer = useCallback((peerId) => {
    if (peersRef.current.has(peerId)) return peersRef.current.get(peerId);
    const pc = new RTCPeerConnection({
      iceServers: GLOBAL_ICE_SERVERS,
    });
    const peer = { pc, remoteStreamTypes: {} };
    peersRef.current.set(peerId, peer);
    addLocalTracks(pc);

    pc.onicecandidate = (event) => {
      if (event.candidate) socketRef.current?.emit("signal", { target: peerId, type: "candidate", candidate: event.candidate });
    };
    pc.ontrack = (event) => {
      const stream = event.streams[0];
      if (!stream) return;
      const type = peer.remoteStreamTypes[stream.id] || (event.track.kind === "video" ? "camera" : "camera");
      setRemoteMedia((current) => ({
        ...current,
        [peerId]: { ...current[peerId], [`${type}Stream`]: stream },
      }));
      event.track.onended = () => {
        setRemoteMedia((current) => {
          const entry = current[peerId];
          if (!entry) return current;
          return { ...current, [peerId]: { ...entry, [`${type}Stream`]: null } };
        });
      };
    };
    pc.onconnectionstatechange = () => {
      if (["failed", "closed"].includes(pc.connectionState)) {
        setRemoteMedia((current) => {
          const next = { ...current };
          delete next[peerId];
          return next;
        });
      }
    };
    return peer;
  }, [addLocalTracks]);

  const makeOffer = useCallback(async (peerId) => {
    const peer = createPeer(peerId);
    addLocalTracks(peer.pc);
    try {
      const offer = await peer.pc.createOffer();
      await peer.pc.setLocalDescription(offer);
      socketRef.current?.emit("signal", {
        target: peerId,
        type: "offer",
        sdp: peer.pc.localDescription,
        streams: streamMeta(),
      });
    } catch (error) {
      console.warn("Could not negotiate peer connection", error);
    }
  }, [addLocalTracks, createPeer, streamMeta]);

  const renegotiateAll = useCallback(() => {
    if (socketRef.current) {
      peersRef.current.forEach((_peer, peerId) => makeOffer(peerId));
    } else if (peerRef.current) {
      dataConnsRef.current.forEach((_conn, targetPeerId) => {
        if (screenStreamRef.current) {
          const call = peerRef.current.call(targetPeerId, screenStreamRef.current, { metadata: { type: "screen", isHost: session?.isHost !== false } });
          call?.on("stream", (remoteStream) => {
            setRemoteMedia((current) => ({
              ...current,
              [targetPeerId]: { ...current[targetPeerId], screenStream: remoteStream },
            }));
          });
        }
        if (cameraStreamRef.current) {
          const call = peerRef.current.call(targetPeerId, cameraStreamRef.current, { metadata: { type: "camera", isHost: session?.isHost !== false } });
          call?.on("stream", (remoteStream) => {
            setRemoteMedia((current) => ({
              ...current,
              [targetPeerId]: { ...current[targetPeerId], cameraStream: remoteStream },
            }));
          });
        }
      });
    }
  }, [makeOffer, session?.isHost]);

  const peerRef = useRef(null);
  const dataConnsRef = useRef(new Map());
  const channelRef = useRef(null);
  const wsRef = useRef(null);

  const broadcastServerless = useCallback((type, payload) => {
    dataConnsRef.current.forEach((conn) => {
      if (conn.open) conn.send({ type, payload });
    });
  }, []);

  const setupDataConnection = useCallback((conn) => {
    dataConnsRef.current.set(conn.peer, conn);
    conn.on("open", () => {
      conn.send({ type: "user-info", payload: { id: peerRef.current?.id, username: session.username } });
    });
    conn.on("data", (data) => {
      if (!data || !data.type) return;
      if (data.type === "user-info") {
        const user = data.payload;
        setParticipants((current) => current.some((item) => item.id === user.id) ? current : [...current, user]);
        if (peerRef.current?.id) {
          conn.send({ type: "user-info-reply", payload: { id: peerRef.current.id, username: session.username } });
        }
        setMessages((current) => [...current, { id: `join-${user.id}`, system: true, text: `${user.username} grabbed a seat.` }]);
        showToast(`${user.username} joined the room`, "success");
      } else if (data.type === "user-info-reply") {
        const user = data.payload;
        setParticipants((current) => current.some((item) => item.id === user.id) ? current : [...current, user]);
      } else if (data.type === "chat-message") {
        setMessages((current) => [...current, data.payload]);
      } else if (data.type === "reaction") {
        const reaction = data.payload;
        setReactions((current) => [...current, reaction]);
        setTimeout(() => setReactions((current) => current.filter((item) => item.id !== reaction.id)), 2600);
      } else if (data.type === "room-state") {
        setQueue(data.payload.queue || []);
        setNowPlaying(data.payload.nowPlaying || null);
      } else if (data.type === "countdown-start") {
        runCountdown(data.payload);
      }
    });
    conn.on("close", () => {
      dataConnsRef.current.delete(conn.peer);
      setParticipants((current) => current.filter((user) => user.id !== conn.peer));
      setRemoteMedia((current) => {
        const next = { ...current };
        delete next[conn.peer];
        return next;
      });
    });
  }, [runCountdown, session.username, showToast]);

  const connectToPeer = useCallback((targetPeerId) => {
    if (!peerRef.current || targetPeerId === peerRef.current.id) return;

    if (!dataConnsRef.current.has(targetPeerId)) {
      const conn = peerRef.current.connect(targetPeerId, { config: { iceServers: GLOBAL_ICE_SERVERS } });
      setupDataConnection(conn);
    }

    if (screenStreamRef.current) {
      const call = peerRef.current.call(targetPeerId, screenStreamRef.current, { metadata: { type: "screen", isHost: session?.isHost !== false }, config: { iceServers: GLOBAL_ICE_SERVERS } });
      call?.on("stream", (remoteStream) => {
        setRemoteMedia((current) => ({
          ...current,
          [targetPeerId]: { ...current[targetPeerId], screenStream: remoteStream },
        }));
      });
    }
    if (cameraStreamRef.current) {
      const call = peerRef.current.call(targetPeerId, cameraStreamRef.current, { metadata: { type: "camera", isHost: session?.isHost !== false }, config: { iceServers: GLOBAL_ICE_SERVERS } });
      call?.on("stream", (remoteStream) => {
        setRemoteMedia((current) => ({
          ...current,
          [targetPeerId]: { ...current[targetPeerId], cameraStream: remoteStream },
        }));
      });
    }
  }, [setupDataConnection, session?.isHost]);

  useEffect(() => {
    const socketUrl = session?.serverUrl || localStorage.getItem("philos-server-url") || import.meta.env.VITE_SOCKET_URL || undefined;
    
    if (socketUrl) {
      const socket = io(socketUrl, { transports: ["websocket", "polling"], timeout: 10000 });
      socketRef.current = socket;

      socket.on("connect_error", () => {
        setConnected(false);
        showToast("Signaling server offline. Check server URL in Settings.", "error");
      });

      socket.on("connect", () => {
        socket.emit("join-room", session, (response) => {
          if (!response?.ok) {
            showToast(response?.error || "We couldn't enter that room.", "error");
            setTimeout(onLeave, 1800);
            return;
          }
          setConnected(true);
          setParticipants([response.self, ...response.users]);
          setQueue(response.roomState?.queue || []);
          setNowPlaying(response.roomState?.nowPlaying || null);
          setMessages([{
            id: "welcome",
            system: true,
            text: `Welcome to ${session.roomCode}. Share your screen when everyone’s settled in.`,
          }]);
          response.users.forEach((user) => makeOffer(user.id));
        });
      });

      socket.on("disconnect", () => setConnected(false));
      socket.on("participant-joined", (user) => {
        setParticipants((current) => current.some((item) => item.id === user.id) ? current : [...current, user]);
        setMessages((current) => [...current, { id: `join-${user.id}`, system: true, text: `${user.username} grabbed a seat.` }]);
        showToast(`${user.username} joined the room`, "success");
      });
      socket.on("participant-left", ({ id, username }) => {
        setParticipants((current) => current.filter((user) => user.id !== id));
        setMessages((current) => [...current, { id: `left-${id}`, system: true, text: `${username} left the room.` }]);
        const peer = peersRef.current.get(id);
        peer?.pc.close();
        peersRef.current.delete(id);
        setRemoteMedia((current) => {
          const next = { ...current };
          delete next[id];
          return next;
        });
      });
      socket.on("chat-message", (message) => setMessages((current) => [...current, message]));
      socket.on("room-state", (state) => {
        setQueue(state.queue || []);
        setNowPlaying(state.nowPlaying || null);
      });
      socket.on("countdown-start", runCountdown);
      socket.on("reaction", (reaction) => {
        setReactions((current) => [...current, reaction]);
        setTimeout(() => setReactions((current) => current.filter((item) => item.id !== reaction.id)), 2600);
      });
      socket.on("signal", async ({ from, type, sdp, candidate, streams = {} }) => {
        const peer = createPeer(from);
        if (Object.keys(streams).length) peer.remoteStreamTypes = streams;
        try {
          if (type === "offer") {
            await peer.pc.setRemoteDescription(sdp);
            addLocalTracks(peer.pc);
            const answer = await peer.pc.createAnswer();
            await peer.pc.setLocalDescription(answer);
            socket.emit("signal", { target: from, type: "answer", sdp: peer.pc.localDescription, streams: streamMeta() });
          } else if (type === "answer") {
            await peer.pc.setRemoteDescription(sdp);
          } else if (type === "candidate" && candidate) {
            await peer.pc.addIceCandidate(candidate);
          }
        } catch (error) {
          console.warn("WebRTC signal error", error);
        }
      });
    } else {
      // -------------------------------------------------------------
      // STANDALONE SERVERLESS PEERJS MODE (Cross-Device P2P WebRTC)
      // -------------------------------------------------------------
      const cleanCode = cleanRoomCode(session.roomCode);
      const hostPeerId = `philos-host-${cleanCode}`;
      const isHost = session.isHost !== false;

      const initPeer = () => {
        const myPeerId = isHost ? hostPeerId : `philos-guest-${cleanCode}-${Math.random().toString(36).substring(2, 7)}`;
        const peer = new Peer(myPeerId, {
          host: "0.peerjs.com",
          port: 443,
          path: "/",
          secure: true,
          config: {
            iceServers: GLOBAL_ICE_SERVERS,
          },
        });
        peerRef.current = peer;

        peer.on("open", (id) => {
          setConnected(true);
          const selfUser = { id, username: session.username };
          setParticipants([selfUser]);
          setMessages([{
            id: "welcome",
            system: true,
            text: isHost
              ? `Welcome to ${session.roomCode}. Share your screen when everyone’s settled in.`
              : `Joined room ${session.roomCode}. Waiting for the host to present.`,
          }]);

          if (!isHost) {
            connectToPeer(hostPeerId);
          }

          // Universal WSS WebSocket Signaling Relay for Cross-Network (4G LTE / 5G / Wi-Fi) Discovery
          try {
            const wsUrl = `wss://free.piesocket.com/v3/philos_${cleanCode}?api_key=VC44WVtGJvxOtBMLQwipBWKmI88FUAVaBc6mfCrQ&notify_self=1`;
            const ws = new WebSocket(wsUrl);
            wsRef.current = ws;

            ws.onopen = () => {
              ws.send(JSON.stringify({ type: "presence", user: { id, username: session.username, isHost } }));
            };

            ws.onmessage = (event) => {
              try {
                const data = JSON.parse(event.data);
                if (data.type === "presence" && data.user && data.user.id !== id) {
                  const remoteUser = data.user;
                  setParticipants((current) => current.some((u) => u.id === remoteUser.id) ? current : [...current, remoteUser]);
                  if (isHost) {
                    ws.send(JSON.stringify({ type: "presence-ack", user: { id, username: session.username, isHost: true } }));
                    connectToPeer(remoteUser.id);
                  } else if (remoteUser.isHost) {
                    connectToPeer(remoteUser.id);
                  }
                } else if (data.type === "presence-ack" && data.user && data.user.id !== id) {
                  const remoteUser = data.user;
                  setParticipants((current) => current.some((u) => u.id === remoteUser.id) ? current : [...current, remoteUser]);
                  connectToPeer(remoteUser.id);
                }
              } catch {
                // non-json socket messages ignored
              }
            };
          } catch {
            // silent WSS fallback
          }
        });

        peer.on("connection", (dataConn) => {
          setupDataConnection(dataConn);
          if (screenStreamRef.current) {
            const call = peer.call(dataConn.peer, screenStreamRef.current, { metadata: { type: "screen", isHost } });
            call?.on("stream", (remoteStream) => {
              setRemoteMedia((current) => ({
                ...current,
                [dataConn.peer]: { ...current[dataConn.peer], screenStream: remoteStream },
              }));
            });
          }
          if (cameraStreamRef.current) {
            const call = peer.call(dataConn.peer, cameraStreamRef.current, { metadata: { type: "camera", isHost } });
            call?.on("stream", (remoteStream) => {
              setRemoteMedia((current) => ({
                ...current,
                [dataConn.peer]: { ...current[dataConn.peer], cameraStream: remoteStream },
              }));
            });
          }
        });

        peer.on("call", (mediaCall) => {
          const localStreams = [screenStreamRef.current, cameraStreamRef.current].filter(Boolean);
          if (localStreams.length > 0) {
            mediaCall.answer(localStreams[0]);
          } else {
            mediaCall.answer();
          }
          mediaCall.on("stream", (remoteStream) => {
            const isScreenCall = mediaCall.metadata?.type === "screen";
            const fromHost = mediaCall.metadata?.isHost || mediaCall.peer === hostPeerId;

            setRemoteMedia((current) => {
              const peerMedia = current[mediaCall.peer] || {};
              if (isScreenCall && fromHost) {
                return {
                  ...current,
                  [mediaCall.peer]: { ...peerMedia, screenStream: remoteStream },
                  [hostPeerId]: { ...current[hostPeerId], screenStream: remoteStream },
                };
              } else {
                return {
                  ...current,
                  [mediaCall.peer]: { ...peerMedia, cameraStream: remoteStream },
                };
              }
            });
          });
        });

        peer.on("error", (err) => {
          if (!isHost && err.type === "peer-unavailable") {
            showToast("Host is not online in this room yet.", "error");
          } else {
            console.warn("PeerJS note:", err);
            setConnected(true);
          }
        });
      };

      initPeer();
    }

    // Auto-retry connection loop for Guest over 4G LTE cellular data
    let retryTimer = null;
    if (session && !session.isHost) {
      const cleanCode = cleanRoomCode(session.roomCode);
      const hostPeerId = `philos-host-${cleanCode}`;
      retryTimer = setInterval(() => {
        if (peerRef.current && !peerRef.current.destroyed && !dataConnsRef.current.has(hostPeerId)) {
          connectToPeer(hostPeerId);
        }
      }, 2500);
    }

    // Host Stream Keep-Alive Ping for 4G LTE viewers
    let pingTimer = null;
    if (session && session.isHost) {
      pingTimer = setInterval(() => {
        if (screenStreamRef.current || cameraStreamRef.current) {
          renegotiateAll();
        }
      }, 4000);
    }

    return () => {
      if (retryTimer) clearInterval(retryTimer);
      if (pingTimer) clearInterval(pingTimer);
      clearTimeout(toastTimer.current);
      countdownTimersRef.current.forEach((timer) => {
        clearTimeout(timer);
        clearInterval(timer);
      });
      socketRef.current?.disconnect();
      peerRef.current?.destroy();
      channelRef.current?.close();
      wsRef.current?.close();
      peersRef.current.forEach(({ pc }) => pc.close());
      peersRef.current.clear();
      cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
      screenStreamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, [addLocalTracks, connectToPeer, createPeer, makeOffer, onLeave, runCountdown, session, setupDataConnection, showToast, streamMeta]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const removeTracksFromPeers = useCallback((trackIds) => {
    peersRef.current.forEach(({ pc }) => {
      pc.getSenders().forEach((sender) => {
        if (sender.track && trackIds.has(sender.track.id)) pc.removeTrack(sender);
      });
    });
  }, []);

  const toggleCamera = async () => {
    if (cameraOn) {
      const stream = cameraStreamRef.current;
      const tracks = stream?.getVideoTracks() || [];
      removeTracksFromPeers(new Set(tracks.map((track) => track.id)));
      tracks.forEach((track) => { track.stop(); stream.removeTrack(track); });
      setCameraOn(false);
      setMediaVersion((value) => value + 1);
      renegotiateAll();
      return;
    }
    try {
      const captured = await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 }, audio: false });
      if (!cameraStreamRef.current) cameraStreamRef.current = new MediaStream();
      captured.getVideoTracks().forEach((track) => cameraStreamRef.current.addTrack(track));
      setCameraOn(true);
      setMediaVersion((value) => value + 1);
      peersRef.current.forEach(({ pc }) => addLocalTracks(pc));
      renegotiateAll();
    } catch {
      showToast("Camera access was blocked. You can change it in your browser settings.", "error");
    }
  };

  const toggleMic = async () => {
    if (micOn) {
      const stream = cameraStreamRef.current;
      const tracks = stream?.getAudioTracks() || [];
      removeTracksFromPeers(new Set(tracks.map((track) => track.id)));
      tracks.forEach((track) => { track.stop(); stream.removeTrack(track); });
      setMicOn(false);
      setMediaVersion((value) => value + 1);
      renegotiateAll();
      return;
    }
    try {
      const captured = await navigator.mediaDevices.getUserMedia({ video: false, audio: { echoCancellation: true, noiseSuppression: true } });
      if (!cameraStreamRef.current) cameraStreamRef.current = new MediaStream();
      captured.getAudioTracks().forEach((track) => cameraStreamRef.current.addTrack(track));
      setMicOn(true);
      setMediaVersion((value) => value + 1);
      peersRef.current.forEach(({ pc }) => addLocalTracks(pc));
      renegotiateAll();
    } catch {
      showToast("Microphone access was blocked. You can still watch and chat.", "error");
    }
  };

  const stopScreen = useCallback(() => {
    if (screenStopInProgress.current || !screenStreamRef.current) return;
    screenStopInProgress.current = true;
    const stream = screenStreamRef.current;
    const ids = new Set(stream.getTracks().map((track) => track.id));
    removeTracksFromPeers(ids);
    stream.getTracks().forEach((track) => {
      track.onended = null;
      if (track.readyState === "live") track.stop();
    });
    screenStreamRef.current = null;
    setScreenOn(false);
    setMediaVersion((value) => value + 1);
    setTimeout(() => {
      screenStopInProgress.current = false;
      renegotiateAll();
    }, 0);
  }, [removeTracksFromPeers, renegotiateAll]);

  const toggleScreen = async () => {
    if (screenOn) {
      stopScreen();
      return;
    }
    if (!navigator.mediaDevices?.getDisplayMedia) {
      showToast("Screen sharing requires a desktop browser (Chrome, Edge, Firefox on PC or Mac).", "error");
      return;
    }
    setSharingBusy(true);
    try {
      const captured = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: { ideal: 30, max: 60 } },
        audio: true,
        systemAudio: "include",
      });
      screenStreamRef.current = captured;
      captured.getVideoTracks()[0].onended = stopScreen;
      setScreenOn(true);
      setMediaVersion((value) => value + 1);
      peersRef.current.forEach(({ pc }) => addLocalTracks(pc));
      renegotiateAll();
      if (!captured.getAudioTracks().length) {
        showToast("Screen shared. To include movie sound, choose a browser tab and tick ‘Share audio’.");
      } else {
        showToast("You’re sharing your screen and audio.", "success");
      }
    } catch (error) {
      if (error?.name !== "NotAllowedError") showToast("Screen sharing isn’t available in this browser.", "error");
    } finally {
      setSharingBusy(false);
    }
  };

  const sendMessage = (event) => {
    event.preventDefault();
    const text = chatText.trim();
    if (!text) return;
    if (socketRef.current) {
      socketRef.current.emit("chat-message", { text });
    } else {
      const payload = {
        id: `msg-${Date.now()}`,
        userId: peerRef.current?.id || "self",
        username: session.username,
        text,
        sentAt: new Date().toISOString(),
      };
      setMessages((current) => [...current, payload]);
      broadcastServerless("chat-message", payload);
    }
    setChatText("");
  };

  const sendReaction = (emoji) => {
    if (socketRef.current) {
      socketRef.current.emit("reaction", { emoji });
    } else {
      const reaction = { id: `react-${Date.now()}`, emoji, username: session.username };
      setReactions((current) => [...current, reaction]);
      setTimeout(() => setReactions((current) => current.filter((item) => item.id !== reaction.id)), 2600);
      broadcastServerless("reaction", reaction);
    }
  };

  const addToQueue = (event) => {
    event.preventDefault();
    const title = queueTitle.trim();
    if (!title) return;
    if (socketRef.current) {
      socketRef.current.emit("queue-add", { title }, (response) => {
        if (!response?.ok) showToast(response?.error || "That film couldn't be added.", "error");
      });
    } else {
      const newItem = {
        id: `item-${Date.now()}`,
        title,
        addedBy: session.username,
        addedById: peerRef.current?.id || "self",
        voters: [peerRef.current?.id || "self"],
        votes: 1,
      };
      const nextQueue = [...queue, newItem];
      setQueue(nextQueue);
      broadcastServerless("room-state", { queue: nextQueue, nowPlaying });
    }
    setQueueTitle("");
  };

  const startCountdown = () => {
    if (socketRef.current) {
      socketRef.current.emit("start-countdown");
    } else {
      const payload = { startsAt: Date.now() + 600, startedBy: session.username };
      runCountdown(payload);
      broadcastServerless("countdown-start", payload);
    }
  };

  const togglePictureInPicture = async () => {
    const video = document.querySelector(".screen__video");
    if (!video || !document.pictureInPictureEnabled) {
      showToast("Picture-in-picture becomes available once a screen is being shared.");
      return;
    }
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture();
      else await video.requestPictureInPicture();
    } catch {
      showToast("Picture-in-picture isn't available for this stream.", "error");
    }
  };

  const copyInvite = async () => {
    const url = new URL(window.location.href);
    url.searchParams.set("room", session.roomCode);
    url.searchParams.set("v", Date.now().toString(36));
    try {
      await navigator.clipboard.writeText(url.toString());
      setCopied(true);
      showToast("Invite link copied", "success");
      setTimeout(() => setCopied(false), 1800);
    } catch {
      window.prompt("Copy this invite link:", url.toString());
    }
  };

  const myId = peerRef.current?.id || socketRef.current?.id;
  const self = participants.find((user) => user.id === myId) || { id: myId || "self", username: session.username };
  const others = participants.filter((user) => user.id !== self.id && user.id !== myId);
  const cleanCode = cleanRoomCode(session.roomCode);
  const hostPeerId = `philos-host-${cleanCode}`;
  const hostMedia = remoteMedia[hostPeerId] || Object.values(remoteMedia).find((m) => m?.screenStream);
  const activeScreen = screenStreamRef.current || hostMedia?.screenStream || null;
  const activeScreenOwner = screenStreamRef.current ? "You" : "Host";
  const selfMedia = cameraStreamRef.current;
  void mediaVersion;

  const canShareScreen = Boolean(navigator.mediaDevices?.getDisplayMedia) && (!activeScreen || screenOn);

  return (
    <main className={`room ${chatOpen ? "" : "room--chat-closed"} ${ambience ? "room--ambient" : ""}`}>
      <Toast toast={toast} />
      {countdown !== null && <div className="countdown-overlay" aria-live="assertive"><span>{countdown}</span><small>{countdown === "PLAY" ? "ENJOY THE FILM" : "GET READY"}</small></div>}
      <div className="reaction-layer" aria-live="polite">
        {reactions.map((reaction, index) => <div key={reaction.id} className="floating-reaction" style={{ "--offset": `${(index % 4) * 48}px` }}><b>{reaction.emoji}</b><span>{reaction.username}</span></div>)}
      </div>

      <header className="room__header">
        <Brand compact />
        <div className="room-title"><span className={`connection-dot ${connected ? "" : "connection-dot--off"}`} /> <strong>Philos movie night</strong><span>Room {session.roomCode}</span></div>
        <div className="room-header__actions">
          <button className="invite-button" onClick={copyInvite}>{copied ? <Check size={16} /> : <Share2 size={16} />}{copied ? "Copied" : "Invite friends"}</button>
          <button className={`icon-button ${ambience ? "icon-button--active" : ""}`} onClick={() => setAmbience((value) => !value)} title={ambience ? "Turn theatre ambience off" : "Turn theatre ambience on"}>{ambience ? <Moon size={18} /> : <Sun size={18} />}</button>
          <button className={`icon-button ${settingsOpen ? "icon-button--active" : ""}`} title="Room settings" onClick={() => setSettingsOpen((value) => !value)}><Settings size={18} /></button>
          <button className="profile-chip"><Avatar name={session.username} id={self.id} size="xs" /><span>{session.username}</span></button>
        </div>
      </header>

      {settingsOpen && (
        <div className="settings-popover">
          <div className="settings-popover__head"><div><Settings size={16} /><strong>Room settings</strong></div><button onClick={() => setSettingsOpen(false)} title="Close settings"><X size={16} /></button></div>
          <button className="setting-row" onClick={() => setAmbience((value) => !value)}><span>{ambience ? <Moon size={17} /> : <Sun size={17} />}</span><div><strong>Theatre ambience</strong><small>Soft cinematic glow</small></div><i className={ambience ? "is-on" : ""}>{ambience ? "On" : "Off"}</i></button>
          <button className="setting-row" onClick={toggleMic}><span>{micOn ? <Mic size={17} /> : <MicOff size={17} />}</span><div><strong>Microphone</strong><small>Echo cancellation enabled</small></div><i className={micOn ? "is-on" : ""}>{micOn ? "On" : "Off"}</i></button>
          <button className="setting-row" onClick={toggleCamera}><span>{cameraOn ? <Camera size={17} /> : <CameraOff size={17} />}</span><div><strong>Camera</strong><small>HD when available</small></div><i className={cameraOn ? "is-on" : ""}>{cameraOn ? "On" : "Off"}</i></button>
          <div className="settings-security"><Check size={13} /><span><strong>Private peer-to-peer media</strong><small>WebRTC encrypted in transit · 20 seats max</small></span></div>
        </div>
      )}

      <div className="room__body">
        <section className="watch-area">
          <div className={`screen ${activeScreen ? "screen--active" : ""}`}>
            {activeScreen ? (
              <VideoSurface stream={activeScreen} muted={Boolean(screenStreamRef.current)} className="screen__video" />
            ) : (
              <div className="screen__empty">
                <div className="screen__orb"><Play size={34} fill="currentColor" /></div>
                <span className="screen__kicker">THE ROOM IS READY</span>
                {canShareScreen ? (
                  <>
                    <h2>What are we watching?</h2>
                    <p>Share a browser tab or window, then press play when everyone’s here.</p>
                    <button onClick={toggleScreen} disabled={sharingBusy}><MonitorUp size={18} /> {sharingBusy ? "Opening picker…" : "Share your screen"}</button>
                  </>
                ) : (
                  <>
                    <h2>Waiting for presenter</h2>
                    <p>The desktop room host will share the movie screen shortly. Sit back and enjoy!</p>
                  </>
                )}
              </div>
            )}
            <div className="screen__topbar">
              <span className={activeScreen ? "live-badge" : "waiting-badge"}><i /> {activeScreen ? "LIVE" : "WAITING"}</span>
              {activeScreenOwner && <span className="sharing-label"><MonitorUp size={14} /> {activeScreenOwner} {activeScreenOwner === "You" ? "are" : "is"} presenting</span>}
              {nowPlaying && <span className="now-playing-label"><Play size={11} fill="currentColor" /> {nowPlaying.title}</span>}
              <div className="screen__top-actions">
                <button title="Picture in picture" onClick={togglePictureInPicture}><PictureInPicture2 size={16} /></button>
                <button title="Fullscreen" onClick={() => document.querySelector(".screen")?.requestFullscreen?.()}><Expand size={17} /></button>
              </div>
            </div>
            <div className="screen__controlbar">
              <button className={`round-control ${micOn ? "round-control--on" : ""}`} onClick={toggleMic} title={micOn ? "Mute" : "Unmute"}>{micOn ? <Mic size={19} /> : <MicOff size={19} />}</button>
              <button className={`round-control ${cameraOn ? "round-control--on" : ""}`} onClick={toggleCamera} title={cameraOn ? "Camera off" : "Camera on"}>{cameraOn ? <Camera size={19} /> : <CameraOff size={19} />}</button>
              {(canShareScreen || screenOn) && (
                <button className={`share-control ${screenOn ? "share-control--active" : ""}`} onClick={toggleScreen} disabled={sharingBusy}><MonitorUp size={18} /> {screenOn ? "Stop sharing" : "Share screen"}</button>
              )}
              <button className="round-control round-control--countdown" onClick={startCountdown} title="Start a synced countdown"><Timer size={19} /></button>
              <button className="round-control" onClick={() => setChatOpen((value) => !value)} title="Toggle chat"><MessageCircle size={19} /></button>
              <button className="round-control round-control--leave" onClick={onLeave} title="Leave room"><DoorOpen size={19} /></button>
            </div>
          </div>

          <div className="people-row">
            <div className="people-row__heading"><div><Users size={17} /><strong>In the room</strong><span>{participants.length}</span></div><button><MoreHorizontal size={18} /></button></div>
            <div className="people-grid">
              <ParticipantTile participant={self} stream={selfMedia} self micOn={micOn} />
              {others.map((participant) => <ParticipantTile key={participant.id} participant={participant} stream={remoteMedia[participant.id]?.cameraStream} micOn={Boolean(remoteMedia[participant.id]?.cameraStream?.getAudioTracks().length)} />)}
              {Array.from({ length: Math.max(0, Math.min(3, 20 - participants.length)) }).map((_, index) => <EmptySeat key={index} />)}
              <button className="add-seat" onClick={copyInvite}><span><Copy size={18} /></span><strong>Invite</strong><small>Copy room link</small></button>
            </div>
          </div>
        </section>

        <aside className="chat-panel">
          <div className="chat-panel__head">
            <div className="panel-tabs">
              <button className={panelTab === "chat" ? "is-active" : ""} onClick={() => setPanelTab("chat")}><MessageCircle size={15} /><strong>Chat</strong><span>{messages.filter((message) => !message.system).length}</span></button>
              <button className={panelTab === "queue" ? "is-active" : ""} onClick={() => setPanelTab("queue")}><ListVideo size={15} /><strong>Queue</strong><span>{queue.length}</span></button>
            </div>
            <button onClick={() => setChatOpen(false)} title="Close chat"><X size={18} /></button>
          </div>
          {panelTab === "chat" ? <>
            <div className="chat-panel__messages">
              <div className="chat-date"><span /> TONIGHT <span /></div>
              {messages.map((message) => message.system ? (
                <div className="system-message" key={message.id}><Sparkles size={13} /> {message.text}</div>
              ) : (
                <div className={`chat-message ${message.userId === self.id ? "chat-message--self" : ""}`} key={message.id}>
                  <Avatar name={message.username} id={message.userId} size="xs" />
                  <div><p><strong>{message.userId === self.id ? "You" : message.username}</strong><time>{new Date(message.sentAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</time></p><span>{message.text}</span></div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
            <div className="reaction-row">
              {REACTIONS.map((emoji) => <button key={emoji} onClick={() => sendReaction(emoji)}>{emoji}</button>)}
            </div>
            <form className="chat-compose" onSubmit={sendMessage}>
              <input value={chatText} onChange={(event) => setChatText(event.target.value)} placeholder="Say something…" maxLength={500} />
              <button type="submit" disabled={!chatText.trim()}><Send size={17} /></button>
            </form>
            <div className="chat-tip"><Volume2 size={13} /> Tip: share a tab to include movie audio</div>
          </> : (
            <QueuePanel
              queue={queue}
              nowPlaying={nowPlaying}
              queueTitle={queueTitle}
              setQueueTitle={setQueueTitle}
              selfId={self.id}
              onAdd={addToQueue}
              onVote={(itemId) => {
                if (socketRef.current) {
                  socketRef.current.emit("queue-vote", { itemId });
                } else {
                  const nextQueue = queue.map((item) => {
                    if (item.id !== itemId) return item;
                    const voted = item.voters?.includes(self.id);
                    const voters = voted ? item.voters.filter((id) => id !== self.id) : [...(item.voters || []), self.id];
                    return { ...item, voters, votes: voters.length };
                  });
                  setQueue(nextQueue);
                  broadcastServerless("room-state", { queue: nextQueue, nowPlaying });
                }
              }}
              onPlay={(itemId) => {
                const item = queue.find((entry) => entry.id === itemId);
                if (!item) return;
                if (socketRef.current) {
                  socketRef.current.emit("set-now-playing", { itemId });
                } else {
                  const np = { id: item.id, title: item.title };
                  setNowPlaying(np);
                  broadcastServerless("room-state", { queue, nowPlaying: np });
                  const sysMsg = { id: `now-playing-${Date.now()}`, system: true, text: `Now watching: ${item.title}` };
                  setMessages((current) => [...current, sysMsg]);
                  broadcastServerless("chat-message", sysMsg);
                }
              }}
              onRemove={(itemId) => {
                if (socketRef.current) {
                  socketRef.current.emit("queue-remove", { itemId });
                } else {
                  const nextQueue = queue.filter((entry) => entry.id !== itemId);
                  setQueue(nextQueue);
                  broadcastServerless("room-state", { queue: nextQueue, nowPlaying });
                }
              }}
            />
          )}
        </aside>
      </div>
    </main>
  );
}

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error) {
    console.warn("App catch boundary:", error);
  }
  render() {
    if (this.state.hasError) {
      return (
        <main className="landing" style={{ padding: "60px 20px", textAlign: "center" }}>
          <h2>Philos Movie Nights</h2>
          <p>We encountered an issue loading this room session.</p>
          <button className="primary-action" style={{ maxWidth: "260px", margin: "20px auto" }} onClick={() => { safeSetStorage("local", "philos-server-url", ""); window.location.reload(); }}>
            Reset & Reload
          </button>
        </main>
      );
    }
    return this.props.children;
  }
}

function MainApp() {
  const [session, setSession] = useState(null);
  const enterRoom = useCallback((nextSession) => {
    const url = new URL(window.location.href);
    url.searchParams.set("room", nextSession.roomCode);
    window.history.replaceState({}, "", url);
    setSession(nextSession);
  }, []);
  const leaveRoom = useCallback(() => {
    const url = new URL(window.location.href);
    url.searchParams.delete("room");
    window.history.replaceState({}, "", url);
    setSession(null);
  }, []);
  return session ? <MovieRoom session={session} onLeave={leaveRoom} /> : <Landing onEnter={enterRoom} />;
}

export default function App() {
  return (
    <ErrorBoundary>
      <MainApp />
    </ErrorBoundary>
  );
}
