import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import logo from "../assets/logo-icon.png";

const roleHome = (role) => (role === "admin" ? "/admin/dashboard" : "/home");

export default function SignIn() {
  const { isAuthenticated, user, login } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (isAuthenticated) {
    return <Navigate to={roleHome(user?.role)} replace />;
  }

  const from = location.state?.from?.pathname;

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      setLoading(true);
      setError("");
      const nextUser = await login(email, password);
      navigate(from || roleHome(nextUser?.role), { replace: true });
    } catch (err) {
      setError(err.message || "Unable to sign in. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex justify-center items-center bg-grey-100">
      <section className="w-full max-w-md bg-white rounded-xl shadow-lg p-8">
        <div className="min-w-full flex justify-center items-center mb-8">
          <img src={logo} alt="smartfit-logo" className="w-24 rounded-full" />
        </div>
        <h1 className="text-2xl font-bold text-center text-gray-800 mb-6">
          SignIn to <span className="text-amber-600">Smart Fit</span>
        </h1>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:border-amber-500 focus:ring focus:ring-amber-200 focus:ring-opacity-50"
              placeholder="you@example.com"
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
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:border-amber-500 focus:ring focus:ring-amber-200 focus:ring-opacity-50"
              placeholder="••••••••"
            />
          </div>

          {error ? (
            <p className="rounded-lg bg-red-100 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-amber-600 text-white py-2 rounded-md font-semibold hover:bg-amber-700 transition border-none"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-gray-600">
          Don’t have an account?{" "}
          <a
            href="/register"
            className="text-amber-600 hover:underline font-medium"
          >
            Sign up
          </a>
        </p>
      </section>
    </main>
  );
}
