import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";

function Reviews({ movieId }) {
  const user = useSelector((state) => state.auth.user);
  const token = useSelector((state) => state.auth.token);

  const [reviews, setReviews] = useState([]);
  const [average, setAverage] = useState(0);
  const [rating, setRating] = useState("5");
  const [text, setText] = useState("");
  const [editingId, setEditingId] = useState("");
  const [error, setError] = useState("");

  // the header that proves who we are (the server's protect middleware reads it)
  const headers = {
    "Content-Type": "application/json",
    Authorization: "Bearer " + token,
  };

  // get all reviews of this movie from the server
  async function loadReviews() {
    try {
      const res = await fetch("/api/reviews/movie/" + movieId);
      const data = await res.json();

      if (!res.ok) {
        setError(data.message);
        return;
      }

      setReviews(data.reviews);
      setAverage(data.average);
    } catch (err) {
      setError("Could not reach the server");
    }
  }

  // load the reviews when the page opens, and again if the movie changes
  useEffect(() => {
    loadReviews();
  }, [movieId]);

  // one form is used for both writing a new review and editing your own
  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    let url = "/api/reviews";
    let method = "POST";
    if (editingId) {
      url = "/api/reviews/" + editingId;
      method = "PUT";
    }

    try {
      const res = await fetch(url, {
        method: method,
        headers: headers,
        body: JSON.stringify({ movieId: movieId, rating: Number(rating), text: text }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.message);
        return;
      }

      // clear the form and load the list again
      setRating("5");
      setText("");
      setEditingId("");
      loadReviews();
    } catch (err) {
      setError("Could not reach the server");
    }
  }

  async function handleDelete(reviewId) {
    setError("");

    try {
      const res = await fetch("/api/reviews/" + reviewId, {
        method: "DELETE",
        headers: headers,
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.message);
        return;
      }

      loadReviews();
    } catch (err) {
      setError("Could not reach the server");
    }
  }

  async function handleLike(reviewId) {
    setError("");

    try {
      const res = await fetch("/api/reviews/" + reviewId + "/like", {
        method: "POST",
        headers: headers,
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.message);
        return;
      }

      loadReviews();
    } catch (err) {
      setError("Could not reach the server");
    }
  }

  // put the review's values into the form so the user can change them
  function startEdit(review) {
    setError("");
    setEditingId(review._id);
    setRating(String(review.rating));
    setText(review.text);
  }

  function cancelEdit() {
    setEditingId("");
    setRating("5");
    setText("");
  }

  // did the logged in user already like this review?
  function hasLiked(review) {
    if (!user) {
      return false;
    }
    for (let i = 0; i < review.likes.length; i++) {
      if (review.likes[i] === user.id) {
        return true;
      }
    }
    return false;
  }

  // find the review written by the logged in user (if there is one)
  let myReview = null;
  if (user) {
    for (let i = 0; i < reviews.length; i++) {
      if (reviews[i].user && reviews[i].user._id === user.id) {
        myReview = reviews[i];
      }
    }
  }

  // build one block of JSX for each review
  const reviewItems = [];
  for (let i = 0; i < reviews.length; i++) {
    const review = reviews[i];

    let author = "Deleted user";
    if (review.user) {
      author = review.user.name;
    }

    const isOwner = user && review.user && review.user._id === user.id;
    const isAdmin = user && user.role === "admin";

    let likeLabel = "Like";
    if (hasLiked(review)) {
      likeLabel = "Unlike";
    }

    reviewItems.push(
      <div className="review" key={review._id}>
        <p>
          <strong>{author}</strong> rated it {review.rating}/5
        </p>
        {review.text && <p>{review.text}</p>}
        <div className="review-actions">
          {user && (
            <button className="small-button" onClick={() => handleLike(review._id)}>
              {likeLabel}
            </button>
          )}
          <span className="small">{review.likes.length} likes</span>
          {isOwner && (
            <button className="small-button" onClick={() => startEdit(review)}>
              Edit
            </button>
          )}
          {(isOwner || isAdmin) && (
            <button className="small-button" onClick={() => handleDelete(review._id)}>
              Delete
            </button>
          )}
        </div>
      </div>
    );
  }

  // decide what to show above the list: a login message, a note, or the form
  let formArea;
  if (!user) {
    formArea = (
      <p className="small">
        <Link to="/login">Login</Link> to write a review.
      </p>
    );
  } else if (myReview && !editingId) {
    formArea = <p className="small">You already reviewed this movie.</p>;
  } else {
    let buttonText = "Post review";
    if (editingId) {
      buttonText = "Save changes";
    }

    formArea = (
      <form className="review-form" onSubmit={handleSubmit}>
        <select value={rating} onChange={(e) => setRating(e.target.value)}>
          <option value="5">5 - Excellent</option>
          <option value="4">4 - Good</option>
          <option value="3">3 - Okay</option>
          <option value="2">2 - Bad</option>
          <option value="1">1 - Terrible</option>
        </select>
        <textarea
          rows="3"
          placeholder="Write your review (optional)"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button type="submit">{buttonText}</button>
        {editingId && (
          <button type="button" onClick={cancelEdit}>
            Cancel
          </button>
        )}
      </form>
    );
  }

  return (
    <div className="reviews">
      <h3>Reviews</h3>
      <p className="small">
        Average rating: {average} ({reviews.length} reviews)
      </p>

      {formArea}
      {error && <p className="error">{error}</p>}
      {reviews.length === 0 && <p className="small">No reviews yet.</p>}
      {reviewItems}
    </div>
  );
}

export default Reviews;