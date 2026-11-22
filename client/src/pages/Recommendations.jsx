import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import MovieCard from "../components/MovieCard";

// "Comedy", "Comedy and Drama", "Comedy, Drama and Action"
function joinNames(names) {
  if (names.length <= 1) {
    return names.join("");
  }
  return names.slice(0, -1).join(", ") + " and " + names[names.length - 1];
}

function formatDate(date) {
  return new Date(date).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

function Recommendations() {
  const user = useSelector((state) => state.auth.user);
  const token = useSelector((state) => state.auth.token);

  const [moods, setMoods] = useState([]);
  const [mood, setMood] = useState("");
  const [movies, setMovies] = useState([]);
  const [label, setLabel] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // picked for the logged in user, from how they feel about each genre
  const [suggestions, setSuggestions] = useState(null);
  const [taste, setTaste] = useState(null);
  const [tasteError, setTasteError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    async function loadMoods() {
      try {
        const res = await fetch("/api/movies/moods");
        const data = await res.json();
        if (!res.ok) {
          setError(data.message);
          return;
        }
        setMoods(data);
      } catch (err) {
        setError("could not reach the server");
      }
    }
    loadMoods();
  }, []);

  async function loadForYou() {
    if (!token) {
      setSuggestions(null);
      setTaste(null);
      return;
    }
    const headers = { Authorization: "Bearer " + token };
    try {
      const tasteRes = await fetch("/api/taste", { headers: headers });
      const tasteData = await tasteRes.json();
      if (!tasteRes.ok) {
        setTasteError(tasteData.message);
        return;
      }
      setTaste(tasteData);

      const sugRes = await fetch("/api/taste/suggestions", { headers: headers });
      const sugData = await sugRes.json();
      if (!sugRes.ok) {
        setTasteError(sugData.message);
        return;
      }
      setTasteError("");
      setSuggestions(sugData);
    } catch (err) {
      setTasteError("could not reach the server");
    }
  }

  useEffect(() => {
    loadForYou();
  }, [token]);

  useEffect(() => {
    if (!mood) {
      return;
    }
    async function loadRecommendations() {
      setLoading(true);
      setError("");
      try {
        const res = await fetch("/api/movies/mood/" + mood);
        const data = await res.json();
        if (!res.ok) {
          setError(data.message);
          setMovies([]);
          setLoading(false);
          return;
        }
        setMovies(data.results);
        setLabel(data.label);
      } catch (err) {
        setError("could not reach the server");
      }
      setLoading(false);
    }
    loadRecommendations();
  }, [mood]);

  async function resume(genreId) {
    setNotice("");
    try {
      const res = await fetch("/api/taste/resume/" + genreId, {
        method: "POST",
        headers: { Authorization: "Bearer " + token },
      });
      const data = await res.json();
      if (!res.ok) {
        setTasteError(data.message);
        return;
      }
      setNotice(data.message);
      loadForYou();
    } catch (err) {
      setTasteError("could not reach the server");
    }
  }

  const moodButtons = [];

  for (let i = 0; i < moods.length; i++) {
    let buttonClass = "";
    if (mood === moods[i].value) {
      buttonClass = "active";
    }

    moodButtons.push(
      <button
        key={moods[i].value}
        className={buttonClass}
        onClick={() => setMood(moods[i].value)}
      >
        {moods[i].label}
      </button>,
    );
  }

  const cards = [];

  for (let i = 0; i < movies.length; i++) {
    cards.push(<MovieCard key={movies[i].id} movie={movies[i]} />);
  }

  // the "Picked for you" movies
  const suggestionCards = [];
  if (suggestions) {
    for (let i = 0; i < suggestions.results.length; i++) {
      const movie = suggestions.results[i];
      suggestionCards.push(
        <div key={movie.id}>
          <MovieCard movie={movie} />
          <p className="small">{movie.reason}</p>
        </div>,
      );
    }
  }

  // one row per genre: how much they like it, from -1 to 1, drawn as a bar from the middle
  const tasteRows = [];
  if (taste) {
    for (let i = 0; i < taste.genres.length; i++) {
      const genre = taste.genres[i];
      const width = Math.min(Math.abs(genre.average), 1) * 50;
      const barStyle = { width: width + "%" };
      if (genre.average >= 0) {
        barStyle.left = "50%";
      } else {
        barStyle.left = 50 - width + "%";
      }

      let statusText = "Liked";
      if (genre.status === "mixed") {
        statusText = "Mixed";
      } else if (genre.status === "disliked") {
        statusText = "Disliked";
      } else if (genre.status === "paused") {
        statusText = "Paused until " + formatDate(genre.pausedUntil);
      }

      tasteRows.push(
        <div className="taste-row" key={genre.id}>
          <span className="taste-name">{genre.name}</span>
          <div className="taste-bar" title={"Feeling: " + genre.average}>
            <div
              className={genre.average >= 0 ? "taste-fill" : "taste-fill negative"}
              style={barStyle}
            />
          </div>
          <div className="taste-right">
            <span className={"taste-status status-" + genre.status}>{statusText}</span>
            <span className="small">
              {genre.count} {genre.count === 1 ? "review" : "reviews"}
            </span>
            {genre.status === "paused" && (
              <button className="small-button secondary-button" onClick={() => resume(genre.id)}>
                Resume
              </button>
            )}
          </div>
        </div>,
      );
    }
  }

  return (
    <div className="page-wide">
      {user && (
        <div className="for-you">
          <h2>Picked for you</h2>
          {tasteError && <p className="error">{tasteError}</p>}
          {notice && <p className="small">{notice}</p>}
          {!suggestions && !tasteError && <p>Loading...</p>}
          {suggestions && suggestions.basedOn.length > 0 && (
            <p className="small">
              Because you enjoy {joinNames(suggestions.basedOn)}
              {suggestions.avoiding.length > 0 &&
                ". Taking a break from " + joinNames(suggestions.avoiding) + " for now"}
              .
            </p>
          )}
          {suggestions && suggestions.message && <p className="small">{suggestions.message}</p>}
          <div className="movie-grid">{suggestionCards}</div>

          {taste && taste.genres.length > 0 && (
            <div className="taste narrow">
              <h3>Your taste</h3>
              <p className="small">
                Worked out from your {taste.reviewCount}{" "}
                {taste.reviewCount === 1 ? "review" : "reviews"}: the stars you gave and how
                your words sound. If you keep disliking a genre, we pause it for 30 days and
                hide its movies in your <Link to="/watchlist">watchlist</Link>.
              </p>
              {tasteRows}
            </div>
          )}
        </div>
      )}

      <h2>What are you in the mood for?</h2>
      <div className="genre-bar">{moodButtons}</div>
      {error && <p className="error">{error}</p>}
      {loading && <p>Loading...</p>}
      {!mood && !loading && !error && (
        <p>Pick a mood above and we will find something.</p>
      )}
      {mood && !loading && !error && <h3>{label}</h3>}

      <div className="movie-grid">{cards}</div>
    </div>
  );
}

export default Recommendations;
