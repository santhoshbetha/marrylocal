import { socketUrl } from '@/api/client';

let socket = null;
let activeToken = null;
let reconnectTimer = null;
let heartbeatTimer = null;
let refCounter = 0;
let joinRefCounter = 0;
const subscribers = new Map();

function nextRef() {
  refCounter += 1;
  return String(refCounter);
}

function send(message) {
  if (socket?.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(message));
  }
}

function scheduleReconnect() {
  if (reconnectTimer || !activeToken) return;
  reconnectTimer = window.setTimeout(() => {
    reconnectTimer = null;
    connect(activeToken);
  }, 1500);
}

function heartbeat() {
  send([null, nextRef(), 'phoenix', 'heartbeat', {}]);
}

function connect(token) {
  if (!token) return null;

  if (socket && activeToken === token) return socket;

  disconnectSocket();
  activeToken = token;

  const url = `${socketUrl()}/websocket?vsn=2.0.0&token=${encodeURIComponent(token)}`;
  socket = new WebSocket(url);

  socket.onopen = () => {
    heartbeatTimer = window.setInterval(heartbeat, 25_000);

    subscribers.forEach((handlers, topic) => {
      send([String(++joinRefCounter), nextRef(), topic, 'phx_join', {}]);
    });
  };

  socket.onmessage = event => {
    let message;
    try {
      message = JSON.parse(event.data);
    } catch {
      return;
    }

    const [, , topic, eventName, payload] = message;
    if (!topic || topic === 'phoenix' || eventName === 'phx_reply') return;

    const handlers = subscribers.get(topic);
    handlers?.forEach(handler => handler(payload, eventName));
  };

  socket.onclose = () => {
    if (heartbeatTimer) window.clearInterval(heartbeatTimer);
    heartbeatTimer = null;
    socket = null;
    scheduleReconnect();
  };

  socket.onerror = () => {
    // onclose handles reconnect and cleanup.
  };

  return socket;
}

export function acquireSocket(token) {
  return connect(token);
}

export function subscribeToTopic(topic, onEvent) {
  const isNewTopic = !subscribers.has(topic);
  if (isNewTopic) subscribers.set(topic, new Set());
  subscribers.get(topic).add(onEvent);

  if (isNewTopic) {
    send([String(++joinRefCounter), nextRef(), topic, 'phx_join', {}]);
  }

  return () => {
    const handlers = subscribers.get(topic);
    handlers?.delete(onEvent);
    if (handlers && handlers.size === 0) {
      subscribers.delete(topic);
      send([String(++joinRefCounter), nextRef(), topic, 'phx_leave', {}]);
    }
  };
}

export function disconnectSocket() {
  if (reconnectTimer) window.clearTimeout(reconnectTimer);
  if (heartbeatTimer) window.clearInterval(heartbeatTimer);
  reconnectTimer = null;
  heartbeatTimer = null;

  if (socket) {
    socket.onclose = null;
    socket.close();
  }

  socket = null;
  activeToken = null;
}

export function isSocketConnected() {
  return socket?.readyState === WebSocket.OPEN;
}

export { socketUrl };
export default { acquireSocket, subscribeToTopic, disconnectSocket, isSocketConnected, socketUrl };
