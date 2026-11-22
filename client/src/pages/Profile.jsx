import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import {updateUser} from "../store/authSlice"
function Profile() {
  const user = useSelector((state) => state.auth.user);
  const token = useSelector((state) => state.auth.token);

  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const dispatch = useDispatch();
  const [name, setName] = useState(user.name);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [formMessage, setFormMessage] = useState("");
  async function handleSave(e){
    e.preventDefault();
    setFormError("");
    setFormMessage("");
    const body = {};
    let changed = false;
    if(name.trim()!== user.name){
      body.name = name;
      changed = true;
    }
    if (newPassword) {
      body.currentPassword = currentPassword;
      body.newPassword = newPassword;
      changed = true;
    }
    if (!changed) {
      setFormError("Nothing to change");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/auth/me", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token,
        },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.message);
        setSaving(false);
        return;
      }
      dispatch(updateUser(data));
      localStorage.setItem("user", JSON.stringify(data));
      setCurrentPassword("");
      setNewPassword("");
      setFormMessage("Saved");
    } catch (err) {
      setFormError("Could not reach the server");
    }
    setSaving(false);
  }
  useEffect(() => {
    async function loadReviews() {
      setLoading(true);
      setError("");

      try {
        const res = await fetch("/api/reviews/mine", {
          headers: { Authorization: "Bearer " + token },
        });
        const data = await res.json();

        if (!res.ok) {
          setError(data.message);
          setLoading(false);
          return;
        }

        // a review only saves the movie id, so we ask for each movie's title
        const loaded = [];
        for (let i = 0; i < data.length; i++) {
          let title = "Movie " + data[i].movieId;
          const movieRes = await fetch("/api/movies/" + data[i].movieId);
          if (movieRes.ok) {
            const movie = await movieRes.json();
            title = movie.title;
          }
          loaded.push({ review: data[i], title: title });
        }
        setReviews(loaded);
      } catch (err) {
        setError("Could not reach the server");
      }
      setLoading(false);
    }
    loadReviews();
  }, [token]);

  const reviewItems = [];
  for (let i = 0; i < reviews.length; i++) {
    const review = reviews[i].review;
    reviewItems.push(
      <div className="review" key={review._id}>
        <p>
          <Link to={"/movie/" + review.movieId}>{reviews[i].title}</Link> - rated {review.rating}/5
        </p>
        {review.text && <p>{review.text}</p>}
        <p className="small">{review.likes.length} likes</p>
      </div>
    );
  }

  return (
    <div className="page">
      <h2>My profile</h2>
      <div className="profile-info">
        <p>
          <strong>Name:</strong> {user.name}
        </p>
        <p>
          <strong>Email:</strong> {user.email}
        </p>
        <p>
          <strong>Role:</strong> {user.role}
        </p>
        <p>
          <Link to="/watchlist">Go to my watchlist</Link>
        </p>
      </div>
      <h3>Account settings</h3>
      <form onSubmit={handleSave}>
        <label>
          Name
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label>
          Current password
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
        </label>
        <label>
          New password
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
        </label>
        <p className="small">Leave the password fields empty to only change your name.</p>
        <button type="submit" disabled={saving}>
          {saving ? "Saving..." : "Save changes"}
        </button>
        {formError && <p className="error">{formError}</p>}
        {formMessage && <p className="small">{formMessage}</p>}
      </form>
      <h3>My reviews ({reviews.length})</h3>
      {error && <p className="error">{error}</p>}
      {loading && <p>Loading...</p>}
      {!loading && !error && reviews.length === 0 && (
        <p className="small">You have not written any reviews yet.</p>
      )}
      {reviewItems}
    </div>
  );
}

export default Profile;