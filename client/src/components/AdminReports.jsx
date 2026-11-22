import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";

function AdminReports() {
  const token = useSelector((state) => state.auth.token);
  const [status, setStatus] = useState("open");
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    async function loadReports() {
      setLoading(true);
      setError("");
      try {
        const res = await fetch("/api/forum/reports?status=" + status, {
          headers: { Authorization: "Bearer " + token },
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.message);
        } else {
          setReports(data);
        }
      } catch (err) {
        setError("Could not reach the server");
      }
      setLoading(false);
    }
    loadReports();
  }, [token, status]);

  function removeReport(id) {
    const list = [];
    for (let i = 0; i < reports.length; i++) {
      if (reports[i]._id !== id) {
        list.push(reports[i]);
      }
    }
    setReports(list);
  }

  async function changeStatus(id, newStatus) {
    setError("");
    try {
      const res = await fetch("/api/forum/reports/" + id, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message);
        return;
      }
      removeReport(id);
    } catch (err) {
      setError("Could not reach the server");
    }
  }
  // deleting a post also deletes every report on it on the server,and deleting a thread deletes the reports on its replies too, so we drop the same reports from our list
  function removeReportsFor(deleted) {
    const list = [];
    for (let i = 0; i < reports.length; i++) {
      const report = reports[i];
      let gone = false;
      if (deleted.targetType === "thread") {
        if (report.post && report.post.threadId === deleted.post.threadId) {
          gone = true;
        }
      } else {
        if (
          report.targetType === "reply" &&
          report.targetId === deleted.targetId
        ) {
          gone = true;
        }
      }
      if (!gone) {
        list.push(report);
      }
    }
    setReports(list);
  }
  async function deletePost(report) {
    let message = "Delete this reply? This cannot be undone.";
    let path = "/api/forum/replies/";
    if (report.targetType === "thread") {
      message =
        "Delete this thread and all its replies? This cannot be undone.";
      path = "/api/forum/threads/";
    }
    const ok = window.confirm(message);
    if (!ok) {
      return;
    }
    setError("");
    try {
      const res = await fetch(path + report.targetId, {
        method: "DELETE",
        headers: { Authorization: "Bearer " + token },
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message);
        return;
      }
      removeReportsFor(report);
    } catch (err) {
      setError("Could not reach the server");
    }
  }
  function shortText(text) {
    if (text.length > 100) {
      return text.slice(0, 100) + "...";
    }
    return text;
  }

  // post is null when the thread or reply was deleted after being reported
  function renderPost(report) {
    if (!report.post) {
      return <span className="small">Post was deleted</span>;
    }
    let label = shortText(report.post.body);
    if (report.targetType === "thread") {
      label = report.post.title;
    }
    return <Link to={"/forum/thread/" + report.post.threadId}>{label}</Link>;
  }

  function getAuthorName(report) {
    if (report.post && report.post.author) {
      return report.post.author.name;
    }
    return "Unknown";
  }

  function getReporterName(report) {
    if (report.reporter) {
      return report.reporter.name;
    }
    return "Deleted user";
  }

  return (
    <div>
      <div className="admin-actions">
        <button
          className={
            status === "open" ? "small-button" : "small-button secondary-button"
          }
          onClick={() => setStatus("open")}
        >
          Open
        </button>
        <button
          className={
            status === "resolved"
              ? "small-button"
              : "small-button secondary-button"
          }
          onClick={() => setStatus("resolved")}
        >
          Resolved
        </button>
      </div>

      {error && <p className="error">{error}</p>}
      {loading && <p>Loading...</p>}
      {!loading && reports.length === 0 && (
        <p className="small">No {status} reports.</p>
      )}

      {!loading && reports.length > 0 && (
        <div className="table-scroll">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Post</th>
                <th>Author</th>
                <th>Reason</th>
                <th>Reported by</th>
                <th>Date</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((report) => (
                <tr key={report._id}>
                  <td>{report.targetType}</td>
                  <td>{renderPost(report)}</td>
                  <td>{getAuthorName(report)}</td>
                  <td>{report.reason}</td>
                  <td>{getReporterName(report)}</td>
                  <td>{report.createdAt.slice(0, 10)}</td>
                  <td>
                    <div className="admin-actions">
                      {report.status === "open" ? (
                        <button
                          className="small-button"
                          onClick={() => changeStatus(report._id, "resolved")}
                        >
                          Resolve
                        </button>
                      ) : (
                        <button
                          className="small-button"
                          onClick={() => changeStatus(report._id, "open")}
                        >
                          Reopen
                        </button>
                      )}
                      {report.post && (
                        <button
                          className="small-button"
                          onClick={() => deletePost(report)}
                        >
                          Delete post
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default AdminReports;
