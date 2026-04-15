import { useEffect, useRef, useState } from "react";
import { api } from "../../lib/api";
import { useAuth } from "../../hooks/useAuth";
import { Camera, X } from "lucide-react";

function getInitials(name) {
  if (!name) return "A";
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

export default function AdminProfilePage() {
  const { user, updateUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ msg: "", type: "success" });
  const avatarRef = useRef(null);

  // Profile form
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);

  // Password form
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState("");

  // Utility buttons
  const [trendingLoading, setTrendingLoading] = useState(false);
  const [cacheLoading, setCacheLoading] = useState(false);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg: "", type: "success" }), 3500);
  };

  useEffect(() => {
    api.getAdminProfile().then((data) => {
      setProfile(data.profile);
      setName(data.profile.name || "");
      setPhone(data.profile.phone || "");
    }).catch(() => {
      setName(user?.name || "");
    }).finally(() => setLoading(false));
  }, [user?.name]);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const data = await api.updateAdminProfile({ name: name.trim(), phone: phone.trim() });
      setProfile((p) => ({ ...p, ...data.profile }));
      if (updateUser) updateUser({ ...user, name: data.profile.name });
      showToast("Profile updated successfully");
    } catch (err) {
      showToast(err.message || "Failed to update profile", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwError("");
    if (newPw !== confirmPw) { setPwError("New passwords do not match"); return; }
    if (newPw.length < 6) { setPwError("Password must be at least 6 characters"); return; }
    setPwSaving(true);
    try {
      await api.changeAdminPassword({ currentPassword: currentPw, newPassword: newPw, confirmPassword: confirmPw });
      setCurrentPw(""); setNewPw(""); setConfirmPw("");
      showToast("Password changed successfully");
    } catch (err) {
      setPwError(err.message || "Failed to change password");
    } finally {
      setPwSaving(false);
    }
  };

  const handleAvatarChange = async (file) => {
    if (!file) return;
    const formData = new FormData();
    formData.append("avatar", file);
    try {
      const data = await api.uploadAdminAvatar(formData);
      setProfile((p) => ({ ...p, avatar: data.avatar }));
      if (updateUser) updateUser({ ...user, avatar: data.avatar });
      showToast("Avatar updated");
    } catch (err) {
      showToast(err.message || "Upload failed", "error");
    }
  };

  const handleRecalcTrending = async () => {
    setTrendingLoading(true);
    try {
      await api.recalculateTrending();
      showToast("Trending scores recalculated");
    } catch (err) {
      showToast(err.message || "Failed", "error");
    } finally {
      setTrendingLoading(false);
    }
  };

  const handleClearCache = async () => {
    setCacheLoading(true);
    try {
      await api.clearRecommendationCache();
      showToast("Recommendation cache cleared");
    } catch (err) {
      showToast(err.message || "Failed", "error");
    } finally {
      setCacheLoading(false);
    }
  };

  if (loading) return <div className="py-10 text-center text-sm text-slate-400">Loading profile...</div>;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Avatar Card */}
      <div className="flex items-center gap-5 rounded-2xl bg-white p-6 shadow-sm">
        <div className="relative">
          {profile?.avatar?.url ? (
            <img src={profile.avatar.url} alt="" className="h-20 w-20 rounded-full object-cover" />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-amber-600 text-2xl font-bold text-white">
              {getInitials(profile?.name || user?.name)}
            </div>
          )}
          <button
            type="button"
            onClick={() => avatarRef.current?.click()}
            className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-amber-600 text-white shadow"
          >
            <Camera className="h-3.5 w-3.5" />
          </button>
          <input ref={avatarRef} type="file" accept="image/*" className="hidden"
            onChange={(e) => handleAvatarChange(e.target.files[0])} />
        </div>
        <div>
          <p className="text-lg font-semibold text-slate-900">{profile?.name || "Admin"}</p>
          <p className="text-sm text-slate-500">{profile?.email}</p>
          <span className="mt-1 inline-block rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
            Administrator
          </span>
        </div>
      </div>

      {/* Profile Form */}
      <form onSubmit={handleSaveProfile} className="rounded-2xl bg-white p-6 shadow-sm space-y-4">
        <h2 className="text-base font-semibold text-slate-900">Personal Information</h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Full Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} required
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Phone</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Email</label>
            <input value={profile?.email || ""} readOnly
              className="w-full rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5 text-sm text-slate-500 cursor-not-allowed" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Role</label>
            <input value="Administrator" readOnly
              className="w-full rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5 text-sm text-slate-500 cursor-not-allowed" />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Account Created</label>
            <input value={profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : "—"} readOnly
              className="w-full rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5 text-sm text-slate-500 cursor-not-allowed" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Last Login</label>
            <input value={profile?.lastLogin ? new Date(profile.lastLogin).toLocaleString() : "—"} readOnly
              className="w-full rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5 text-sm text-slate-500 cursor-not-allowed" />
          </div>
        </div>

        <div className="flex justify-end">
          <button type="submit" disabled={saving}
            className="rounded-xl bg-amber-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50 hover:bg-amber-700">
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>

      {/* Change Password */}
      <form onSubmit={handleChangePassword} className="rounded-2xl bg-white p-6 shadow-sm space-y-4">
        <h2 className="text-base font-semibold text-slate-900">Change Password</h2>

        <div className="space-y-3">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Current Password</label>
            <input type="password" value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} required
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">New Password</label>
              <input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} required minLength={6}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Confirm New Password</label>
              <input type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} required
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
            </div>
          </div>
        </div>

        {pwError && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{pwError}</p>}

        <div className="flex justify-end">
          <button type="submit" disabled={pwSaving}
            className="rounded-xl bg-amber-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50 hover:bg-amber-700">
            {pwSaving ? "Changing..." : "Change Password"}
          </button>
        </div>
      </form>

      {/* Admin Utilities */}
      <div className="rounded-2xl bg-white p-6 shadow-sm space-y-4">
        <h2 className="text-base font-semibold text-slate-900">Admin Utilities</h2>
        <p className="text-sm text-slate-500">Maintenance tools for recommendation engine and data.</p>
        <div className="flex flex-wrap gap-3">
          <button type="button" disabled={trendingLoading} onClick={handleRecalcTrending}
            className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-700 disabled:opacity-50 hover:bg-amber-100 transition">
            {trendingLoading ? "Recalculating..." : "Recalculate Trending Scores"}
          </button>
          <button type="button" disabled={cacheLoading} onClick={handleClearCache}
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 disabled:opacity-50 hover:bg-slate-50 transition">
            {cacheLoading ? "Clearing..." : "Clear Recommendation Cache"}
          </button>
        </div>
      </div>

      {/* Toast */}
      {toast.msg && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl px-5 py-3 text-sm font-medium text-white shadow-lg ${
          toast.type === "error" ? "bg-red-700" : "bg-slate-900"
        }`}>
          {toast.msg}
          <button type="button" onClick={() => setToast({ msg: "" })}><X className="h-4 w-4" /></button>
        </div>
      )}
    </div>
  );
}
