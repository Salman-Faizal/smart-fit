import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../../lib/api";

export default function CheckoutPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [cart, setCart] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState("STRIPE");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [manualOrderId, setManualOrderId] = useState("");
  const [manualSlipFile, setManualSlipFile] = useState(null);
  const [uploadingSlip, setUploadingSlip] = useState(false);

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

  useEffect(() => {
    const orderId = searchParams.get("order_id");
    const paymentState = searchParams.get("payment");

    if (!orderId || !paymentState) {
      return;
    }

    const syncPaymentState = async () => {
      try {
        setLoading(true);
        setError("");
        setMessage("");

        if (paymentState === "cancel") {
          await api.cancelStripeOrder(orderId);
          setMessage(
            "Payment was cancelled. Your order was cancelled, and your cart is unchanged so you can retry anytime.",
          );
        } else if (paymentState === "success") {
          const { order } = await api.getOrderById(orderId);
          if (order.paymentStatus === "PAID" || order.status === "PAID") {
            setMessage("Payment completed successfully.");
            await loadData();
          } else {
            setMessage(
              "Payment was submitted. We are verifying it now. Please refresh in a moment if status is still pending.",
            );
          }
        } else if (paymentState === "failed") {
          await api.cancelStripeOrder(orderId);
          setError(
            "Payment failed. The order is cancelled and your cart is unchanged.",
          );
        }
      } catch (err) {
        setError(err.message || "Failed to verify payment status");
      } finally {
        setSearchParams({}, { replace: true });
        setLoading(false);
      }
    };

    syncPaymentState();
  }, [searchParams, setSearchParams]);

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
      setManualSlipFile(null);

      const checkoutData = await api.checkoutOrder(paymentMethod);
      const order = checkoutData.order;

      if (paymentMethod === "STRIPE") {
        const sessionData = await api.createStripeCheckoutSession(order._id);

        if (!sessionData.checkoutUrl) {
          throw new Error("Stripe checkout URL is missing.");
        }

        window.location.assign(sessionData.checkoutUrl);
        return;
      }

      setManualOrderId(order._id);
      setMessage("Order created. Upload your payment slip below.");
    } catch (err) {
      setError(err.message || "Checkout failed");
    } finally {
      setLoading(false);
    }
  };

  const handleUploadManualSlip = async () => {
    if (!manualOrderId || !manualSlipFile) {
      setError("Please choose a payment slip file before uploading.");
      return;
    }

    try {
      setUploadingSlip(true);
      setError("");
      const formData = new FormData();
      formData.append("paymentSlip", manualSlipFile);
      await api.uploadPaymentSlip(manualOrderId, formData);
      setMessage(
        "Payment slip uploaded successfully. We will review and confirm your payment.",
      );
      setManualSlipFile(null);
    } catch (err) {
      setError(err.message || "Failed to upload payment slip");
    } finally {
      setUploadingSlip(false);
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
                  value="STRIPE"
                  checked={paymentMethod === "STRIPE"}
                  onChange={() => setPaymentMethod("STRIPE")}
                />
                Online Payment (Stripe)
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

            {manualOrderId ? (
              <div className="mt-4 space-y-3 rounded-lg border border-slate-200 p-3">
                <p className="text-xs text-slate-600">
                  Manual order ID: {manualOrderId}
                </p>
                <label className="block text-sm font-medium text-slate-700">
                  Payment slip
                  <input
                    type="file"
                    accept="image/*,.pdf,application/pdf"
                    onChange={(event) =>
                      setManualSlipFile(event.target.files?.[0] || null)
                    }
                    className="mt-2 block w-full rounded-lg border border-slate-300 p-2 text-sm"
                  />
                </label>
                <button
                  type="button"
                  onClick={handleUploadManualSlip}
                  disabled={uploadingSlip}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-60"
                >
                  {uploadingSlip ? "Uploading..." : "Upload Slip"}
                </button>
              </div>
            ) : null}
          </>
        )}
      </article>
    </section>
  );
}
