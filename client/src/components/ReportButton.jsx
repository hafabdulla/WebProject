import { useState } from "react";
import { useSelector } from "react-redux";

// A small "Report" button for a forum thread or reply.
// It asks the user why, then sends the report to the admins.
function ReportButton({ targetType, targetId }) {
  const token = useSelector((state) => state.auth.token);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  async function handleReport() {
    const reason = window.prompt("Why are you reporting this post?");
    if (reason === null) {
      return; // the user pressed Cancel
    }

    try {
      const res = await fetch("/api/forum/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
        body: JSON.stringify({ targetType, targetId, reason }),
      });
      const data = await res.json();
      setIsError(!res.ok);
      setMessage(data.message);
    } catch (err) {
      setIsError(true);
      setMessage("Could not reach the server");
    }
  }

  if (message) {
    return <span className={isError ? "error" : "small"}>{message}</span>;
  }

  return (
    <button className="small-button secondary-button" onClick={handleReport}>
      Report
    </button>
  );
}

export default ReportButton;
