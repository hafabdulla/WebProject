import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";

// "Add to list" on the movie page: pick one of my lists and add this movie to it
function AddToList({ movieId }) {
  const user = useSelector((state) => state.auth.user);
  const token = useSelector((state) => state.auth.token);

  const [lists, setLists] = useState([]);
  const [chosen, setChosen] = useState("");
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!token) {
      return;
    }
    async function loadLists() {
      try {
        const res = await fetch("/api/lists", { headers: { Authorization: "Bearer " + token } });
        const data = await res.json();
        if (res.ok) {
          setLists(data.lists);
          if (data.lists.length > 0) {
            setChosen(data.lists[0]._id);
          }
        }
      } catch (err) {
        // the box just shows no lists
      }
      setLoaded(true);
    }
    loadLists();
  }, [token]);

  async function handleAdd(event) {
    event.preventDefault();
    setMessage("");
    try {
      const res = await fetch("/api/lists/" + chosen + "/items", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
        body: JSON.stringify({ movieId: movieId }),
      });
      const data = await res.json();
      setIsError(!res.ok);
      setMessage(data.message);
    } catch (err) {
      setIsError(true);
      setMessage("Could not reach the server");
    }
  }

  if (!user || !loaded) {
    return null;
  }

  if (lists.length === 0) {
    return (
      <p className="small">
        <Link to="/lists">Make a list</Link> to save this movie in it.
      </p>
    );
  }

  const options = [];
  for (let i = 0; i < lists.length; i++) {
    options.push(
      <option key={lists[i]._id} value={lists[i]._id}>
        {lists[i].name}
      </option>
    );
  }

  return (
    <form className="add-to-list" onSubmit={handleAdd}>
      <select
        value={chosen}
        onChange={(e) => {
          setChosen(e.target.value);
          setMessage("");
        }}
      >
        {options}
      </select>
      <button type="submit" className="small-button">
        Add to list
      </button>
      {message && <span className={isError ? "error" : "small"}>{message}</span>}
    </form>
  );
}

export default AddToList;
