import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { logout } from "../store/authSlice";
import { disconnectSocket } from "../socket";
import useSocketEvent from "../useSocketEvent";

function Navbar() {
  const user = useSelector((state) => state.auth.user);
  const token = useSelector((state) => state.auth.token);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [unreadMessages, setUnreadMessages] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  // ask the server how many unread messages and notifications there are
  async function loadCounts() {
    if (!token) {
      return;
    }
    try {
      const chatRes = await fetch("/api/chat/unread", {
        headers: { Authorization: "Bearer " + token },
      });
      const notesRes = await fetch("/api/notifications", {
        headers: { Authorization: "Bearer " + token },
      });
      if (chatRes.ok) {
        const chatData = await chatRes.json();
        setUnreadMessages(chatData.count);
      }
      if (notesRes.ok) {
        const notesData = await notesRes.json();
        setUnreadNotifications(notesData.unreadCount);
      }
    } catch (err) {
      // the counts just stay as they are
    }
  }

  useEffect(() => {
    setUnreadMessages(0);
    setUnreadNotifications(0);
    loadCounts();
  }, [token]);

  // the server tells us when something new arrives, or when something was read
  useSocketEvent("notification", loadCounts);
  useSocketEvent("message", loadCounts);
  useSocketEvent("counts_changed", loadCounts);

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    disconnectSocket();
    dispatch(logout());
    navigate("/");
  }

  return (
    <nav className="navbar">
      <Link to="/" className="logo">
        MovieHive
      </Link>
      <div className="nav-links">
        <Link to="/recommendations">Moods</Link>
        <Link to="/forum">Forum</Link>

        {user ? (
          <>
            <Link to="/watchlist">Watchlist</Link>
            <Link to="/friends">Friends</Link>
            <Link to="/chat">
              Chat
              {unreadMessages > 0 && <span className="badge">{unreadMessages}</span>}
            </Link>
            <Link to="/notifications" aria-label="Notifications">
              Alerts
              {unreadNotifications > 0 && <span className="badge">{unreadNotifications}</span>}
            </Link>
            <Link to="/profile">Profile</Link>
            <span>Hello, {user.name}</span>
            <button onClick={handleLogout}>Logout</button>
          </>
        ) : (
          <>
            <Link to="/login">Login</Link>
            <Link to="/register">Sign up</Link>
          </>
        )}
      </div>
    </nav>
  );
}

export default Navbar;
