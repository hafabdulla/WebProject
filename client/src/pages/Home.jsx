import { useState, useEffect } from "react";
import MovieCard from "../components/MovieCard";
function Home() {
  const [movies, setMovies] = useState([]);
  const [searchInput, setSearchInput] = useState("");
  const [searchText, setSearchText] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadMovies() {
      setLoading(true);
      setError("");

      let url = "/api/movies/popular?page=" + page;

      if (searchText) {
        url =
          "api/movies/search?query=" +
          encodedURIComponent(searchText) +
          "&page" +
          page;
      }
      try {
        const res = await fetch(url);
        const data = await res.json();

        if (!res.ok) {
          setError(data.message);
          setLoading(false);
          return;
        }

        if(page === 1){
          setMovies(function (oldMovies){
            return oldMovies.concat(data.results);
          })
        }
        setTotalPages(data.total_pages);
      } catch (err) {
        setError("Could not reach the server");
      }
      setLoading(false);
    }
    loadMovies();
  }, [searchText, page]);

  function handleSearch(event){
    event.preventDefault();
    setPage(1);
    setSearchText(searchInput.trim());
  }

  const cards = [];

  for(let i = 0; i < movies.length;i++){
    cards.push(<MovieCard key={movies[i].id + "-" + i} movie = {movie[i]}/>)
  }

  let heading = "Popular right now";

  if(searchText){
    heading = "Result for " + searchText;
  }

    return (
    <div className="page-wide">
      <form className="search-bar" onSubmit={handleSearch}>
        <input
          type="text"
          placeholder="Search movies"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
        <button type="submit">Search</button>
      </form>

      <h2>{heading}</h2>
      {error && <p className="error">{error}</p>}
      {!loading && !error && movies.length === 0 && <p>No movies found.</p>}

      <div className="movie-grid">{cards}</div>

      {loading && <p>Loading...</p>}
      {!loading && page < totalPages && (
        <button className="load-more" onClick={() => setPage(page + 1)}>
          Load more
        </button>
      )}
    </div>
  );
}

export default Home;
