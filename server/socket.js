const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const allowedOrigins = require("./config/origins");

// Socket.IO keeps an open connection between the server and each logged in browser,
// so the server can push new messages and notifications without the page asking.
let io = null;

// called once from index.js with the http server
const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: { origin: allowedOrigins },
  });

  // only logged in users can connect: the browser sends its JWT when connecting
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth && socket.handshake.auth.token;
      socket.user = jwt.verify(token, process.env.JWT_SECRET);
      next();
    } catch (err) {
      next(new Error("Not authorized"));
    }
  });

  io.on("connection", (socket) => {
    // every user gets their own "room". A user with two tabs open has two
    // sockets in the same room, and both get every event.
    socket.join("user:" + socket.user.id);
  });

  return io;
};

// sends an event to every open tab of one user (does nothing if they are offline)
const emitToUser = (userId, event, data) => {
  if (io) {
    io.to("user:" + userId.toString()).emit(event, data);
  }
};

module.exports = { initSocket, emitToUser };
