import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import BarChart from "./BarChart";

function AdminOverview() {
    const token = useSelector((state) => state.auth.token);
    const [stats, setStats] = useState(null);
    const [topMovies, setTopMovies] = useState([]);
    const [error, setError] = useState("");

    useEffect(() => {
    async function loadStats() {
      try {
        const res = await fetch("/api/admin/stats", {
          headers: { Authorization: "Bearer " + token },
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.message);
          return;
        }
// the database only stores movie ids
    const list = [];
        for (let i = 0; i < data.topRated.length; i++) {
          const movie = data.topRated[i];
          let title = "Movie " + movie.movieId;
          const movieRes = await fetch("/api/movies/" + movie.movieId);
          if (movieRes.ok) {
            const details = await movieRes.json();
            title = details.title;
          }
          list.push({movieId: movie.movieId, title: title, average: movie.average, count: movie.count,});
        }
        setTopMovies(list);
        setStats(data);
      } catch (err) {
        setError("Could not reach the server");
      }
    }
    loadStats();
  }, [token]);

  if (error) {
    return <p className="error">{error}</p>;
  }
  if (!stats) {
    return <p>Loading...</p>;
  }

  return (
    <div>
      <div className="admin-totals">
        <div className="admin-card">
          <strong>{stats.totals.users}</strong>
          <span>Users</span>
        </div>
        <div className="admin-card">
          <strong>{stats.totals.reviews}</strong>
          <span>Reviews</span>
        </div>
        <div className="admin-card">
          <strong>{stats.totals.threads}</strong>
          <span>Forum threads</span>
        </div>
        <div className="admin-card">
          <strong>{stats.totals.openReports}</strong>
          <span>Open reports</span>
        </div>
      </div>

      <h2>Sign ups, last 14 days</h2>
      <BarChart days={stats.signups} />
      <h2>Reviews, last 14 days</h2>
      <BarChart days={stats.reviewActivity} />
      <h2>Top rated movies</h2>
      {topMovies.length === 0 && <p className="small">No movie has 2 or more reviews yet.</p>}
      <ol>
        {topMovies.map((movie) => (
          <li key={movie.movieId}>
            <Link to={"/movie/" + movie.movieId}>{movie.title}</Link> {" "}{movie.average} / 5 from {movie.count} reviews
          </li>
        ))}
      </ol>
    </div>
  );
}

export default AdminOverview;