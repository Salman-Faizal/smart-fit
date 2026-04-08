import { useState } from "react";
import { api } from "../../lib/api";

export default function PaymentSlipUploadPage() {
  const [orderId, setOrderId] = useState("");
  const [file, setFile] = useState(null);
  const [slipUrl, setSlipUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!orderId || !file) {
      setError("Order ID and payment slip file are required");
      return;
    }

    try {
      setLoading(true);
      setError("");
      const formData = new FormData();
      formData.append("paymentSlip", file);

      const data = await api.uploadPaymentSlip(orderId, formData);
      setSlipUrl(data?.order?.paymentSlipUrl || "");
    } catch (err) {
      setError(err.message || "Failed to upload payment slip");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-bold text-slate-900">Upload Payment Slip</h2>
      <p className="text-sm text-slate-500">
        Upload manual payment proof (image or PDF). Admins can review this link
        later.
      </p>

      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-2xl bg-white p-6 shadow-sm"
      >
        <label className="block text-sm font-medium text-slate-700">
          Order ID
          <input
            type="text"
            value={orderId}
            onChange={(event) => setOrderId(event.target.value)}
            className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
          />
        </label>

        <label className="block text-sm font-medium text-slate-700">
          Payment slip file
          <input
            type="file"
            accept="image/*,.pdf,application/pdf"
            onChange={(event) => setFile(event.target.files?.[0] || null)}
            className="mt-2 block w-full rounded-lg border border-slate-300 p-2 text-sm"
          />
        </label>

        {error ? (
          <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
            {error}
          </p>
        ) : null}

        {slipUrl ? (
          <p className="rounded-lg bg-green-50 p-3 text-sm text-green-700">
            Uploaded. View file:{" "}
            <a
              href={slipUrl}
              target="_blank"
              rel="noreferrer"
              className="font-semibold underline"
            >
              Open payment proof
            </a>
          </p>
        ) : null}

        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-amber-600 px-5 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-60"
        >
          {loading ? "Uploading..." : "Upload Slip"}
        </button>
      </form>
    </section>
  );
}
