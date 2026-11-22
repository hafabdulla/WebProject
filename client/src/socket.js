import { io } from "socket.io-client";

// One Socket.IO connection for the whole app, made with the logged in user's token.
// The server uses it to push new messages and notifications to this tab.
let socket = null;
let socketToken = null;

// The server's address, e.g. https://moviehive-api.onrender.com
// It comes from client/.env (VITE_SERVER_URL) or from Vercel's settings.
// Empty on your PC, where Vite's proxy is used instead.
const SERVER_URL = import.meta.env.VITE_SERVER_URL || "";

// returns the connection for this token, making it if needed.
// With no token (logged out) it closes the connection and returns null.
export function getSocket(token) {
  if (!token) {
    disconnectSocket();
    return null;
  }
  if (socket && socketToken === token) {
    return socket;
  }
  disconnectSocket();
  const options = { auth: { token: token } };
  if (SERVER_URL) {
    // online: connect straight to the server (Vercel can't forward live connections)
    socket = io(SERVER_URL, options);
  } else {
    // on your PC: connect to the same site, and Vite forwards /socket.io to the server
    socket = io(options);
  }
  socketToken = token;
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
  }
  socket = null;
  socketToken = null;
}
