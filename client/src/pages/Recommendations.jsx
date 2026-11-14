import { useState, useEffect } from "react";
import MovieCard from "../components/MovieCard";

function Recommendations() {
  const [moods, setMoods] = useState([]);
  const [mood, setMood] = useState("");
  const [movies, setMovies] = useState([]);
  const [label, setLabel] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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

  return (
    <div className="page-wide">
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
