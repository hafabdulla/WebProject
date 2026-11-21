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
  };
};

module.exports = { getMovieBasics };
