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
  const [genres, setGenres] = useState([]);
  const [genreId, setGenreId] = useState("")
  const [category, setCategory] = useState("popular");
  const [yearInput, setYearInput] = useState(""); // what is typed in the year box
  const [year, setYear] = useState(""); // the year that is being used

  useEffect(() => {
    async function loadMovies() {
      setLoading(true);
      setError("");

      let url = "/api/movies/category/" + category + "?page=" + page;

      if (searchText) {
        url = "/api/movies/search?query=" +      encodeURIComponent(searchText) + "&page=" + page;
      }
      else if (genreId || year){
        // a genre or a year uses the discover route
        url = "/api/movies/discover?page=" + page
        if (genreId) {
          url = url + "&genre=" + genreId;
        }
        if (year) {
          url = url + "&year=" + year;
        }
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
        if(page === 1){
          setMovies([]);
        }
      }
      setLoading(false);
    }
    loadMovies();
  }, [searchText, page, genreId, category, year]);


  useEffect(()=>{
    async function  loadGenres(){
      try{
        const res = await fetch("/api/movies/genres")
        const data = await res.json()
        if(!res.ok){
          return
        }
        setGenres(data.genres);
      }
      catch(err){
        //if this fails the genre bat just stays empty.
      }
    }
    loadGenres();
  }, []);
  function handleGenreClick(id){
    setPage(1)
    setSearchInput("");
    setSearchText("");
    if(genreId === id){
      setGenreId("");
    }else{
      setGenreId(id);
    }
  }
  function handleCategoryClick(name){
    setPage(1);
    setSearchInput("");
    setSearchText("");
    setGenreId("");
    setYear("");
    setYearInput("");
    setCategory(name);
  }
  function handleSearch(event){
    event.preventDefault();
    setPage(1);
    setGenreId("");
    setYear("");
    setYearInput("");
    setSearchText(searchInput.trim());
  }

  // the year box. An empty box removes the year filter
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

  const categories = [
    {value: "popular", label: "Popular"},
    {value: "trending", label: "Trending"},
    {value: "top_rated", label: "Top Rated"},
    {value: "upcoming", label: "Upcoming"},
  ]

  const categoryButtons = [];
  for(let i = 0; i < categories.length;i++){
    let buttonClass = "";
    if(category === categories[i].value && !searchText && !genreId && !year){
      buttonClass = "active";
    }
    categoryButtons.push(
      <button key={categories[i].value} className={buttonClass} onClick={()=>{handleCategoryClick(categories[i].value)}}>
        {categories[i].label}
      </button>
    )
  }

  const genreButtons = [];
  for(let i = 0; i < genres.length; i++){
    const genre = genres[i];
    let buttonClass = "";
    if(genreId === genre.id){
      buttonClass = "active";
    }
    genreButtons.push(
      <button key={genre.id} className = {buttonClass} onClick={() => handleGenreClick(genre.id)}>
        {genre.name}
      </button>
    )
  }

  let heading = "";
  for(let i = 0; i < categories.length;i++){
    if(categories[i].value === category){
      heading = categories[i].label;
    }
  }
  if(searchText){
    heading = "Result for " + searchText;
  }else if(genreId){
    for(let i = 0; i < genres.length; i++){
      if(genres[i].id === genreId){
        heading = genres[i].name + " movies";
      }
    }
    if (year) {
      heading = heading + " from " + year;
    }
  }else if(year){
    heading = "Movies from " + year;
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
      <div className="genre-bar">{categoryButtons}</div>
      <div className="genre-bar">{genreButtons}</div>
      <div className="filters">
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
