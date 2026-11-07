import { Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import MovieDetails from "./pages/MovieDetails"
import Watchlist from "./pages/Watchlist";
function App() {
  return (
    <div>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/movie/:id" element={<MovieDetails/>}/>
        <Route path="/watchlist" element={<Watchlist />} />
      </Routes>
    </div>
  );
}

export default App;