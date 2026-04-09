import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../lib/api";

const DEFAULT_PAYHERE_URL = "https://sandbox.payhere.lk/pay/checkout";

const submitPayHereForm = (payload) => {
  const checkoutUrl = payload?.checkout_url || DEFAULT_PAYHERE_URL;
  const form = document.createElement("form");
  form.method = "POST";
  form.action = checkoutUrl;
  form.style.display = "none";

  Object.entries(payload || {}).forEach(([key, value]) => {
    if (key === "checkout_url") return;
    if (value === undefined || value === null) return;
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = key;
    input.value = String(value);
    form.appendChild(input);
  });

  document.body.appendChild(form);
  form.submit();
};

export default function CheckoutPage() {
  const [cart, setCart] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState("PAYHERE");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [manualOrderId, setManualOrderId] = useState("");

  const loadData = async () => {
    try {
      setError("");
      const cartData = await api.getCart();
      setCart(cartData.cart);
    } catch (err) {
      setError(err.message || "Failed to load cart details");
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const cartTotal = useMemo(
    () => Number(cart?.totalPrice || 0).toFixed(2),
    [cart],
  );

  const updateItemQuantity = async (itemId, currentQty, delta) => {
    const nextQty = currentQty + delta;
    if (nextQty < 1) return;

    try {
      setError("");
      await api.updateCartItem(itemId, nextQty);
      await loadData();
    } catch (err) {
      setError(err.message || "Failed to update quantity");
    }
  };

  const removeItem = async (itemId) => {
    try {
      setError("");
      await api.removeCartItem(itemId);
      await loadData();
    } catch (err) {
      setError(err.message || "Failed to remove item");
    }
  };

  const handlePlaceOrder = async () => {
    try {
      setLoading(true);
      setError("");
      setMessage("");
      setManualOrderId("");

      const checkoutData = await api.checkoutOrder(paymentMethod);
      const order = checkoutData.order;

      if (paymentMethod === "PAYHERE") {
        const payloadData = await api.createPayHereCheckout(order._id);
        submitPayHereForm(payloadData.payload);
        return;
      }

      setManualOrderId(order._id);
      setMessage("Manual order placed. Upload your payment slip to continue.");
      await loadData();
    } catch (err) {
      setError(err.message || "Checkout failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="space-y-6">
      <header>
        <h2 className="text-2xl font-bold text-slate-900">Your Cart</h2>
        <p className="text-sm text-slate-500">
          Review items, choose payment, and complete checkout in one flow.
        </p>
      </header>

      {error ? (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>
      ) : null}

      {message ? (
        <div className="rounded-lg bg-green-50 p-3 text-sm text-green-700">
          <p>{message}</p>
          {manualOrderId ? (
            <Link
              to={`/payments/slip?orderId=${manualOrderId}`}
              className="mt-2 inline-block font-semibold underline"
            >
              Upload manual payment slip
            </Link>
          ) : null}
        </div>
      ) : null}

      <article className="rounded-2xl bg-white p-6 shadow-sm">
        {!cart?.items?.length ? (
          <div className="space-y-3">
            <p className="text-sm text-slate-500">Your cart is empty.</p>
            <Link
              to="/home"
              className="inline-block rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white"
            >
              Continue Shopping
            </Link>
          </div>
        ) : (
          <>
            <ul className="space-y-3">
              {cart.items.map((item) => (
                <li
                  key={item._id}
                  className="flex flex-col gap-3 rounded-lg border border-slate-200 p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-semibold text-slate-800">
                      {item.product?.name}
                    </p>
                    <p className="text-sm text-slate-500">${item.price} each</p>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="inline-flex items-center overflow-hidden rounded-md border border-slate-300">
                      <button
                        type="button"
                        onClick={() =>
                          updateItemQuantity(item._id, item.quantity, -1)
                        }
                        className="flex h-9 w-9 items-center justify-center border-r border-slate-300 text-lg text-slate-700 hover:bg-slate-100"
                      >
                        −
                      </button>
                      <span className="flex h-9 min-w-10 items-center justify-center px-2 text-sm font-semibold text-slate-800">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          updateItemQuantity(item._id, item.quantity, 1)
                        }
                        className="flex h-9 w-9 items-center justify-center border-l border-slate-300 text-lg text-slate-700 hover:bg-slate-100"
                      >
                        +
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeItem(item._id)}
                      className="rounded-md border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50"
                    >
                      Remove
                    </button>
                  </div>
                </li>
              ))}
            </ul>

            <p className="mt-4 text-sm font-semibold text-slate-800">
              Total: ${cartTotal}
            </p>

            <div className="mt-4 space-y-3">
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="radio"
                  name="paymentMethod"
                  value="PAYHERE"
                  checked={paymentMethod === "PAYHERE"}
                  onChange={() => setPaymentMethod("PAYHERE")}
                />
                PayHere (Online)
              </label>

              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="radio"
                  name="paymentMethod"
                  value="MANUAL"
                  checked={paymentMethod === "MANUAL"}
                  onChange={() => setPaymentMethod("MANUAL")}
                />
                Manual Payment (Upload Slip)
              </label>
            </div>

            <button
              type="button"
              onClick={handlePlaceOrder}
              disabled={loading}
              className="mt-4 rounded-lg bg-amber-600 px-5 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-60"
            >
              {loading ? "Processing..." : "Place Order"}
            </button>
          </>
        )}
      </article>
    </section>
  );
}
