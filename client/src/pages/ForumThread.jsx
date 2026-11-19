import { useState, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import ReportButton from "../components/ReportButton";

// One forum thread: the first post, the replies and a reply form
function ForumThread() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = useSelector((state) => state.auth.user);
  const token = useSelector((state) => state.auth.token);

  const [thread, setThread] = useState(null);
  const [board, setBoard] = useState(null);
  const [replies, setReplies] = useState([]);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");

  const [replyText, setReplyText] = useState("");

  // editing: "thread" for the first post, or a reply's id
  const [editingId, setEditingId] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");

  const headers = { "Content-Type": "application/json", Authorization: "Bearer " + token };

  async function loadThread() {
    try {
      const res = await fetch("/api/forum/threads/" + id);
      const data = await res.json();
      if (!res.ok) {
        setError(data.message);
        return;
      }
      setThread(data.thread);
      setBoard(data.board);
      setReplies(data.replies);
    } catch (err) {
      setError("Could not reach the server");
    }
  }

  useEffect(() => {
    setError("");
    setThread(null);
    loadThread();
  }, [id]);

  // sends one change to the server, then reloads the thread
  async function send(url, method, body) {
    setActionError("");
    try {
      const options = { method: method, headers: headers };
      if (body) {
        options.body = JSON.stringify(body);
      }
      const res = await fetch(url, options);
      const data = await res.json();
      if (!res.ok) {
        setActionError(data.message);
        return false;
      }
      return true;
    } catch (err) {
      setActionError("Could not reach the server");
      return false;
    }
  }

  async function handleReply(event) {
    event.preventDefault();
    const ok = await send("/api/forum/threads/" + id + "/replies", "POST", { body: replyText });
    if (ok) {
      setReplyText("");
      loadThread();
    }
  }

  function startEdit(postId, title, body) {
    setActionError("");
    setEditingId(postId);
    setEditTitle(title);
    setEditBody(body);
  }

  async function saveEdit(event) {
    event.preventDefault();
    let ok;
    if (editingId === "thread") {
      ok = await send("/api/forum/threads/" + id, "PUT", { title: editTitle, body: editBody });
    } else {
      ok = await send("/api/forum/replies/" + editingId, "PUT", { body: editBody });
    }
    if (ok) {
      setEditingId("");
      loadThread();
    }
  }

  async function deleteThread() {
    if (!window.confirm("Delete this thread and all its replies?")) {
      return;
    }
    const ok = await send("/api/forum/threads/" + id, "DELETE");
    if (ok) {
      navigate("/forum/" + thread.board);
    }
  }

  async function deleteReply(replyId) {
    if (!window.confirm("Delete this reply?")) {
      return;
    }
    const ok = await send("/api/forum/replies/" + replyId, "DELETE");
    if (ok) {
      loadThread();
    }
  }

  if (error) {
    return <p className="page error">{error}</p>;
  }
  if (!thread) {
    return <p className="page">Loading...</p>;
  }

  const isAdmin = user && user.role === "admin";

  // the author line, plus the Edit / Delete / Report buttons for one post
  function postFooter(post, postId, onEdit, onDelete, targetType) {
    const isOwner = user && post.author && post.author._id === user.id;
    let author = "Deleted user";
    if (post.author) {
      author = <Link to={"/users/" + post.author._id}>{post.author.name}</Link>;
    }
    let edited = "";
    if (post.updatedAt !== post.createdAt) {
      edited = " (edited)";
    }
    return (
      <div className="review-actions">
        <span className="small">
          {author} | {new Date(post.createdAt).toLocaleString()}
          {edited}
        </span>
        {isOwner && editingId !== postId && (
          <button className="small-button secondary-button" onClick={onEdit}>
            Edit
          </button>
        )}
        {(isOwner || isAdmin) && (
          <button className="small-button secondary-button" onClick={onDelete}>
            Delete
          </button>
        )}
        {user && !isOwner && <ReportButton targetType={targetType} targetId={post._id} />}
      </div>
    );
  }

  // the edit form, shown in place of a post while it is being edited
  const editForm = (
    <form className="forum-form" onSubmit={saveEdit}>
      {editingId === "thread" && (
        <input type="text" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
      )}
      <textarea rows="4" value={editBody} onChange={(e) => setEditBody(e.target.value)} />
      <div className="form-buttons">
        <button type="submit">Save</button>
        <button type="button" className="secondary-button" onClick={() => setEditingId("")}>
          Cancel
        </button>
      </div>
    </form>
  );

  const replyItems = [];
  for (let i = 0; i < replies.length; i++) {
    const reply = replies[i];
    replyItems.push(
      <div className="review" key={reply._id}>
        {editingId === reply._id ? editForm : <p className="post-body">{reply.body}</p>}
        {postFooter(
          reply,
          reply._id,
          () => startEdit(reply._id, "", reply.body),
          () => deleteReply(reply._id),
          "reply"
        )}
      </div>
    );
  }

  return (
    <div className="page-wide narrow">
      <p className="small">
        <Link to="/forum">Forum</Link> /{" "}
        <Link to={"/forum/" + thread.board}>{board ? board.label : thread.board}</Link>
      </p>

      <div className="review thread-post">
        {editingId === "thread" ? (
          editForm
        ) : (
          <>
            <h2>{thread.title}</h2>
            <p className="post-body">{thread.body}</p>
          </>
        )}
        {postFooter(
          thread,
          "thread",
          () => startEdit("thread", thread.title, thread.body),
          deleteThread,
          "thread"
        )}
      </div>

      {actionError && <p className="error">{actionError}</p>}

      <h3>
        {replies.length} {replies.length === 1 ? "reply" : "replies"}
      </h3>
      {replyItems}

      {user ? (
        <form className="forum-form" onSubmit={handleReply}>
          <textarea
            rows="3"
            placeholder="Write a reply"
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
          />
          <div className="form-buttons">
            <button type="submit">Post reply</button>
          </div>
        </form>
      ) : (
        <p className="small">
          <Link to="/login">Login</Link> to reply.
        </p>
      )}
    </div>
  );
}

export default ForumThread;
