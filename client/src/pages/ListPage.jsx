import { useState, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import MovieCard from "../components/MovieCard";
import useSocketEvent from "../useSocketEvent";

// One list: its movies, a search to add more, and the people it is shared with
function ListPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const me = useSelector((state) => state.auth.user);
  const token = useSelector((state) => state.auth.token);

  const [list, setList] = useState(null);
  const [role, setRole] = useState("");
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [notice, setNotice] = useState("");

  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");

  const [searchInput, setSearchInput] = useState("");
  const [results, setResults] = useState([]);
  const [searchMessage, setSearchMessage] = useState("");

  const [friends, setFriends] = useState([]);
  const [inviteId, setInviteId] = useState("");

  const headers = { "Content-Type": "application/json", Authorization: "Bearer " + token };

  async function loadList() {
    try {
      const res = await fetch("/api/lists/" + id, { headers: headers });
      const data = await res.json();
      if (!res.ok) {
        setList(null);
        setError(data.message);
        return;
      }
      setError("");
      setList(data.list);
      setRole(data.role);
    } catch (err) {
      setError("Could not reach the server");
    }
  }

  useEffect(() => {
    setList(null);
    setError("");
    setNotice("");
    setResults([]);
    loadList();
  }, [id, token]);

  // the owner needs their friends list to invite people
  useEffect(() => {
    if (role !== "owner") {
      return;
    }
    async function loadFriends() {
      try {
        const res = await fetch("/api/friends", { headers: headers });
        if (res.ok) {
          setFriends(await res.json());
        }
      } catch (err) {
        // the invite box just stays empty
      }
    }
    loadFriends();
  }, [role, token]);

  // somebody (maybe a friend in another browser) changed this list
  useSocketEvent("list_updated", (data) => {
    if (data.listId === id) {
      loadList();
    }
  });

  // sends one change to the server; returns the answer, or null if it failed
  async function send(url, method, body) {
    setActionError("");
    setNotice("");
    try {
      const options = { method: method, headers: headers };
      if (body) {
        options.body = JSON.stringify(body);
      }
      const res = await fetch(url, options);
      const data = await res.json();
      if (!res.ok) {
        setActionError(data.message);
        return null;
      }
      return data;
    } catch (err) {
      setActionError("Could not reach the server");
      return null;
    }
  }

  async function saveDetails(event) {
    event.preventDefault();
    const data = await send("/api/lists/" + id, "PUT", {
      name: editName,
      description: editDescription,
    });
    if (data) {
      setEditing(false);
      loadList();
    }
  }

  async function deleteList() {
    if (!window.confirm("Delete this list for everybody?")) {
      return;
    }
    if (await send("/api/lists/" + id, "DELETE")) {
      navigate("/lists");
    }
  }

  async function leaveList() {
    if (!window.confirm("Leave this list?")) {
      return;
    }
    if (await send("/api/lists/" + id + "/members/" + me.id, "DELETE")) {
      navigate("/lists");
    }
  }

  async function answerInvite(answer) {
    const data = await send("/api/lists/" + id + "/" + answer, "POST");
    if (data) {
      if (answer === "decline") {
        navigate("/lists");
      } else {
        loadList();
      }
    }
  }

  async function removeMovie(movieId) {
    if (await send("/api/lists/" + id + "/items/" + movieId, "DELETE")) {
      loadList();
    }
  }

  async function addMovie(movieId) {
    const data = await send("/api/lists/" + id + "/items", "POST", { movieId: movieId });
    if (data) {
      setNotice(data.message);
      loadList();
    }
  }

  async function invite(event) {
    event.preventDefault();
    if (!inviteId) {
      return;
    }
    const data = await send("/api/lists/" + id + "/members", "POST", { userId: inviteId });
    if (data) {
      setNotice(data.message);
      setInviteId("");
      loadList();
    }
  }

  async function removeMember(userId) {
    if (await send("/api/lists/" + id + "/members/" + userId, "DELETE")) {
      loadList();
    }
  }

  async function handleSearch(event) {
    event.preventDefault();
    setSearchMessage("");
    const text = searchInput.trim();
    if (!text) {
      setResults([]);
      return;
    }
    try {
      const res = await fetch("/api/movies/search?query=" + encodeURIComponent(text));
      const data = await res.json();
      if (!res.ok) {
        setSearchMessage(data.message);
        return;
      }
      setResults(data.results.slice(0, 8));
      if (data.results.length === 0) {
        setSearchMessage("No movies found.");
      }
    } catch (err) {
      setSearchMessage("Could not reach the server");
    }
  }

  if (error) {
    return (
      <div className="page">
        <p className="error">{error}</p>
        <Link to="/lists">Back to my lists</Link>
      </div>
    );
  }
  if (!list) {
    return <p className="page">Loading...</p>;
  }

  const canEdit = role === "owner" || role === "member";

  // movies already in the list, so search results can say "In list"
  const inList = {};
  for (let i = 0; i < list.items.length; i++) {
    inList[list.items[i].movieId] = true;
  }

  const movieCards = [];
  for (let i = 0; i < list.items.length; i++) {
    const item = list.items[i];
    // MovieCard expects the same field names TMDB uses
    const movie = {
      id: item.movieId,
      title: item.title,
      poster_path: item.posterPath,
      release_date: item.releaseDate,
      vote_average: item.voteAverage,
    };
    movieCards.push(
      <div key={item.movieId} className="list-item">
        <MovieCard movie={movie} />
        {item.addedBy && <p className="small">Added by {item.addedBy.name}</p>}
        {canEdit && (
          <button className="small-button secondary-button" onClick={() => removeMovie(item.movieId)}>
            Remove
          </button>
        )}
      </div>
    );
  }

  const resultRows = [];
  for (let i = 0; i < results.length; i++) {
    const movie = results[i];
    const year = movie.release_date ? " (" + movie.release_date.slice(0, 4) + ")" : "";
    resultRows.push(
      <div className="person-row" key={movie.id}>
        <Link to={"/movie/" + movie.id}>
          {movie.title}
          {year}
        </Link>
        {inList[movie.id] ? (
          <span className="small">In list</span>
        ) : (
          <button className="small-button" onClick={() => addMovie(movie.id)}>
            Add
          </button>
        )}
      </div>
    );
  }

  // the people: owner first, then members and pending invites
  const memberRows = [
    <div className="person-row" key="owner">
      <Link to={"/users/" + list.owner._id}>{list.owner.name}</Link>
      <span className="small">Owner</span>
    </div>,
  ];
  for (let i = 0; i < list.members.length; i++) {
    const member = list.members[i];
    if (!member.user) {
      continue;
    }
    memberRows.push(
      <div className="person-row" key={member.user._id}>
        <Link to={"/users/" + member.user._id}>{member.user.name}</Link>
        <div className="friend-actions">
          <span className="small">{member.status === "accepted" ? "Can edit" : "Invited"}</span>
          {role === "owner" && (
            <button
              className="small-button secondary-button"
              onClick={() => removeMember(member.user._id)}
            >
              Remove
            </button>
          )}
        </div>
      </div>
    );
  }

  // friends who are not in the list yet, for the invite box
  const inListIds = {};
  for (let i = 0; i < list.members.length; i++) {
    if (list.members[i].user) {
      inListIds[list.members[i].user._id] = true;
    }
  }
  const friendOptions = [];
  for (let i = 0; i < friends.length; i++) {
    if (!inListIds[friends[i]._id]) {
      friendOptions.push(
        <option key={friends[i]._id} value={friends[i]._id}>
          {friends[i].name}
        </option>
      );
    }
  }

  return (
    <div className="page-wide">
      <p className="small">
        <Link to="/lists">My lists</Link> / {list.name}
      </p>

      {role === "invited" && (
        <div className="invite-banner">
          <span>{list.owner.name} invited you to edit this list together.</span>
          <div className="friend-actions">
            <button className="small-button" onClick={() => answerInvite("accept")}>
              Accept
            </button>
            <button className="small-button secondary-button" onClick={() => answerInvite("decline")}>
              Decline
            </button>
          </div>
        </div>
      )}

      {editing ? (
        <form className="forum-form narrow" onSubmit={saveDetails}>
          <input
            type="text"
            value={editName}
            maxLength={80}
            onChange={(e) => setEditName(e.target.value)}
          />
          <textarea
            rows="2"
            placeholder="Description (optional)"
            value={editDescription}
            maxLength={500}
            onChange={(e) => setEditDescription(e.target.value)}
          />
          <div className="form-buttons">
            <button type="submit">Save</button>
            <button type="button" className="secondary-button" onClick={() => setEditing(false)}>
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <>
          <h2>{list.name}</h2>
          {list.description && <p className="post-body">{list.description}</p>}
          <div className="review-actions">
            <span className="small">
              {list.items.length} {list.items.length === 1 ? "movie" : "movies"}
            </span>
            {canEdit && (
              <button
                className="small-button secondary-button"
                onClick={() => {
                  setEditName(list.name);
                  setEditDescription(list.description);
                  setEditing(true);
                }}
              >
                Rename
              </button>
            )}
            {role === "owner" && (
              <button className="small-button secondary-button" onClick={deleteList}>
                Delete list
              </button>
            )}
            {role === "member" && (
              <button className="small-button secondary-button" onClick={leaveList}>
                Leave list
              </button>
            )}
          </div>
        </>
      )}

      {actionError && <p className="error">{actionError}</p>}
      {notice && <p className="small">{notice}</p>}

      {canEdit && (
        <div className="friends-section narrow list-search">
          <h3>Add movies</h3>
          <form className="search-bar" onSubmit={handleSearch}>
            <input
              type="text"
              placeholder="Search for a movie"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
            <button type="submit">Search</button>
          </form>
          {searchMessage && <p className="small">{searchMessage}</p>}
          {resultRows}
        </div>
      )}

      {list.items.length === 0 ? (
        <p className="small">No movies in this list yet.</p>
      ) : (
        <div className="movie-grid">{movieCards}</div>
      )}

      <div className="friends-section narrow list-members">
        <h3>People</h3>
        {memberRows}
        {role === "owner" && (
          <form className="add-to-list" onSubmit={invite}>
            <select value={inviteId} onChange={(e) => setInviteId(e.target.value)}>
              <option value="">Invite a friend...</option>
              {friendOptions}
            </select>
            <button type="submit" className="small-button" disabled={!inviteId}>
              Invite
            </button>
            {friends.length === 0 && (
              <span className="small">
                <Link to="/friends">Add friends</Link> to share this list.
              </span>
            )}
          </form>
        )}
      </div>
    </div>
  );
}

export default ListPage;
