import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";

function WatchlistButtons({ movieId }) {
  const user = useSelector((state) => state.auth.user);
  const token = useSelector((state) => state.auth.token);

  // "" means the movie is not in the watchlist, otherwise "want" or "watched"
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  const headers = {
    "Content-Type": "application/json",
    Authorization: "Bearer " + token,
  };

  // when the page opens, check if this movie is already in the user's watchlist
  useEffect(() => {
    if (!token) {
      setStatus("");
      return;
    }

    async function loadStatus() {
      try {
        const res = await fetch("/api/watchlist", { headers: headers });
        const data = await res.json();

        if (!res.ok) {
          setError(data.message);
          return;
        }

        let found = "";
        for (let i = 0; i < data.length; i++) {
          if (data[i].movieId === movieId) {
            found = data[i].status;
          }
        }
        setStatus(found);
      } catch (err) {
        setError("Could not reach the server");
      }
    }
    loadStatus();
  }, [movieId, token]);

  // add the movie, or change its status (want / watched)
  async function saveStatus(newStatus) {
    setError("");

    try {
      const res = await fetch("/api/watchlist", {
        method: "POST",
        headers: headers,
        body: JSON.stringify({ movieId: movieId, status: newStatus }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.message);
        return;
      }

      setStatus(newStatus);
    } catch (err) {
      setError("Could not reach the server");
    }
  }

  async function removeFromList() {
    setError("");

    try {
      const res = await fetch("/api/watchlist/" + movieId, {
        method: "DELETE",
        headers: headers,
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.message);
        return;
      }

      setStatus("");
    } catch (err) {
      setError("Could not reach the server");
    }
  }

  if (!user) {
    return (
      <p className="small">
        <Link to="/login">Login</Link> to add this movie to your watchlist.
      </p>
    );
  }

  // the button for the current status gets the "active" class
  let wantClass = "";
  let watchedClass = "";
  if (status === "want") {
    wantClass = "active";
  }
  if (status === "watched") {
    watchedClass = "active";
  }

  return (
    <div>
      <div className="watchlist-buttons">
        <button className={wantClass} onClick={() => saveStatus("want")}>
          Want to watch
        </button>
        <button className={watchedClass} onClick={() => saveStatus("watched")}>
          Watched
        </button>
        {status && <button onClick={removeFromList}>Remove</button>}
      </div>
      {error && <p className="error">{error}</p>}
    </div>
  );
}

export default WatchlistButtons;