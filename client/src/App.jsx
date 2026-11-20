import { useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { logout } from "./store/authSlice";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import MovieDetails from "./pages/MovieDetails"
import Watchlist from "./pages/Watchlist";
import Profile from "./pages/Profile";
import Recommendations from "./pages/Recommendations";
import Friends from "./pages/Friends";
import UserPage from "./pages/UserPage";
import Forum from "./pages/Forum";
import ForumBoard from "./pages/ForumBoard";
import ForumThread from "./pages/ForumThread";
import Chat from "./pages/Chat";
import Notifications from "./pages/Notifications";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminDashboard from "./pages/AdminDashboard"
function App() {
  const token = useSelector((state) => state.auth.token);
  const dispatch = useDispatch();

  // The saved login can go stale (tokens expire after 7 days, or the server's
  // JWT_SECRET changed). Ask the server if the token still works; if not, log out.
  useEffect(() => {
    if (!token) {
      return;
    }
    async function checkToken() {
      try {
        const res = await fetch("/api/auth/me", {
          headers: { Authorization: "Bearer " + token },
        });
        if (res.status === 401) {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          dispatch(logout());
        }
      } catch (err) {
        // server not reachable: keep the login, the pages will show their own error
      }
    }
    checkToken();
  }, [token, dispatch]);

  return (
    <div>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/movie/:id" element={<MovieDetails/>}/>
        <Route
          path="/watchlist"
          element={
            <ProtectedRoute>
              <Watchlist />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />
        <Route path="/recommendations" element={<Recommendations />} />
        <Route
          path="/friends"
          element={
            <ProtectedRoute>
              <Friends />
            </ProtectedRoute>
          }
        />
        <Route path="/users/:id" element={<UserPage />} />
        <Route path="/forum" element={<Forum />} />
        <Route path="/forum/thread/:id" element={<ForumThread />} />
        <Route path="/forum/:board" element={<ForumBoard />} />
        <Route
          path="/chat"
          element={
            <ProtectedRoute>
              <Chat />
            </ProtectedRoute>
          }
        />
        <Route
          path="/chat/:userId"
          element={
            <ProtectedRoute>
              <Chat />
            </ProtectedRoute>
          }
        />
        <Route
          path="/notifications"
          element={
            <ProtectedRoute>
              <Notifications />
            </ProtectedRoute>
          }
        />
        <Route path="/admin" element={<ProtectedRoute adminOnly> <AdminDashboard/>
        </ProtectedRoute>
        }/>
      </Routes>
    </div>
  );
}

export default App;
