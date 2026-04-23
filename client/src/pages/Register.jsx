import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import logo from "../assets/logo-icon.png";
import { api } from "../lib/api";

const OTP_RESEND_COOLDOWN = 60;
const EMPTY_OTP = ["", "", "", "", "", ""];

// ─── OTP input — 6 individual boxes ──────────────────────────────────────────

const OtpInput = forwardRef(function OtpInput({ otp, onChange }, ref) {
  const inputs = useRef([]);

  useImperativeHandle(ref, () => ({
    focusFirst: () => inputs.current[0]?.focus(),
  }));

  useEffect(() => {
    inputs.current[0]?.focus();
  }, []);

  const handleChange = (e, idx) => {
    const digit = e.target.value.replace(/\D/g, "").slice(-1);
    if (!digit) return;
    const next = [...otp];
    next[idx] = digit;
    onChange(next);
    if (idx < 5) inputs.current[idx + 1]?.focus();
  };

  const handleKeyDown = (e, idx) => {
    if (e.key !== "Backspace") return;
    e.preventDefault();
    if (otp[idx]) {
      const next = [...otp];
      next[idx] = "";
      onChange(next);
    } else if (idx > 0) {
      const next = [...otp];
      next[idx - 1] = "";
      onChange(next);
      inputs.current[idx - 1]?.focus();
    }
  };

  const handleFocus = (e) => e.target.select();

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    const next = [...EMPTY_OTP];
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i];
    onChange(next);
    inputs.current[Math.min(pasted.length, 5)]?.focus();
  };

  return (
    <div className="flex justify-center gap-3">
      {otp.map((digit, idx) => (
        <input
          key={idx}
          ref={(el) => (inputs.current[idx] = el)}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digit}
          onChange={(e) => handleChange(e, idx)}
          onKeyDown={(e) => handleKeyDown(e, idx)}
          onFocus={handleFocus}
          onPaste={handlePaste}
          className="h-12 w-10 rounded-lg border-2 border-gray-300 text-center text-xl font-bold text-gray-800 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200 transition"
        />
      ))}
    </div>
  );
});

// ─── Resend countdown ─────────────────────────────────────────────────────────

function ResendButton({ email, onResent }) {
  const [seconds, setSeconds] = useState(OTP_RESEND_COOLDOWN);
  const [resending, setResending] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (seconds <= 0) return;
    const id = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [seconds]);

  const handleResend = async () => {
    if (seconds > 0 || resending) return;
    setResending(true);
    setMsg("");
    try {
      await api.resendOtp(email);
      setSeconds(OTP_RESEND_COOLDOWN);
      setMsg("A new code has been sent.");
      onResent?.();
    } catch (err) {
      setMsg(err.message || "Failed to resend. Try again.");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="text-center space-y-1">
      {msg && <p className="text-xs text-green-600">{msg}</p>}
      {seconds > 0 ? (
        <p className="text-sm text-gray-500">
          Resend in <span className="font-semibold text-amber-600">{seconds}s</span>
        </p>
      ) : (
        <button
          type="button"
          onClick={handleResend}
          disabled={resending}
          className="text-sm text-amber-600 hover:underline font-medium disabled:opacity-60"
        >
          {resending ? "Sending…" : "Didn't receive it? Resend code"}
        </button>
      )}
    </div>
  );
}

// ─── Main Register page ───────────────────────────────────────────────────────

export default function Register() {
  const { loginWithData } = useAuth();
  const navigate = useNavigate();

  // Step 1: form state
  const [form, setForm] = useState({ name: "", email: "", password: "", confirmPassword: "" });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState("");

  // Step 2: OTP state
  const [step, setStep] = useState(1);
  const [registeredEmail, setRegisteredEmail] = useState("");
  const [otp, setOtp] = useState([...EMPTY_OTP]);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState("");
  const otpRef = useRef(null);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const validate = () => {
    if (!form.name.trim() || !form.email.trim() || !form.password || !form.confirmPassword) {
      return "All fields are required.";
    }
    if (!/^[\w\.-]+@[\w\.-]+\.\w{2,}$/.test(form.email)) {
      return "Please enter a valid email address.";
    }
    if (form.password.length < 8) {
      return "Password must be at least 8 characters.";
    }
    if (form.password !== form.confirmPassword) {
      return "Passwords do not match.";
    }
    return null;
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setFormError("");
    const err = validate();
    if (err) { setFormError(err); return; }

    try {
      setFormLoading(true);
      await api.register({ name: form.name, email: form.email, password: form.password });
      setRegisteredEmail(form.email);
      setStep(2);
    } catch (err) {
      setFormError(err.message || "Registration failed. Please try again.");
    } finally {
      setFormLoading(false);
    }
  };

  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    if (!otp.every((d) => d !== "")) return;
    setOtpError("");
    setOtpLoading(true);
    try {
      const data = await api.verifyOtp(registeredEmail, otp.join(""));
      loginWithData({ token: data.token, user: data.user });
      navigate("/home", { replace: true });
    } catch (err) {
      setOtpError(err.message || "Verification failed. Please try again.");
      setOtp([...EMPTY_OTP]);
      otpRef.current?.focusFirst();
    } finally {
      setOtpLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex justify-center items-center bg-grey-100">
      <section className="w-full max-w-md bg-white rounded-xl shadow-lg p-8">
        <div className="min-w-full flex justify-center items-center mb-8">
          <img src={logo} alt="smartfit-logo" className="w-24 rounded-full" />
        </div>

        {step === 1 ? (
          <>
            <h1 className="text-2xl font-bold text-center text-gray-800 mb-6">
              Join <span className="text-amber-600">Smart Fit</span>
            </h1>
            <form className="space-y-5" onSubmit={handleRegisterSubmit}>
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  Full Name
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  required
                  value={form.name}
                  onChange={handleChange}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:border-amber-500 focus:ring focus:ring-amber-200 focus:ring-opacity-50"
                  placeholder="Your full name"
                />
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={form.email}
                  onChange={handleChange}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:border-amber-500 focus:ring focus:ring-amber-200 focus:ring-opacity-50"
                  placeholder="you@example.com"
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={form.password}
                  onChange={handleChange}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:border-amber-500 focus:ring focus:ring-amber-200 focus:ring-opacity-50"
                  placeholder="Min 8 characters"
                />
              </div>
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={form.confirmPassword}
                  onChange={handleChange}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:border-amber-500 focus:ring focus:ring-amber-200 focus:ring-opacity-50"
                  placeholder="Repeat your password"
                />
              </div>
              {formError && (
                <p className="rounded-lg bg-red-100 px-3 py-2 text-sm text-red-700">{formError}</p>
              )}
              <button
                type="submit"
                disabled={formLoading}
                className="w-full bg-amber-600 text-white py-2 rounded-md font-semibold hover:bg-amber-700 transition border-none"
              >
                {formLoading ? "Creating account…" : "Create Account"}
              </button>
            </form>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-center text-gray-800 mb-2">
              Check your inbox
            </h1>
            <p className="text-center text-sm text-gray-500 mb-6">
              We sent a 6-digit code to <span className="font-semibold text-gray-700">{registeredEmail}</span>
            </p>

            <form onSubmit={handleOtpSubmit} className="space-y-5">
              <OtpInput
                ref={otpRef}
                otp={otp}
                onChange={(next) => { setOtp(next); setOtpError(""); }}
              />

              {otpError && (
                <p className="rounded-lg bg-red-100 px-3 py-2 text-sm text-red-700 text-center">{otpError}</p>
              )}

              <button
                type="submit"
                disabled={!otp.every((d) => d !== "") || otpLoading}
                className="w-full bg-amber-600 text-white py-2 rounded-md font-semibold hover:bg-amber-700 transition border-none disabled:opacity-50"
              >
                {otpLoading ? "Verifying…" : "Verify"}
              </button>

              <ResendButton
                email={registeredEmail}
                onResent={() => { setOtp([...EMPTY_OTP]); otpRef.current?.focusFirst(); }}
              />
            </form>
          </>
        )}

        <p className="mt-8 text-center text-sm text-gray-600">
          Already have an account?{" "}
          <Link to="/signin" className="text-amber-600 hover:underline font-medium">
            Sign in
          </Link>
        </p>
      </section>
    </main>
  );
}
