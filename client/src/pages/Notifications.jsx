import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import useSocketEvent from "../useSocketEvent";

function Notifications() {
  const token = useSelector((state) => state.auth.token);
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const headers = { Authorization: "Bearer " + token };

  async function loadNotifications() {
    try {
      const res = await fetch("/api/notifications", { headers: headers });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message);
        return;
      }
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch (err) {
      setError("Could not reach the server");
    }
  }

  useEffect(() => {
    async function firstLoad() {
      setLoading(true);
      await loadNotifications();
      setLoading(false);
    }
    firstLoad();
  }, [token]);

  // new notifications appear while the page is open
  useSocketEvent("notification", loadNotifications);
  useSocketEvent("counts_changed", loadNotifications);

  async function markAllRead() {
    try {
      await fetch("/api/notifications/read-all", { method: "POST", headers: headers });
      loadNotifications();
    } catch (err) {
      setError("Could not reach the server");
    }
  }

  // clicking a notification marks it as read and opens its page
  async function openNotification(notification) {
    if (!notification.read) {
      try {
        await fetch("/api/notifications/" + notification._id + "/read", {
          method: "POST",
          headers: headers,
        });
      } catch (err) {
        // still open the page
      }
    }
    if (notification.link) {
      navigate(notification.link);
    } else {
      loadNotifications();
    }
  }

  const items = [];
  for (let i = 0; i < notifications.length; i++) {
    const n = notifications[i];
    let className = "notification";
    if (!n.read) {
      className = "notification unread";
    }
    items.push(
      <button className={className} key={n._id} onClick={() => openNotification(n)}>
        <span>{n.text}</span>
        <span className="small">{new Date(n.updatedAt).toLocaleString()}</span>
      </button>
    );
  }

  return (
    <div className="page-wide narrow">
      <div className="page-title-row">
        <h2>Notifications</h2>
        {unreadCount > 0 && (
          <button className="small-button secondary-button" onClick={markAllRead}>
            Mark all as read
          </button>
        )}
      </div>
      {error && <p className="error">{error}</p>}
      {loading && <p>Loading...</p>}
      {!loading && !error && notifications.length === 0 && (
        <p className="small">No notifications yet.</p>
      )}
      {items}
    </div>
  );
}

export default Notifications;
