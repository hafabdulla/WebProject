import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
function AdminReviews() {
  const token = useSelector((state) => state.auth.token);
  const [reviews, setReviews] = useState([]);
  const [page, setPage]= useState(1);
  const [totalPages, setTotalPages] =useState(1);
  const [total, setTotal] = useState(0);
  const [movieInput, setMovieInput] =useState("");
  const [movieFilter, setMovieFilter] = useState("");
  const [loading, setLoading] =useState(true);
  const [error, setError] = useState("");
  useEffect(()=>{
    async function loadReviews() {
      setLoading(true);
      setError("");
      let url = "/api/reviews?page="+ page;
      if (movieFilter!== "") {
        url = url + "&movieId=" + movieFilter;
      }
      try {
        const res = await fetch(url, {headers: { Authorization: "Bearer " + token },});
        const data = await res.json();
        if (!res.ok) {
          setError(data.message);
          setReviews([]);
        } 
        else {
          setReviews(data.reviews);
          setTotalPages(data.total_pages);
          setTotal(data.total);
        }
      }catch (err) {
        setError("Could not reach the server");
      }setLoading(false);
    }
    loadReviews();
  },[token, page, movieFilter]);

  function handleFilter(e) {
    e.preventDefault();
    setPage(1);
    setMovieFilter(movieInput.trim());
  }

  function clearFilter() {
    setMovieInput("");
    setPage(1);
    setMovieFilter("");
  }

  async function deleteReview(review) {
    if (!window.confirm("Delete this review? This cannot be undone.")) return;
    setError("");
    try {
      const res = await fetch("/api/reviews/" + review._id, {method: "DELETE", headers: { Authorization: "Bearer " + token },});
      const data = await res.json();
      if (!res.ok) {
        setError(data.message);
        return;
      }
      const list = [];
      for (let i = 0; i < reviews.length; i++) {
        if (reviews[i]._id !== review._id) list.push(reviews[i]);
      }
      setReviews(list);
      setTotal(total - 1);
      //if that was the last review on this page, it takes you back one page
      if (list.length === 0 && page > 1) {
        setPage(page - 1);
      }
    } catch (err) {
      setError("Could not reach the server");
    }
  }
  function getUserName(review) {
    if (review.user) {
      return review.user.name;
    }
    return "Deleted user";
  }

  function renderText(review) {
    if (review.text === "") {
      return <span className="small">No written review</span>;
    }
    if (review.text.length > 100) {
      return review.text.slice(0, 100) + "...";
    }
    return review.text;
  }

  return (
    <div>
      <form className="admin-filter" onSubmit={handleFilter}>
        <input type="number" placeholder="TMDB movie ID" value={movieInput} onChange={(e) => setMovieInput(e.target.value)}/>
        <button type="submit" className="small-button">
          Filter
        </button>
        {movieFilter !== "" && (
          <button type="button" className="small-button secondary-button" onClick={clearFilter}>
            Show all
          </button>
        )}
      </form>

      {error && <p className="error">{error}</p>}
      {loading && <p>Loading...</p>}
      {!loading && reviews.length === 0 && (
        <p className="small">No reviews found.</p>
      )}

      {!loading && reviews.length > 0 && (
        <div>
          <p className="small">{total} reviews</p>
          <div className="table-scroll">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Movie</th>
                  <th>User</th>
                  <th>Rating</th>
                  <th>Review</th>
                  <th>Date</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {reviews.map((review) => (
                  <tr key={review._id}>
                    <td>
                      <Link to={"/movie/" + review.movieId}>
                        {review.movieId}
                      </Link>
                    </td>
                    <td>{getUserName(review)}</td>
                    <td>{review.rating} / 5</td>
                    <td>{renderText(review)}</td>
                    <td>{review.createdAt.slice(0, 10)}</td>
                    <td>
                      <button
                        className="small-button"
                        onClick={() => deleteReview(review)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="admin-actions">
            <button
              className="small-button secondary-button"
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
            >
              Previous
            </button>
            <span className="small">
              Page {page} of {totalPages}
            </span>
            <button
              className="small-button secondary-button"
              disabled={page === totalPages}
              onClick={() => setPage(page + 1)}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminReviews;
