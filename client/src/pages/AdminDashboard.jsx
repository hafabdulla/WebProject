import AdminOverview from "../components/AdminOverview";
import AdminUsers from "../components/AdminUsers"
import AdminReports from "../components/AdminReports";
import AdminReviews from "../components/AdminReviews";
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
    {tab === "overview" && <AdminOverview />}
    {tab === "users" && <AdminUsers />}
    {tab === "reviews" && <AdminReviews />}
    {tab === "reports" && <AdminReports />}
        </div>
    )
}

export default AdminDashboard;