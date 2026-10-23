import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { loginSuccess } from "../store/authSlice";

function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const dispatch = useDispatch();
  const navigate = useNavigate();

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.message);
        return;
      }

      // the server logs the new user in straight away and sends a token
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      dispatch(loginSuccess(data));
      navigate("/");
    } catch (err) {
      setError("Could not reach the server");
    }
  }

  return (
    <div className="page">
      <h1>Sign up</h1>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          type="password"
          placeholder="Password (at least 6 characters)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <p className="error">{error}</p>}
        <button type="submit">Create account</button>
      </form>
      <p className="small">
        Already have an account? <Link to="/login">Login</Link>
      </p>
    </div>
  );
}

export default Register;