import { useState, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";

// One forum board: its threads, and a form to start a new thread
function ForumBoard() {
  const { board } = useParams();
  const navigate = useNavigate();
  const user = useSelector((state) => state.auth.user);
  const token = useSelector((state) => state.auth.token);

  const [boardInfo, setBoardInfo] = useState(null);
  const [threads, setThreads] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [formError, setFormError] = useState("");

  // when the board changes, start again from page 1
  useEffect(() => {
    setPage(1);
    setThreads([]);
  }, [board]);

  useEffect(() => {
    // if the user switches board before this answer arrives, ignore the old answer
    let cancelled = false;

    async function loadThreads() {
      setLoading(true);
      setError("");
      try {
        const res = await fetch("/api/forum/boards/" + board + "/threads?page=" + page);
        const data = await res.json();
        if (cancelled) {
          return;
        }
        if (!res.ok) {
          setError(data.message);
          setLoading(false);
          return;
        }
        setBoardInfo(data.board);
        setTotalPages(data.total_pages);
        if (page === 1) {
          setThreads(data.threads);
        } else {
          setThreads(function (old) {
            return old.concat(data.threads);
          });
        }
      } catch (err) {
        if (!cancelled) {
          setError("Could not reach the server");
        }
      }
      if (!cancelled) {
        setLoading(false);
      }
    }
    loadThreads();

    return () => {
      cancelled = true;
    };
  }, [board, page]);

  async function handleCreate(event) {
    event.preventDefault();
    setFormError("");
    try {
      const res = await fetch("/api/forum/threads", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
        body: JSON.stringify({ board: board, title: title, body: body }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.message);
        return;
      }
      // open the new thread
      navigate("/forum/thread/" + data._id);
    } catch (err) {
      setFormError("Could not reach the server");
    }
  }

  const threadItems = [];
  for (let i = 0; i < threads.length; i++) {
    const thread = threads[i];
    let author = "Deleted user";
    if (thread.author) {
      author = <Link to={"/users/" + thread.author._id}>{thread.author.name}</Link>;
    }
    threadItems.push(
      <div className="forum-row" key={thread._id}>
        <div>
          <Link to={"/forum/thread/" + thread._id} className="thread-title">
            {thread.title}
          </Link>
          <p className="small">
            by {author} | last activity {new Date(thread.lastActivityAt).toLocaleString()}
          </p>
        </div>
        <span className="small">
          {thread.replyCount} {thread.replyCount === 1 ? "reply" : "replies"}
        </span>
      </div>
    );
  }

  let formArea;
  if (!user) {
    formArea = (
      <p className="small">
        <Link to="/login">Login</Link> to start a thread.
      </p>
    );
  } else if (!showForm) {
    formArea = <button onClick={() => setShowForm(true)}>Start a new thread</button>;
  } else {
    formArea = (
      <form className="forum-form" onSubmit={handleCreate}>
        <input
          type="text"
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <textarea
          rows="5"
          placeholder="What do you want to talk about?"
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
        {formError && <p className="error">{formError}</p>}
        <div className="form-buttons">
          <button type="submit">Post thread</button>
          <button type="button" className="secondary-button" onClick={() => setShowForm(false)}>
            Cancel
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="page-wide narrow">
      <p className="small">
        <Link to="/forum">Forum</Link> / {boardInfo ? boardInfo.label : board}
      </p>
      <h2>{boardInfo ? boardInfo.label : "Forum"}</h2>
      {boardInfo && <p className="small">{boardInfo.description}</p>}

      <div className="forum-new">{boardInfo && formArea}</div>

      {error && <p className="error">{error}</p>}
      {!loading && !error && threads.length === 0 && (
        <p className="small">No threads yet. Be the first to start one!</p>
      )}
      {threadItems}

      {loading && <p>Loading...</p>}
      {!loading && page < totalPages && (
        <button className="load-more" onClick={() => setPage(page + 1)}>
          Load more
        </button>
      )}
    </div>
  );
}

export default ForumBoard;
