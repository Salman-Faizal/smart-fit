import { Link } from "react-router-dom";

function Home() {
  return (
    <div>
      <h1 className="text-blue-500 font-bold text-4xl">Welcome!</h1>
      <Link to="/login">Go to Login</Link>
    </div>
  );
}

export default Home;
