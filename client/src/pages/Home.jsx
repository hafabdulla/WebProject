import { useState, useEffect } from "react";

function Home() {
  const [status, setStatus] = useState("checking...");

  // Temporary check: asks the server if it is running (you can delete this later)
  useEffect(() => {
    fetch("/api/health")
      .then((res) => res.json())
      .then((data) => setStatus(data.status))
      .catch(() => setStatus("server not reachable"));
  }, []);

  return (
    <div className="page">
      <h1>Welcome to MovieHive</h1>
      <p>Discover movies, track what you want to watch and share reviews.</p>
      <p className="small">Server status: {status}</p>
    </div>
  );
}

export default Home;