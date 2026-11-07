import { Link } from "react-router-dom";
import { useSelector } from "react-redux";

// Wraps a page. Logged in users see the page, everybody else sees a message.
// If adminOnly is set, only admins see the page.
function ProtectedRoute({ children, adminOnly }) {
  const user = useSelector((state) => state.auth.user);

  if (!user) {
    return (
      <div className="page">
        <p>
          Please <Link to="/login">login</Link> to see this page.
        </p>
      </div>
    );
  }

  if (adminOnly && user.role !== "admin") {
    return (
      <div className="page">
        <p className="error">Only admins can see this page.</p>
      </div>
    );
  }

  return children;
}

export default ProtectedRoute;