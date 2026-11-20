import {useState} from "react"
function AdminDashboard(){
    const [tab, setTab] = useState("overview");
    return(
        <div className="page-wide">
            <h1>
                Admin Dashboard
            </h1>
      <div className="admin-tabs">
        <button
          className={tab === "overview" ? "" : "secondary-button"}
          onClick={() => setTab("overview")}
        >
          Overview
        </button>
        <button
          className={tab === "users" ? "" : "secondary-button"}
          onClick={() => setTab("users")}
        >
          Users
        </button>
        <button
          className={tab === "reviews" ? "" : "secondary-button"}
          onClick={() => setTab("reviews")}
        >
          Reviews
        </button>
        <button
          className={tab === "reports" ? "" : "secondary-button"}
          onClick={() => setTab("reports")}
        >
          Reports
        </button>
      </div>
    {tab === "overview" && <p>Overview coming next.</p>}
    {tab === "users" && <p>Users coming soon.</p>}
    {tab === "reviews" && <p>Reviews coming soon.</p>}
    {tab === "reports" && <p>Reports coming soon.</p>}
        </div>
    )
}

export default AdminDashboard;