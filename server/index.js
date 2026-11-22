require("dotenv").config();

const authRoutes = require("./routes/authRoutes")
const reviewRoutes = require("./routes/reviewRoutes");
const watchlistRoutes = require("./routes/watchlistRoutes");
const movieRoutes = require("./routes/movieRoutes");
const friendRoutes = require("./routes/friendRoutes");
const userRoutes = require("./routes/userRoutes");
const forumRoutes = require("./routes/forumRoutes");
const chatRoutes = require("./routes/chatRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const listRoutes = require("./routes/listRoutes");
const adminRoutes = require("./routes/adminRoutes")
const tasteRoutes = require("./routes/tasteRoutes");
const http = require("http");
const { initSocket } = require("./socket");
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const allowedOrigins = require("./config/origins");

const app = express();

connectDB();

app.use(cors({ origin: allowedOrigins }));
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/watchlist", watchlistRoutes);
app.use("/api/movies", movieRoutes);
app.use("/api/friends", friendRoutes);
app.use("/api/users", userRoutes);
app.use("/api/forum", forumRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/lists", listRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/taste", tasteRoutes);
app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

const PORT = process.env.PORT || 5000;

// Socket.IO needs the plain http server that Express runs on
const server = http.createServer(app);
initSocket(server);

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});