const TMDB_BASE = "https://api.themoviedb.org/3";

// Gets the basic details of one movie from TMDB.
// Returns null if TMDB does not know the movie.
const getMovieBasics = async (movieId) => {
  const response = await fetch(
    TMDB_BASE + "/movie/" + movieId + "?api_key=" + process.env.TMDB_API_KEY
  );
  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    throw new Error("TMDB request failed");
  }
  const movie = await response.json();
  return {
    movieId: movie.id,
    title: movie.title || "",
    posterPath: movie.poster_path || "",
    releaseDate: movie.release_date || "",
    voteAverage: movie.vote_average || 0,
    genreIds: (movie.genres || []).map((genre) => genre.id),
  };
};

// TMDB's genre names (28 => "Action", 35 => "Comedy"...). They never change,
// so we ask TMDB once and keep the answer while the server runs.
let genreNames = null;

const getGenreNames = async () => {
  if (genreNames) {
    return genreNames;
  }
  const response = await fetch(
    TMDB_BASE + "/genre/movie/list?api_key=" + process.env.TMDB_API_KEY
  );
  if (!response.ok) {
    throw new Error("TMDB request failed");
  }
  const data = await response.json();
  const names = {};
  for (let i = 0; i < data.genres.length; i++) {
    names[data.genres[i].id] = data.genres[i].name;
  }
  genreNames = names;
  return genreNames;
};

// one page of TMDB's movie search by filters (genres, rating...)
const discover = async (params) => {
  const query = new URLSearchParams(params);
  query.set("api_key", process.env.TMDB_API_KEY);
  const response = await fetch(TMDB_BASE + "/discover/movie?" + query.toString());
  if (!response.ok) {
    throw new Error("TMDB request failed");
  }
  return response.json();
};

module.exports = { getMovieBasics, getGenreNames, discover };
