import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { X } from "lucide-react";

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ msg: "", type: "success" });

  // Form state
  const [storeName, setStoreName] = useState("");
  const [storeTagline, setStoreTagline] = useState("");
  const [freeDelivery, setFreeDelivery] = useState("");
  const [deliveryFee, setDeliveryFee] = useState("");
  const [lowStock, setLowStock] = useState("");
  const [monthlyTarget, setMonthlyTarget] = useState("");

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg: "" }), 3500);
  };

  useEffect(() => {
    api.getAdminSettings().then((data) => {
      const s = data.settings || {};
      setSettings(s);
      setStoreName(s.storeName || "Smart Fit");
      setStoreTagline(s.storeTagline || "Premium Menswear");
      setFreeDelivery(s.freeDeliveryThreshold ?? 5000);
      setDeliveryFee(s.deliveryFee ?? 350);
      setLowStock(s.lowStockThreshold ?? 10);
      setMonthlyTarget(s.monthlyTarget ?? 500000);
    }).catch(() => {
      showToast("Failed to load settings", "error");
    }).finally(() => setLoading(false));
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.updateAdminSettings({
        storeName: storeName.trim(),
        storeTagline: storeTagline.trim(),
        freeDeliveryThreshold: Number(freeDelivery),
        deliveryFee: Number(deliveryFee),
        lowStockThreshold: Number(lowStock),
        monthlyTarget: Number(monthlyTarget),
      });
      showToast("Settings saved successfully");
    } catch (err) {
      showToast(err.message || "Failed to save settings", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="py-10 text-center text-sm text-slate-400">Loading settings...</div>;

  return (
    <form onSubmit={handleSave} className="mx-auto max-w-2xl space-y-6">
      {/* Store Settings */}
      <Section title="Store Settings" description="General information about your store.">
        <div className="space-y-4">
          <Field label="Store Name">
            <input value={storeName} onChange={(e) => setStoreName(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
          </Field>
          <Field label="Store Tagline">
            <input value={storeTagline} onChange={(e) => setStoreTagline(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
          </Field>
          <Field label="Currency">
            <input value="LKR — Sri Lankan Rupee" readOnly
              className="w-full rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5 text-sm text-slate-500 cursor-not-allowed" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Free Delivery Threshold (LKR)">
              <div className="flex items-center overflow-hidden rounded-xl border border-slate-200 focus-within:ring-2 focus-within:ring-amber-500">
                <span className="border-r border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-500">LKR</span>
                <input type="number" min="0" value={freeDelivery} onChange={(e) => setFreeDelivery(e.target.value)}
                  className="flex-1 px-3 py-2.5 text-sm focus:outline-none" />
              </div>
            </Field>
            <Field label="Standard Delivery Fee (LKR)">
              <div className="flex items-center overflow-hidden rounded-xl border border-slate-200 focus-within:ring-2 focus-within:ring-amber-500">
                <span className="border-r border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-500">LKR</span>
                <input type="number" min="0" value={deliveryFee} onChange={(e) => setDeliveryFee(e.target.value)}
                  className="flex-1 px-3 py-2.5 text-sm focus:outline-none" />
              </div>
            </Field>
          </div>
        </div>
      </Section>

      {/* Order Settings */}
      <Section title="Order Settings" description="Thresholds that affect dashboard and order processing.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Low Stock Threshold" hint="Products with stock below this appear in alerts">
            <input type="number" min="1" value={lowStock} onChange={(e) => setLowStock(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
          </Field>
          <Field label="Monthly Revenue Target (LKR)" hint="Used in dashboard monthly target widget">
            <div className="flex items-center overflow-hidden rounded-xl border border-slate-200 focus-within:ring-2 focus-within:ring-amber-500">
              <span className="border-r border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-500">LKR</span>
              <input type="number" min="0" value={monthlyTarget} onChange={(e) => setMonthlyTarget(e.target.value)}
                className="flex-1 px-3 py-2.5 text-sm focus:outline-none" />
            </div>
          </Field>
        </div>
      </Section>

      {/* Appearance */}
      <Section title="Appearance" description="Visual theme and branding settings.">
        <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
          <p className="text-sm text-slate-500">Theme is managed by the development team. Contact your developer to update colours, fonts, or layout settings.</p>
        </div>
      </Section>

      {/* Save */}
      <div className="flex justify-end">
        <button type="submit" disabled={saving}
          className="rounded-xl bg-amber-600 px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-50 hover:bg-amber-700">
          {saving ? "Saving..." : "Save Settings"}
        </button>
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
    </form>
  );
}

function Section({ title, description, children }) {
  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm">
      <div className="mb-5">
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
        {description && <p className="mt-0.5 text-sm text-slate-500">{description}</p>}
      </div>
      {children}
    </div>
  );
}

function Field({ label, hint, children }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-slate-700">{label}</label>
      {children}
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}
