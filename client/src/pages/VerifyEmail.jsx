import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../lib/api";

const STATE = { LOADING: "loading", SUCCESS: "success", ERROR: "error", RESEND: "resend" };

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const [state, setState] = useState(STATE.LOADING);
  const [resendEmail, setResendEmail] = useState("");
  const [resendStatus, setResendStatus] = useState("");
  const [resendLoading, setResendLoading] = useState(false);

  useEffect(() => {
    const token = searchParams.get("token");
    if (!token) {
      setState(STATE.ERROR);
      return;
    }

    api.verifyEmail(token)
      .then(() => setState(STATE.SUCCESS))
      .catch(() => setState(STATE.ERROR));
  }, [searchParams]);

  const handleResend = async (e) => {
    e.preventDefault();
    if (!resendEmail.trim()) return;
    setResendLoading(true);
    setResendStatus("");
    try {
      await api.resendVerification(resendEmail.trim());
      setResendStatus("If this email is registered and unverified, a new link has been sent.");
    } catch (_err) {
      setResendStatus("Something went wrong. Please try again.");
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex justify-center items-center bg-gray-100 px-4">
      <section className="w-full max-w-md bg-white rounded-xl shadow-lg p-10 text-center">
        {state === STATE.LOADING && (
          <div className="space-y-4">
            <div className="mx-auto h-14 w-14 animate-spin rounded-full border-4 border-amber-200 border-t-amber-600" />
            <p className="text-gray-500 text-sm">Verifying your email…</p>
          </div>
        )}

        {state === STATE.SUCCESS && (
          <div className="space-y-5">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-gray-800">Email verified!</h1>
            <p className="text-sm text-gray-500">Your Smart Fit account is now active. You can sign in and start shopping.</p>
            <Link
              to="/signin"
              className="inline-block rounded-md bg-amber-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-amber-700 transition"
            >
              Login now
            </Link>
          </div>
        )}

        {state === STATE.ERROR && (
          <div className="space-y-5">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
              <svg className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-gray-800">Link invalid or expired</h1>
            <p className="text-sm text-gray-500">This verification link has expired or is no longer valid. Request a new one below.</p>

            {resendStatus ? (
              <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">{resendStatus}</p>
            ) : (
              <form onSubmit={handleResend} className="space-y-3 text-left">
                <label className="block text-sm font-medium text-gray-700">
                  Your email address
                </label>
                <input
                  type="email"
                  required
                  value={resendEmail}
                  onChange={(e) => setResendEmail(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-amber-500 focus:ring focus:ring-amber-200 focus:ring-opacity-50"
                  placeholder="you@example.com"
                />
                <button
                  type="submit"
                  disabled={resendLoading}
                  className="w-full rounded-md bg-amber-600 py-2 text-sm font-semibold text-white hover:bg-amber-700 transition disabled:opacity-60"
                >
                  {resendLoading ? "Sending…" : "Resend verification email"}
                </button>
              </form>
            )}
          </div>
        )}
      </section>
    </main>
  );
}
