import { useState, useEffect } from "react";
import { Link } from "react-router-dom";

// The forum home page: a list of boards
function Forum() {
  const [boards, setBoards] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadBoards() {
      setLoading(true);
      try {
        const res = await fetch("/api/forum/boards");
        const data = await res.json();
        if (!res.ok) {
          setError(data.message);
        } else {
          setBoards(data);
        }
      } catch (err) {
        setError("Could not reach the server");
      }
      setLoading(false);
    }
    loadBoards();
  }, []);

  const boardItems = [];
  for (let i = 0; i < boards.length; i++) {
    const board = boards[i];
    boardItems.push(
      <Link to={"/forum/" + board.key} className="forum-row" key={board.key}>
        <div>
          <h3>{board.label}</h3>
          <p className="small">{board.description}</p>
        </div>
        <span className="small">
          {board.threadCount} {board.threadCount === 1 ? "thread" : "threads"}
        </span>
      </Link>
    );
  }

  return (
    <div className="page-wide narrow">
      <h2>Community forum</h2>
      {error && <p className="error">{error}</p>}
      {loading && <p>Loading...</p>}
      {boardItems}
    </div>
  );
}

export default Forum;
