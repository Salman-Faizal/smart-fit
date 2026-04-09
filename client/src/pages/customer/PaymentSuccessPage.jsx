import { Link, useSearchParams } from "react-router-dom";

export default function PaymentSuccessPage() {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get("order_id") || "";

  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm">
      <h2 className="text-2xl font-bold text-green-700">Payment Submitted</h2>
      <p className="mt-2 text-sm text-slate-600">
        PayHere redirected you successfully. Final payment status is confirmed
        by backend callback.
      </p>
      {orderId ? (
        <p className="mt-3 text-sm text-slate-700">Order ID: {orderId}</p>
      ) : null}
      <Link
        to="/checkout"
        className="mt-4 inline-block rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white"
      >
        Back to Checkout
      </Link>
    </section>
  );
}
