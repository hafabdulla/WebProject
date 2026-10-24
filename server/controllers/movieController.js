const TMDB_BASE ="https://api.themoviedb.org/3";

const tmdbGet = async(path, params) => {
    const query = new URLSearchParams(params);
    query.set("api_key", process.env.TMDB_API_KEY);
    const response = await fetch(TMDB_BASE + path + "?" + query.toString());
    if(!response.ok){
        const error = new Error("TMDB request failed");
        error.status = response.status;
        throw error;
    }
    return response.json();
}

const sendError = (res, err) => {
    if(err.status === 404){
        return res.status(404).json({message: "Movie Not Found"});
    }
    res.status(500).json({message:err.message});
}
const getPopular = async(req, res) =>{
    try{
        const page = req.query.page || 1;
        const data = await tmdbGet("/movie/popular", {page: page})
        res.status(200).json(data);
    }
    catch(err){
        sendError(res,err);
    }
}

const searchMovies = async(req, res) => {
    try{
        const text = req.query.query;
        if(!text){
            return res.status(400).json({message: "Search query is required"});
        }

        const page = req.query.page || 1;
        const data = await tmdbGet("/search/movie", {query: text, page:page})
        res.status(200).json(data);
    }catch(err){
        sendError(res, err);
    }
}

const getGenres = async(req, res)=> {
    try{
        const data = await tmdbGet("/genre/movie/list", {});
        res.status(200).json(data);
    }
    catch(err){
        sendError(res,err);
    }
};

const discoverMovies = async(req, res) => {
    try{
        const params = {page: req.query.page || 1, sort_by: "popularity.desc"}
        if(req.query.genre){
            params.with_genres = req.query.genre;
        }
        const data  = await tmdbGet("/discover/movie", params);
        res.status(200).json(data);
    }
    catch(err){
        sendError(res,err);
    }
}

const getMovieDetails = async (req, res) => {
    try{
        const id = Number(req.params.id);
        if(isNaN(id)){
            return res.status(400).json({message: "Invalid movie ID"});
        }
        const data = await tmdbGet("/movie/" + id, {
            append_to_response: "credits,videos",
        });
        res.status(200).json(data);
    }
    catch(err){
        sendError(res,err);
    }
}

module.exports = {
    getPopular, 
    searchMovies, 
    getGenres,
    discoverMovies,
    getMovieDetails
}