import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
function AdminUsers() {
    const token = useSelector((state) => state.auth.token);
    const me = useSelector((state) => state.auth.user);
    const [users, setUsers] = useState([]);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    // login saves the user with "id", the server sends users with "_id"
    let myId = me.id;
    if (!myId) {
      myId = me._id;
    }

    async function loadUsers(text) {
      setLoading(true);
      setError("");
      try {
        const res = await fetch("/api/admin/users?q=" + encodeURIComponent(text), {
          headers: { Authorization: "Bearer " + token },
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.message);
        } else {
          setUsers(data);
        }
      } catch (err) {
        setError("Could not reach the server");
      }
      setLoading(false);
    }
    useEffect(() => {
      loadUsers("");
    }, [token]);    
    function handleSearch(e) {
      e.preventDefault();
      loadUsers(search);
    }
      function replaceUser(updated) {
    const list = [];
    for (let i = 0; i < users.length; i++) {
      if (users[i]._id === updated._id) {
        list.push(updated);
      } else {
        list.push(users[i]);
      }
    }
    setUsers(list);
  }
//path is "role" or "block"
  async function changeUser(id, path, body) {
    setError("");
    try {
      const res = await fetch("/api/admin/users/" + id + "/" + path, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token,
        },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message);
        return;
      }
      replaceUser(data);
    } catch (err) {
      setError("Could not reach the server");
    }
  }

  function toggleRole(user) {
    let newRole = "admin";
    if (user.role === "admin") {
      newRole = "user";
    }
    changeUser(user._id, "role", { role: newRole });
  }

  function toggleBlocked(user) {
    if (!user.isBlocked) {
      const ok = window.confirm("Block " + user.name + "? They lose access straight away.");
      if (!ok) {
        return;
      }
    }
    changeUser(user._id, "block", { isBlocked: !user.isBlocked });
  }

  return (
    <div>
      <form className="search-bar" onSubmit={handleSearch}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or email"
        />
        <button type="submit">Search</button>
      </form>

      {error && <p className="error">{error}</p>}
      {loading && <p>Loading...</p>}
      {!loading && users.length === 0 && <p className="small">No users found.</p>}

      {!loading && users.length > 0 && (
        <div className="table-scroll">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Joined</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user._id}>
                  <td>
                    <Link to={"/users/" + user._id}>{user.name}</Link>
                  </td>
                  <td>{user.email}</td>
                  <td>{user.role}</td>
                  <td>{user.createdAt.slice(0, 10)}</td>
                  <td>{user.isBlocked ? "Blocked" : "Active"}</td>
                  <td>
                    {user._id === myId ? (
                      <span className="small">This is you</span>
                    ) : (
                      <div className="admin-actions">
                        <button className="small-button" onClick={() => toggleRole(user)}>
                          {user.role === "admin" ? "Remove admin" : "Make admin"}
                        </button>
                        <button className="small-button" onClick={() => toggleBlocked(user)}>
                          {user.isBlocked ? "Unblock" : "Block"}
                        </button>
                      </div>
                    )}
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

export default AdminUsers;