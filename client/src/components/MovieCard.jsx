import {Link} from "react-router-dom";
const IMAGE_BASE = "https://image.tmdb.org/t/p/w342"

function MovieCard({movie}){
    let year = "";
    if(movie.release_date){
        year = movie.release_date.slice(0, 4);
    }

    let poster = <div className="poster-missing">No poster</div>;

    if(movie.poster_path){
        poster = <img src={IMAGE_BASE + movie.poster_path} alt={movie.title} />;
    }

    return (
        <Link to={"/movie/" + movie.id} className="movie-card">
            {poster}
            <div className="movie-card-info">
                <h3>{movie.title}</h3>
                <p className="small">
                    {year} | Rating {movie.vote_average.toFixed(1)}
                </p>
            </div>
        </Link>
    )
}

export default MovieCard;