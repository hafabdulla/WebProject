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
      const cards = [];

  for (let i = 0; i < movies.length; i++) {
    cards.push(
      <div key={movies[i].id}>
        <MovieCard movie={movies[i]} />
        <p className="small">{movies[i].watchStatus}</p>
      </div>
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
    </div>
  );
}

export default Watchlist;   
