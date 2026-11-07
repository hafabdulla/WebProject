import {useState, useEffect} from "react"
import {useParams} from "react-router-dom";
import Reviews from "../components/Reviews";
import WatchlistButtons from "../components/WatchlistButtons";

const IMAGE_BASE = "https://image.tmdb.org/t/p/w342"

function MovieDetails(){
    const {id } = useParams();
    const [movie, setMovie] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("")

    useEffect(()=>{
        async function loadMovie() {
            setLoading(true);
            setError("");

            try{
                const res = await fetch("/api/movies/" + id);
                const data = await res.json();

                if(!res.ok){
                    setError(data.message);
                    setLoading(false);
                    return
                }
                setMovie(data);
            }
            catch(error){
                setError("Could not reach the server");
            }
            setLoading(false);
        }
        loadMovie();
    }, [id]);

    if(loading){
        return <p className="page">Loading ...</p>
    }
    if(error){
        return <p className="page error">{error} </p>
    }
    if(!movie){
        return null;
    }
    let year = "";
    if(movie.release_date){
        year = movie.release_date.slice(0,4);
    }

    const genreNames = []
    if (movie.genres){
        for (let i = 0; i < movie.genres.length;i++){
            genreNames.push(movie.genres[i].name);
        }
    }
    const castItems = [];
    if(movie.credits && movie.credits.cast){
        let shown = movie.credits.cast.length;
        if(shown>8){
            shown = 8;
        }
        for(let i = 0; i < shown; i++){
            const person = movie.credits.cast[i];
            castItems.push(
                <li key= {person.id}>
                    {person.name} as {person.character}
                </li>
            )
        }
    }
    let poster = <div className="poster-missing">No Poster</div>;
if(movie.poster_path){
    poster = <img src={IMAGE_BASE + movie.poster_path} alt = {movie.title}/>;
}
return (
    <div className="page">
        <div className="details-top">
            {poster}
            <div className="details-info">
                <h2>{movie.title}

                </h2>
                <p className="small">
                    {year} | Rating {movie.vote_average.toFixed(1)} | {movie.runtime} min
                </p>
                <p className="small">{genreNames.join(",")}</p>
                <p>{movie.overview}</p>
            </div>
        </div>
        <WatchlistButtons movieId={movie.id} />
        {castItems.length >0 &&(
            <div>
                <h3>
                    Cast
                </h3>
                <ul>
                    {castItems}
                </ul>
            </div>
        )}
        <Reviews movieId={movie.id} />
    </div>
)
}
export default MovieDetails
