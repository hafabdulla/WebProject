import { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import FriendButton from "../components/FriendButton";

// The public page of any user: name, join date, friend button and their reviews
function UserPage() {
  const { id } = useParams();
  const me = useSelector((state) => state.auth.user);

  const [person, setPerson] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function loadPerson() {
    try {
      const res = await fetch("/api/users/" + id);
      const data = await res.json();
      if (!res.ok) {
        setError(data.message);
        return false;
      }
      setPerson(data);
      return true;
    } catch (err) {
      setError("Could not reach the server");
      return false;
    }
  }

  useEffect(() => {
    async function loadPage() {
      setLoading(true);
      setError("");
      setPerson(null);
      setReviews([]);

      const found = await loadPerson();
      if (!found) {
        setLoading(false);
        return;
      }

      try {
        const res = await fetch("/api/reviews/user/" + id);
        const data = await res.json();
        if (res.ok) {
          // a review only saves the movie id, so we ask for each movie's title
          const loaded = [];
          for (let i = 0; i < data.reviews.length; i++) {
            let title = "Movie " + data.reviews[i].movieId;
            const movieRes = await fetch("/api/movies/" + data.reviews[i].movieId);
            if (movieRes.ok) {
              const movie = await movieRes.json();
              title = movie.title;
            }
            loaded.push({ review: data.reviews[i], title: title });
          }
          setReviews(loaded);
        }
      } catch (err) {
        setError("Could not reach the server");
      }
      setLoading(false);
    }
    loadPage();
  }, [id]);

  if (error) {
    return <p className="page error">{error}</p>;
  }
  if (!person) {
    return <p className="page">Loading...</p>;
  }

  const isMe = me && me.id === person._id;

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
    <div className="page-wide narrow">
      <h2>{person.name}</h2>
      <div className="profile-info">
        <p className="small">
          Member since {new Date(person.createdAt).toLocaleDateString()} | {person.friendCount}{" "}
          {person.friendCount === 1 ? "friend" : "friends"}
        </p>
        {isMe ? (
          <p className="small">
            This is you. <Link to="/profile">Go to my profile</Link>
          </p>
        ) : (
          <FriendButton userId={person._id} onChange={loadPerson} />
        )}
      </div>

      <h3>Reviews ({reviews.length})</h3>
      {loading && <p>Loading...</p>}
      {!loading && reviews.length === 0 && (
        <p className="small">{person.name} has not written any reviews yet.</p>
      )}
      {reviewItems}
    </div>
  );
}

export default UserPage;
