// The websites that are allowed to talk to this server (CORS).
// CLIENT_URL can hold one address, or several separated by commas, e.g.
//   CLIENT_URL=http://localhost:5173,https://moviehive.vercel.app
const allowedOrigins = (process.env.CLIENT_URL || "http://localhost:5173")
  .split(",")
  .map((address) => address.trim().replace(/\/$/, "")) // "https://x.app/" -> "https://x.app"
  .filter((address) => address !== "");

module.exports = allowedOrigins;
