import { Link } from "react-router-dom";

function Home() {
  return (
    <div className="home-page">
      <div className="hero-card">
        <h1>75Check</h1>
        <p>Smart Attendance & Bunk Calculator</p>

        <div className="hero-buttons">
          <Link to="/login" className="btn">
            Login
          </Link>

          <Link to="/register" className="btn btn-outline">
            Register
          </Link>
        </div>
      </div>
    </div>
  );
}

export default Home;