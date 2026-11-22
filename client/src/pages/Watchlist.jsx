import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux"
import MovieCard  from "../components/MovieCard";

function Watchlist(){
    const user = useSelector((state)=> state.auth.user)
    const token = useSelector((state)=>state.auth.token);

    const [movies, setMovies] = useState([])
    const [filter, setFilter] = useState("");
    const [loading, setLoading]= useState(false);
    const [error, setError] = useState("");
    // genres the user kept disliking lately (from /api/taste)
    const [pausedGenres, setPausedGenres] = useState([]);

    async function loadPaused(){
        try{
            const res = await fetch("/api/taste", {
                headers:{ Authorization:"Bearer " + token},
            });
            if(!res.ok){
                return;
            }
            const data = await res.json();
            const paused = [];
            for(let i = 0; i < data.genres.length; i++){
                if(data.genres[i].status === "paused"){
                    paused.push(data.genres[i]);
                }
            }
            setPausedGenres(paused);
        }catch(err){
            // nothing is paused then, the watchlist still works
        }
    }

    useEffect(() => {
        if(token){
            loadPaused();
        }
    }, [token]);

    async function resume(genreId){
        try{
            const res = await fetch("/api/taste/resume/" + genreId, {
                method: "POST",
                headers:{ Authorization:"Bearer " + token},
            });
            if(res.ok){
                loadPaused();
            }
        }catch(err){
            setError("could not reach the server");
        }
    }

    useEffect(() =>{
        if(!token){
            return;
        }
        async function loadWatchList(){
            setLoading(true);
            setError("");
            let url = "/api/watchlist"
            if(filter){
                url = "/api/watchlist?status=" + filter;
            }
            try{
                const res = await fetch(url, {
                    headers:{ Authorization:"Bearer " + token},
                })
                const items = await res.json();
                if(!res.ok){
                    setError(items.message);
                    setLoading(false);
                    return;
                }
                const loaded= [];
                for(let i = 0; i < items.length; i++){
                    const movieRes =await fetch("/api/movies/" + items[i].movieId);
                    if(movieRes.ok){
                        const movie = await movieRes.json();
                        movie.watchStatus = items[i].status;
                        loaded.push(movie);
                    }
                }
                setMovies(loaded);
            }catch(err){
                setError("could not reach the server");
            }
            setLoading(false);
        }
        loadWatchList();
    }, [token, filter] );

    if(!user){
        return(
            <p className="page">
                <Link to="/login">Login</Link> to see your watchlist.
            </p>
        )
    }
  // the paused genre a movie belongs to, or null
  function pausedGenreOf(movie) {
    if (!movie.genres) {
      return null;
    }
    for (let i = 0; i < pausedGenres.length; i++) {
      for (let k = 0; k < movie.genres.length; k++) {
        if (movie.genres[k].id === pausedGenres[i].id) {
          return pausedGenres[i];
        }
      }
    }
    return null;
  }

  const cards = [];
  const pausedCards = [];

  for (let i = 0; i < movies.length; i++) {
    const pausedGenre = pausedGenreOf(movies[i]);
    if (pausedGenre) {
      pausedCards.push(
        <div key={movies[i].id} className="paused-card">
          <MovieCard movie={movies[i]} />
          <p className="small">{pausedGenre.name} is paused</p>
        </div>
      );
    } else {
      cards.push(
        <div key={movies[i].id}>
          <MovieCard movie={movies[i]} />
          <p className="small">{movies[i].watchStatus}</p>
        </div>
      );
    }
  }

  // which paused genres actually have movies here
  const pausedHere = [];
  for (let i = 0; i < pausedGenres.length; i++) {
    for (let k = 0; k < movies.length; k++) {
      if (pausedGenreOf(movies[k]) === pausedGenres[i]) {
        pausedHere.push(pausedGenres[i]);
        break;
      }
    }
  }
  const resumeButtons = [];
  for (let i = 0; i < pausedHere.length; i++) {
    const until = new Date(pausedHere[i].pausedUntil).toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
    });
    resumeButtons.push(
      <span key={pausedHere[i].id} className="paused-genre">
        {pausedHere[i].name} until {until}
        <button className="small-button secondary-button" onClick={() => resume(pausedHere[i].id)}>
          Resume now
        </button>
      </span>
    );
  }

  const filters = [
    { value: "", label: "All" },
    { value: "want", label: "Want to watch" },
    { value: "watched", label: "Watched" },
  ];

  const filterButtons = [];

  for (let i = 0; i < filters.length;i++) {
    let buttonClass = "";
    if (filter === filters[i].value) {
      buttonClass = "active";
    }

    filterButtons.push(
      <button key={filters[i].value} className={buttonClass} onClick={() => setFilter(filters[i].value)}>
        {filters[i].label}
      </button>
    );
  }

  return (
    <div className="page-wide">
      <h2>My watchlist</h2>

      <div className="genre-bar">{filterButtons}</div>

      {error && <p className="error">{error}</p>}
      {loading && <p>Loading...</p>}
      {!loading && !error && movies.length === 0 && (
        <p>Nothing here yet. Add movies from a movie page.</p>
      )}

      <div className="movie-grid">{cards}</div>

      {pausedCards.length > 0 && (
        <div className="paused-section">
          <h3>Paused for now</h3>
          <p className="small">
            Your recent reviews of these genres were negative, so we moved their movies here
            for a while. See what we <Link to="/recommendations">picked for you</Link> instead.
          </p>
          <div className="paused-genres">{resumeButtons}</div>
          <div className="movie-grid">{pausedCards}</div>
        </div>
      )}
    </div>
  );
}

export default Watchlist;   
