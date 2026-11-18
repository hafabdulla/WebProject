import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import FriendButton from "../components/FriendButton";

function Friends() {
  const token = useSelector((state) => state.auth.token);

  const [friends, setFriends] = useState([]);
  const [incoming, setIncoming] = useState([]);
  const [outgoing, setOutgoing] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [searchInput, setSearchInput] = useState("");
  const [searchText, setSearchText] = useState("");
  const [results, setResults] = useState([]);
  const [searchError, setSearchError] = useState("");

  const headers = { Authorization: "Bearer " + token };

  // load my friends and my requests
  async function loadLists() {
    setError("");
    try {
      const friendsRes = await fetch("/api/friends", { headers: headers });
      const friendsData = await friendsRes.json();
      const requestsRes = await fetch("/api/friends/requests", { headers: headers });
      const requestsData = await requestsRes.json();

      if (!friendsRes.ok) {
        setError(friendsData.message);
        return;
      }
      if (!requestsRes.ok) {
        setError(requestsData.message);
        return;
      }

      setFriends(friendsData);
      setIncoming(requestsData.incoming);
      setOutgoing(requestsData.outgoing);
    } catch (err) {
      setError("Could not reach the server");
    }
  }

  async function runSearch(text) {
    setSearchError("");
    if (!text) {
      setResults([]);
      return;
    }
    try {
      const res = await fetch("/api/users/search?q=" + encodeURIComponent(text), {
        headers: headers,
      });
      const data = await res.json();
      if (!res.ok) {
        setSearchError(data.message);
        setResults([]);
        return;
      }
      setResults(data);
    } catch (err) {
      setSearchError("Could not reach the server");
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

  function handleSearch(event) {
    event.preventDefault();
    const text = searchInput.trim();
    setSearchText(text);
    runSearch(text);
  }

  // after any button is used, reload everything so all sections agree
  function refresh() {
    loadLists();
    if (searchText) {
      runSearch(searchText);
    }
  }

  // one row: the person's name (a link to their page) and the friend buttons
  function personRow(person, status, requestId, note) {
    return (
      <div className="person-row" key={person._id + "-" + status}>
        <div>
          <Link to={"/users/" + person._id}>{person.name}</Link>
          {note && <p className="small">{note}</p>}
        </div>
        <FriendButton
          userId={person._id}
          initialStatus={status}
          initialRequestId={requestId}
          onChange={refresh}
        />
      </div>
    );
  }

  const resultRows = [];
  for (let i = 0; i < results.length; i++) {
    resultRows.push(personRow(results[i], results[i].status, results[i].requestId));
  }

  const incomingRows = [];
  for (let i = 0; i < incoming.length; i++) {
    incomingRows.push(personRow(incoming[i].user, "received", incoming[i]._id));
  }

  const outgoingRows = [];
  for (let i = 0; i < outgoing.length; i++) {
    outgoingRows.push(personRow(outgoing[i].user, "sent", outgoing[i]._id));
  }

  const friendRows = [];
  for (let i = 0; i < friends.length; i++) {
    const since = "Friends since " + new Date(friends[i].since).toLocaleDateString();
    friendRows.push(personRow(friends[i], "friends", "", since));
  }

  return (
    <div className="page-wide narrow">
      <h2>Friends</h2>

      <div className="friends-section">
        <h3>Find people</h3>
        <form className="search-bar" onSubmit={handleSearch}>
          <input
            type="text"
            placeholder="Search by name or email"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          <button type="submit">Search</button>
        </form>
        {searchError && <p className="error">{searchError}</p>}
        {searchText && !searchError && results.length === 0 && (
          <p className="small">No one found for "{searchText}".</p>
        )}
        {resultRows}
      </div>

      {error && <p className="error">{error}</p>}
      {loading && <p>Loading...</p>}

      {incomingRows.length > 0 && (
        <div className="friends-section">
          <h3>Friend requests ({incomingRows.length})</h3>
          {incomingRows}
        </div>
      )}

      {outgoingRows.length > 0 && (
        <div className="friends-section">
          <h3>Requests you sent ({outgoingRows.length})</h3>
          {outgoingRows}
        </div>
      )}

      <div className="friends-section">
        <h3>My friends ({friendRows.length})</h3>
        {!loading && friendRows.length === 0 && (
          <p className="small">No friends yet. Search for people above to add some.</p>
        )}
        {friendRows}
      </div>
    </div>
  );
}

export default Friends;
