import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import useSocketEvent from "../useSocketEvent";

const POSTER_BASE = "https://image.tmdb.org/t/p/w154";

// "My lists": lists I own or share, invites to other people's lists, and a form for a new list
function Lists() {
  const token = useSelector((state) => state.auth.token);
  const navigate = useNavigate();

  const [lists, setLists] = useState([]);
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [formError, setFormError] = useState("");

  const headers = { "Content-Type": "application/json", Authorization: "Bearer " + token };

  async function loadLists() {
    try {
      const res = await fetch("/api/lists", { headers: headers });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message);
        return;
      }
      setLists(data.lists);
      setInvites(data.invites);
    } catch (err) {
      setError("Could not reach the server");
    }
  }

  useEffect(() => {
    async function firstLoad() {
      setLoading(true);
      await loadLists();
      setLoading(false);
    }
    firstLoad();
  }, [token]);

  // a new invite, or a change to one of my lists
  useSocketEvent("notification", (n) => {
    if (n.type === "list_invite" || n.type === "list_joined") {
      loadLists();
    }
  });
  useSocketEvent("list_updated", loadLists);

  async function handleCreate(event) {
    event.preventDefault();
    setFormError("");
    try {
      const res = await fetch("/api/lists", {
        method: "POST",
        headers: headers,
        body: JSON.stringify({ name: name, description: description }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.message);
        return;
      }
      navigate("/lists/" + data._id);
    } catch (err) {
      setFormError("Could not reach the server");
    }
  }

  async function answerInvite(listId, answer) {
    try {
      const res = await fetch("/api/lists/" + listId + "/" + answer, {
        method: "POST",
        headers: headers,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message);
        return;
      }
      if (answer === "accept") {
        navigate("/lists/" + listId);
      } else {
        loadLists();
      }
    } catch (err) {
      setError("Could not reach the server");
    }
  }

  // up to 4 small posters as a preview of the list
  function posterPreview(list) {
    const images = [];
    for (let i = 0; i < list.posters.length; i++) {
      images.push(<img key={i} src={POSTER_BASE + list.posters[i]} alt="" />);
    }
    if (images.length === 0) {
      return <div className="list-posters empty">No movies yet</div>;
    }
    return <div className="list-posters">{images}</div>;
  }

  const listCards = [];
  for (let i = 0; i < lists.length; i++) {
    const list = lists[i];
    let shared = "";
    if (list.role === "member") {
      shared = "Shared by " + list.owner.name;
    } else if (list.memberCount > 0) {
      shared = "Shared with " + list.memberCount + (list.memberCount === 1 ? " friend" : " friends");
    }
    listCards.push(
      <Link to={"/lists/" + list._id} className="list-card" key={list._id}>
        {posterPreview(list)}
        <div className="list-card-info">
          <h3>{list.name}</h3>
          <p className="small">
            {list.itemCount} {list.itemCount === 1 ? "movie" : "movies"}
            {shared && " | " + shared}
          </p>
        </div>
      </Link>
    );
  }

  const inviteRows = [];
  for (let i = 0; i < invites.length; i++) {
    const invite = invites[i];
    inviteRows.push(
      <div className="person-row" key={invite._id}>
        <div>
          <Link to={"/lists/" + invite._id}>{invite.name}</Link>
          <p className="small">
            {invite.owner.name} invited you | {invite.itemCount}{" "}
            {invite.itemCount === 1 ? "movie" : "movies"}
          </p>
        </div>
        <div className="friend-actions">
          <button className="small-button" onClick={() => answerInvite(invite._id, "accept")}>
            Accept
          </button>
          <button
            className="small-button secondary-button"
            onClick={() => answerInvite(invite._id, "decline")}
          >
            Decline
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-wide">
      <div className="page-title-row">
        <h2>My lists</h2>
        {!showForm && <button onClick={() => setShowForm(true)}>New list</button>}
      </div>

      {showForm && (
        <form className="forum-form narrow" onSubmit={handleCreate}>
          <input
            type="text"
            placeholder="List name, e.g. Weekend horror marathon"
            value={name}
            maxLength={80}
            onChange={(e) => setName(e.target.value)}
          />
          <textarea
            rows="2"
            placeholder="Description (optional)"
            value={description}
            maxLength={500}
            onChange={(e) => setDescription(e.target.value)}
          />
          {formError && <p className="error">{formError}</p>}
          <div className="form-buttons">
            <button type="submit">Create list</button>
            <button type="button" className="secondary-button" onClick={() => setShowForm(false)}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {error && <p className="error">{error}</p>}
      {loading && <p>Loading...</p>}

      {inviteRows.length > 0 && (
        <div className="friends-section narrow">
          <h3>Invites ({inviteRows.length})</h3>
          {inviteRows}
        </div>
      )}

      {!loading && !error && lists.length === 0 && (
        <p className="small">
          You have no lists yet. Make one, then add movies from any movie page.
        </p>
      )}
      <div className="list-grid">{listCards}</div>
    </div>
  );
}

export default Lists;
