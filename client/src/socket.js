import { io } from "socket.io-client";

// One Socket.IO connection for the whole app, made with the logged in user's token.
// The server uses it to push new messages and notifications to this tab.
let socket = null;
let socketToken = null;

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
  // no address given: it connects to the same site, and Vite forwards /socket.io to the server
  socket = io({ auth: { token: token } });
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
