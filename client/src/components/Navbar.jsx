import { Link, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { logout } from "../store/authSlice";

function Navbar() {
  const user = useSelector((state) => state.auth.user);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    dispatch(logout());
    navigate("/");
  }

  return (
    <nav className="navbar">
      <Link to="/" className="logo">
        MovieHive
      </Link>

      {user ? (
        <div className="nav-links">
          <span>Hello, {user.name}</span>
          <button onClick={handleLogout}>Logout</button>
        </div>
      ) : (
        <div className="nav-links">
          <Link to="/login">Login</Link>
          <Link to="/register">Sign up</Link>
        </div>
      )}
    </nav>
  );
}

export default Navbar;