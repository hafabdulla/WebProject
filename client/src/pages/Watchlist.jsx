import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import MovieCard from "../components/MovieCard";

function Watchlist() {
  const token = useSelector((state) => state.auth.token);

  // which tab is open: "want" or "watched"
  const [status, setStatus] = useState("want");
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadWatchlist() {
      setLoading(true);
      setError("");

      try {
        const res = await fetch("/api/watchlist?status=" + status, {
          headers: { Authorization: "Bearer " + token },
        });
        const items = await res.json();

        if (!res.ok) {
          setError(items.message);
          setLoading(false);
          return;
        }

        // the watchlist only saves movie ids, so we ask for each movie's details
        const loaded = [];
        for (let i = 0; i < items.length; i++) {
          const movieRes = await fetch("/api/movies/" + items[i].movieId);
          if (movieRes.ok) {
            const movie = await movieRes.json();
            loaded.push(movie);
          }
        }
        setMovies(loaded);
      } catch (err) {
        setError("Could not reach the server");
      }
      setLoading(false);
    }
    loadWatchlist();
  }, [status, token]);

  const cards = [];
  for (let i = 0; i < movies.length; i++) {
    cards.push(<MovieCard key={movies[i].id} movie={movies[i]} />);
  }

  let wantClass = "";
  let watchedClass = "";
  if (status === "want") {
    wantClass = "active";
  } else {
    watchedClass = "active";
  }

  return (
    <div className="page-wide">
      <h2>My watchlist</h2>

      <div className="category-tabs">
        <button className={wantClass} onClick={() => setStatus("want")}>
          Want to watch
        </button>
        <button className={watchedClass} onClick={() => setStatus("watched")}>
          Watched
        </button>
      </div>

      {error && <p className="error">{error}</p>}
      {loading && <p>Loading...</p>}
      {!loading && !error && movies.length === 0 && (
        <p className="small">No movies here yet. Open a movie and use the buttons to add it.</p>
      )}

      <div className="movie-grid">{cards}</div>
    </div>
  );
}

export default Watchlist;