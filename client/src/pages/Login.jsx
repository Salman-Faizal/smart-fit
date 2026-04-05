import { useState } from "react";
import logo from "../assets/monogram-logo.png";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log(email, password);
  };

  return (
    <div className="min-h-screen flex justify-center items-center bg-grey-100">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8">
        <div className="min-w-full flex justify-center items-center mb-8">
          <img src={logo} alt="smartfit-logo" className="w-24 rounded-xl" />
        </div>

        <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">
          Login to <span className="text-amber-600">Smart Fit</span>
        </h2>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700"
            >
              Email Address
            </label>
            <input
              onChange={(e) => setEmail(e.target.value)}
              value={email}
              type="email"
              id="email"
              placeholder="you@example.com"
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:border-amber-500 focus:ring focus:ring-amber-200 focus:ring-opacity-50"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700"
            >
              Password
            </label>
            <input
              onChange={(e) => setPassword(e.target.value)}
              value={password}
              type="password"
              id="password"
              placeholder="••••••••"
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:border-amber-500 focus:ring focus:ring-amber-200 focus:ring-opacity-50"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-amber-600 text-white py-2 rounded-md font-semibold hover:bg-amber-700 transition border-none"
          >
            Login
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-gray-600">
          Don’t have an account?{" "}
          <a
            href="/signup"
            className="text-amber-600 hover:underline font-medium"
          >
            Sign up
          </a>
        </p>
      </div>
    </div>
  );
}

export default Login;
