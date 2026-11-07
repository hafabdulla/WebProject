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
  const [category, setCategory] = useState("popular"); // new: popular, trending, top-rated or upcoming
  const [genres, setGenres] = useState([]); // new: the list for the genre dropdown
  const [genre, setGenre] = useState(""); // new: chosen genre id ("" = all)
  const [yearInput, setYearInput] = useState(""); // new: what is typed in the year box
  const [year, setYear] = useState(""); // new: the year that is being used

  // new: load the genre list once, when the page opens
  useEffect(() => {
    async function loadGenres() {
      try {
        const res = await fetch("/api/movies/genres");
        const data = await res.json();

        if (res.ok) {
          setGenres(data.genres);
        }
      } catch (err) {
        // if this fails the dropdown just stays empty
      }
    }
    loadGenres();
  }, []);

  useEffect(() => {
    async function loadMovies() {
      setLoading(true);
      setError("");

      let url = "/api/movies/" + category + "?page=" + page; // changed: category instead of popular

      // new: a genre or year uses the discover route
      if (genre || year) {
        url = "/api/movies/discover?page=" + page;
        if (genre) {
          url = url + "&genre=" + genre;
        }
        if (year) {
          url = url + "&year=" + year;
        }
      }

      if (searchText) {
        url =
          "/api/movies/search?query=" +
          encodeURIComponent(searchText) +
          "&page=" +
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
          setMovies(data.results);
        }
        else{
          setMovies(function (oldmovies){
            return oldmovies.concat(data.results);
          })
        }
        setTotalPages(data.total_pages);
      } catch (err) {
        setError("Could not reach the server");
      }
      setLoading(false);
    }
    loadMovies();
  }, [searchText, page, category, genre, year]); // changed: also reload when these change

  function handleSearch(event){
    event.preventDefault();
    setPage(1);
    setGenre(""); // new
    setYear(""); // new
    setYearInput(""); // new
    setSearchText(searchInput.trim());
  }

  // new: clicking a tab shows that list and clears the search and the filters
  function chooseCategory(name) {
    setCategory(name);
    setGenre("");
    setYear("");
    setYearInput("");
    setSearchText("");
    setSearchInput("");
    setPage(1);
  }

  // new: picking a genre clears the search
  function handleGenreChange(event) {
    setGenre(event.target.value);
    setSearchText("");
    setSearchInput("");
    setPage(1);
  }

  // new: the year box. An empty box removes the year filter
  function handleYearSubmit(event) {
    event.preventDefault();
    const typed = yearInput.trim();

    if (typed !== "" && (typed.length !== 4 || isNaN(Number(typed)))) {
      setError("Enter a 4 digit year, for example 1999");
      return;
    }

    setYear(typed);
    setSearchText("");
    setSearchInput("");
    setPage(1);
  }

  const cards = [];

  for(let i = 0; i < movies.length;i++){
    cards.push(<MovieCard key={movies[i].id + "-" + i} movie = {movies[i]}/>)
  }

  // new: the options of the genre dropdown
  const genreOptions = [];
  for (let i = 0; i < genres.length; i++) {
    genreOptions.push(
      <option key={genres[i].id} value={genres[i].id}>
        {genres[i].name}
      </option>
    );
  }

  let heading = "Popular right now";

  // new: the heading for the other tabs and for the filters
  if (category === "trending") {
    heading = "Trending this week";
  }
  if (category === "top-rated") {
    heading = "Top rated";
  }
  if (category === "upcoming") {
    heading = "Upcoming";
  }
  if (genre || year) {
    heading = "Filtered movies";
  }

  if(searchText){
    heading = "Result for " + searchText;
  }

  // new: the tab for the current list is highlighted (none while searching or filtering)
  let activeTab = category;
  if (genre || year || searchText) {
    activeTab = "";
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

      <div className="category-tabs">
        <button
          className={activeTab === "popular" ? "active" : ""}
          onClick={() => chooseCategory("popular")}
        >
          Popular
        </button>
        <button
          className={activeTab === "trending" ? "active" : ""}
          onClick={() => chooseCategory("trending")}
        >
          Trending
        </button>
        <button
          className={activeTab === "top-rated" ? "active" : ""}
          onClick={() => chooseCategory("top-rated")}
        >
          Top rated
        </button>
        <button
          className={activeTab === "upcoming" ? "active" : ""}
          onClick={() => chooseCategory("upcoming")}
        >
          Upcoming
        </button>
      </div>

      <div className="filters">
        <select value={genre} onChange={handleGenreChange}>
          <option value="">All genres</option>
          {genreOptions}
        </select>
        <form className="year-form" onSubmit={handleYearSubmit}>
          <input
            type="text"
            placeholder="Year, e.g. 1999"
            value={yearInput}
            onChange={(e) => setYearInput(e.target.value)}
          />
          <button type="submit">Apply year</button>
        </form>
      </div>

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