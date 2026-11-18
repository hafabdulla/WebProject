import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";

// Shows the right friend action for one user:
//   none     -> "Add friend"
//   sent     -> "Request sent" + "Cancel"
//   received -> "Accept" + "Decline"
//   friends  -> "Friends" + "Remove"
// If the page already knows the status (for example from a search), it passes
// initialStatus and initialRequestId; otherwise the button asks the server.
// onChange is called after every change, so the page can reload its lists.
function FriendButton({ userId, initialStatus, initialRequestId, onChange }) {
  const user = useSelector((state) => state.auth.user);
  const token = useSelector((state) => state.auth.token);

  const [status, setStatus] = useState(initialStatus || "");
  const [requestId, setRequestId] = useState(initialRequestId || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const headers = {
    "Content-Type": "application/json",
    Authorization: "Bearer " + token,
  };

  // ask the server for the status when the page did not pass one
  useEffect(() => {
    if (initialStatus || !token) {
      return;
    }
    async function loadStatus() {
      try {
        const res = await fetch("/api/friends/status/" + userId, { headers: headers });
        const data = await res.json();
        if (res.ok) {
          setStatus(data.status);
          setRequestId(data.requestId || "");
        }
      } catch (err) {
        setError("Could not reach the server");
      }
    }
    loadStatus();
  }, [userId, token]);

  // sends one request to the server, then updates the button
  async function send(url, method, body, newStatus) {
    setBusy(true);
    setError("");
    try {
      const options = { method: method, headers: headers };
      if (body) {
        options.body = JSON.stringify(body);
      }
      const res = await fetch(url, options);
      const data = await res.json();

      if (!res.ok) {
        setError(data.message);
        setBusy(false);
        return;
      }

      // sending a request to someone who already asked you makes you friends straight away
      if (method === "POST" && url === "/api/friends/requests") {
        if (data.friendship && data.friendship.status === "accepted") {
          newStatus = "friends";
        }
        if (data.friendship) {
          setRequestId(data.friendship._id);
        }
      }
      setStatus(newStatus);
      if (onChange) {
        onChange();
      }
    } catch (err) {
      setError("Could not reach the server");
    }
    setBusy(false);
  }

  function addFriend() {
    send("/api/friends/requests", "POST", { userId: userId }, "sent");
  }

  function cancelRequest() {
    send("/api/friends/requests/" + requestId, "DELETE", null, "none");
  }

  function acceptRequest() {
    send("/api/friends/requests/" + requestId + "/accept", "POST", null, "friends");
  }

  function declineRequest() {
    send("/api/friends/requests/" + requestId + "/decline", "POST", null, "none");
  }

  function removeFriend() {
    if (!window.confirm("Remove this friend?")) {
      return;
    }
    send("/api/friends/" + userId, "DELETE", null, "none");
  }

  if (!user) {
    return (
      <p className="small">
        <Link to="/login">Login</Link> to add friends.
      </p>
    );
  }

  // nothing to show on your own page, or while the status is still loading
  if (status === "self" || status === "") {
    return error ? <p className="error">{error}</p> : null;
  }

  let buttons;
  if (status === "none") {
    buttons = (
      <button className="small-button" onClick={addFriend} disabled={busy}>
        Add friend
      </button>
    );
  } else if (status === "sent") {
    buttons = (
      <>
        <span className="small">Request sent</span>
        <button className="small-button secondary-button" onClick={cancelRequest} disabled={busy}>
          Cancel
        </button>
      </>
    );
  } else if (status === "received") {
    buttons = (
      <>
        <button className="small-button" onClick={acceptRequest} disabled={busy}>
          Accept
        </button>
        <button className="small-button secondary-button" onClick={declineRequest} disabled={busy}>
          Decline
        </button>
      </>
    );
  } else {
    buttons = (
      <>
        <span className="small">Friends</span>
        <button className="small-button secondary-button" onClick={removeFriend} disabled={busy}>
          Remove
        </button>
      </>
    );
  }

  return (
    <div className="friend-actions">
      {buttons}
      {error && <span className="error">{error}</span>}
    </div>
  );
}

export default FriendButton;
