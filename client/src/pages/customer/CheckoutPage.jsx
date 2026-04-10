import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../../lib/api";

const STEPS = [
  { label: "Cart", key: "cart" },
  { label: "Payment", key: "payment" },
  { label: "Confirmation", key: "confirmation" },
];

function CheckoutResult({ result, onRetryStripe }) {
  const isSuccess = result.type === "success";
  const isPending = result.type === "pending";
  const isError = result.type === "failed" || result.type === "cancelled";

  return (
    <section className="mx-auto flex min-h-[70vh] max-w-3xl items-center px-4 py-10">
      <div className="w-full rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div
          className={`mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full ${
            isSuccess
              ? "bg-emerald-50 text-emerald-600"
              : isPending
                ? "bg-amber-50 text-amber-600"
                : "bg-red-50 text-red-600"
          }`}
        >
          {isSuccess ? "✓" : isPending ? "…" : "!"}
        </div>

        <h2 className="text-center text-3xl font-bold text-slate-900">
          {result.title}
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-center text-sm leading-6 text-slate-500">
          {result.description}
        </p>

        {result.orderId && (
          <div className="mx-auto mt-6 max-w-md rounded-2xl bg-slate-50 p-4 text-center">
            <p className="text-xs uppercase tracking-wide text-slate-400">
              Order reference
            </p>
            <p className="mt-1 font-mono text-sm font-semibold text-slate-800">
              {result.orderId}
            </p>
          </div>
        )}

        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          {isSuccess ? (
            <>
              <Link
                to="/orders"
                className="rounded-xl bg-slate-900 px-5 py-3 text-center text-sm font-semibold text-white hover:bg-slate-800"
              >
                View Orders
              </Link>
              <Link
                to="/home"
                className="rounded-xl border border-slate-200 px-5 py-3 text-center text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Continue Shopping
              </Link>
            </>
          ) : isPending ? (
            <>
              <Link
                to="/orders"
                className="rounded-xl bg-slate-900 px-5 py-3 text-center text-sm font-semibold text-white hover:bg-slate-800"
              >
                Check Order Status
              </Link>
              <Link
                to="/home"
                className="rounded-xl border border-slate-200 px-5 py-3 text-center text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Continue Shopping
              </Link>
            </>
          ) : (
            <>
              {onRetryStripe && (
                <button
                  type="button"
                  onClick={onRetryStripe}
                  className="rounded-xl bg-slate-900 px-5 py-3 text-center text-sm font-semibold text-white hover:bg-slate-800"
                >
                  Retry Payment
                </button>
              )}
              <Link
                to="/checkout"
                className="rounded-xl border border-slate-200 px-5 py-3 text-center text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Back to Checkout
              </Link>
            </>
          )}
        </div>

        {isError && (
          <p className="mt-5 text-center text-xs text-slate-400">
            Your order was not completed. You can retry payment or return later.
          </p>
        )}
      </div>
    </section>
  );
}

export default function CheckoutPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [cart, setCart] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState("STRIPE");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [manualOrderId, setManualOrderId] = useState("");
  const [manualSlipFile, setManualSlipFile] = useState(null);
  const [manualSlipPreview, setManualSlipPreview] = useState("");
  const [uploadingSlip, setUploadingSlip] = useState(false);
  const [checkoutResult, setCheckoutResult] = useState(null);

  const loadData = useCallback(async () => {
    try {
      setError("");
      const cartData = await api.getCart();
      setCart(cartData.cart);
    } catch (err) {
      setError(err.message || "Failed to load cart details");
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const orderId = searchParams.get("order_id");
    const paymentState = searchParams.get("payment");

    if (!orderId || !paymentState) return;

    const syncPaymentState = async () => {
      try {
        setLoading(true);
        setError("");
        setMessage("");

        if (paymentState === "cancel") {
          await api.cancelStripeOrder(orderId);
          setCheckoutResult({
            type: "cancelled",
            title: "Payment cancelled",
            description:
              "Your Stripe checkout was cancelled. Your cart has been kept intact, so you can try again anytime.",
            orderId,
          });
        } else if (paymentState === "success") {
          const { order } = await api.getOrderById(orderId);

          if (order.paymentStatus === "PAID" || order.status === "PAID") {
            setCheckoutResult({
              type: "success",
              title: "Payment successful",
              description:
                "Your order has been confirmed. You can view it in your orders page.",
              orderId,
            });
            await loadData();
          } else {
            setCheckoutResult({
              type: "pending",
              title: "Payment submitted",
              description:
                "We are verifying your payment. You can safely leave this page and check your order status later.",
              orderId,
            });
          }
        } else if (paymentState === "failed") {
          await api.cancelStripeOrder(orderId);
          setCheckoutResult({
            type: "failed",
            title: "Payment failed",
            description:
              "The payment did not go through. Your order was cancelled and you can retry checkout.",
            orderId,
          });
        }
      } catch (err) {
        setError(err.message || "Failed to verify payment status");
      } finally {
        setSearchParams({}, { replace: true });
        setLoading(false);
      }
    };

    syncPaymentState();
  }, [searchParams, setSearchParams, loadData]);

  useEffect(() => {
    if (!manualSlipFile) {
      setManualSlipPreview("");
      return;
    }

    const objectUrl = URL.createObjectURL(manualSlipFile);
    setManualSlipPreview(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [manualSlipFile]);

  const cartTotal = useMemo(
    () => Number(cart?.totalPrice || 0).toFixed(2),
    [cart],
  );

  const itemCount = useMemo(() => {
    return (
      cart?.items?.reduce(
        (sum, item) => sum + (Number(item.quantity) || 0),
        0,
      ) || 0
    );
  }, [cart]);

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
      setCheckoutResult(null);

      const checkoutData = await api.checkoutOrder(paymentMethod);
      const order = checkoutData.order;

      if (paymentMethod === "STRIPE") {
        const sessionData = await api.createStripeCheckoutSession(order._id);
        if (!sessionData.checkoutUrl) {
          throw new Error("Stripe checkout URL missing.");
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
    if (!manualOrderId) {
      setError("Please place the manual payment order first.");
      return;
    }

    if (!manualSlipFile) {
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
        "Slip uploaded successfully. We will confirm your payment soon.",
      );
      setManualSlipFile(null);
      setManualSlipPreview("");
    } catch (err) {
      setError(err.message || "Failed to upload payment slip");
    } finally {
      setUploadingSlip(false);
    }
  };

  const handleSlipChange = (e) => {
    const file = e.target.files?.[0] || null;

    if (!file) {
      setManualSlipFile(null);
      return;
    }

    if (!file.type.startsWith("image/")) {
      setError("Please upload an image file for the payment slip.");
      e.target.value = "";
      return;
    }

    setError("");
    setManualSlipFile(file);
  };

  const handleRetryStripe = async () => {
    if (!checkoutResult?.orderId) return;

    try {
      setLoading(true);
      setError("");

      const sessionData = await api.createStripeCheckoutSession(
        checkoutResult.orderId,
      );
      if (!sessionData.checkoutUrl) {
        throw new Error("Stripe checkout URL missing.");
      }
      window.location.assign(sessionData.checkoutUrl);
    } catch (err) {
      setError(err.message || "Failed to restart Stripe checkout");
    } finally {
      setLoading(false);
    }
  };

  if (checkoutResult) {
    return (
      <CheckoutResult
        result={checkoutResult}
        onRetryStripe={handleRetryStripe}
      />
    );
  }

  return (
    <section className="mx-auto max-w-6xl px-4 py-8">
      <header className="mb-8">
        <div className="mb-5 flex items-center gap-2 text-xs font-medium text-slate-400">
          {STEPS.map((step, index) => {
            const active =
              (index === 0 && cart?.items?.length) ||
              (index === 1 && paymentMethod) ||
              index === 2;

            return (
              <div key={step.key} className="flex items-center gap-2">
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-full border text-[11px] font-semibold ${
                    active
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-200 bg-white text-slate-400"
                  }`}
                >
                  {index + 1}
                </span>
                <span className={active ? "text-slate-700" : "text-slate-400"}>
                  {step.label}
                </span>
                {index < STEPS.length - 1 && (
                  <span className="mx-2 h-px w-10 bg-slate-200" />
                )}
              </div>
            );
          })}
        </div>

        <h2 className="text-3xl font-bold tracking-tight text-slate-900">
          Checkout
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Review your cart, choose a payment method, and complete your order.
        </p>
      </header>

      {error && (
        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 shadow-sm">
          {error}
        </div>
      )}

      {message && (
        <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700 shadow-sm">
          {message}
        </div>
      )}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-800">
                Cart Items
              </h3>
              <p className="text-sm text-slate-500">
                {itemCount} item{itemCount === 1 ? "" : "s"} in your cart
              </p>
            </div>
            {cart?.items?.length ? (
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                Ready to checkout
              </span>
            ) : null}
          </div>

          {!cart?.items?.length ? (
            <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center">
              <p className="text-slate-500">Your cart is empty.</p>
              <Link
                to="/home"
                className="mt-4 inline-block rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
              >
                Continue Shopping
              </Link>
            </div>
          ) : (
            <ul className="space-y-4">
              {cart.items.map((item) => {
                const productName = item.product?.name || "Unnamed product";
                const unitPrice = Number(item.price || 0).toFixed(2);
                const lineTotal = (
                  Number(item.price || 0) * Number(item.quantity || 0)
                ).toFixed(2);

                return (
                  <li
                    key={item._id}
                    className="flex flex-col gap-4 rounded-2xl border border-slate-200 p-4 transition hover:shadow-sm md:flex-row md:items-center md:justify-between"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-xs font-semibold text-slate-400">
                        IMG
                      </div>

                      <div>
                        <p className="font-semibold text-slate-800">
                          {productName}
                        </p>
                        <p className="text-sm text-slate-500">
                          LKR ${unitPrice} each
                        </p>
                        <p className="text-xs text-slate-400">
                          Line total: ${lineTotal}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-start md:self-auto">
                      <div className="inline-flex items-center rounded-xl border border-slate-200">
                        <button
                          type="button"
                          onClick={() =>
                            updateItemQuantity(item._id, item.quantity, -1)
                          }
                          className="flex h-10 w-10 items-center justify-center border-r border-slate-200 text-lg text-slate-700 hover:bg-slate-50"
                          aria-label={`Decrease quantity of ${productName}`}
                        >
                          −
                        </button>
                        <span className="flex h-10 min-w-10 items-center justify-center px-2 text-sm font-semibold text-slate-800">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            updateItemQuantity(item._id, item.quantity, 1)
                          }
                          className="flex h-10 w-10 items-center justify-center border-l border-slate-200 text-lg text-slate-700 hover:bg-slate-50"
                          aria-label={`Increase quantity of ${productName}`}
                        >
                          +
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeItem(item._id)}
                        className="rounded-xl border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50"
                      >
                        Remove
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </article>

        <aside className="space-y-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div>
            <h3 className="text-lg font-semibold text-slate-800">
              Order Summary
            </h3>
            <p className="text-sm text-slate-500">
              Review your total before placing the order.
            </p>
          </div>

          <div className="space-y-3 rounded-2xl bg-slate-50 p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">Subtotal</span>
              <span className="font-semibold text-slate-800">${cartTotal}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">Items</span>
              <span className="font-semibold text-slate-800">{itemCount}</span>
            </div>
            <div className="flex items-center justify-between border-t border-slate-200 pt-3 text-sm">
              <span className="font-medium text-slate-700">Total</span>
              <span className="text-lg font-bold text-slate-900">
                ${cartTotal}
              </span>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium text-slate-700">Payment Method</p>

            <label
              className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-4 transition ${
                paymentMethod === "STRIPE"
                  ? "border-slate-900 bg-slate-50"
                  : "border-slate-200 hover:bg-slate-50"
              }`}
            >
              <input
                type="radio"
                name="paymentMethod"
                value="STRIPE"
                checked={paymentMethod === "STRIPE"}
                onChange={() => setPaymentMethod("STRIPE")}
                className="h-4 w-4"
              />
              <div>
                <p className="text-sm font-semibold text-slate-800">
                  Pay with Card (Stripe)
                </p>
                <p className="text-xs text-slate-500">Fast online payment</p>
              </div>
            </label>

            <label
              className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-4 transition ${
                paymentMethod === "MANUAL"
                  ? "border-slate-900 bg-slate-50"
                  : "border-slate-2 00 hover:bg-slate-50"
              }`}
            >
              <input
                type="radio"
                name="paymentMethod"
                value="MANUAL"
                checked={paymentMethod === "MANUAL"}
                onChange={() => setPaymentMethod("MANUAL")}
                className="h-4 w-4"
              />
              <div>
                <p className="text-sm font-semibold text-slate-800">
                  Manual Payment
                </p>
                <p className="text-xs text-slate-500">
                  Bank transfer with slip upload
                </p>
              </div>
            </label>
          </div>

          <button
            onClick={handlePlaceOrder}
            disabled={loading || !cart?.items?.length}
            className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading
              ? "Processing..."
              : paymentMethod === "STRIPE"
                ? "Continue to Payment"
                : "Place Manual Order"}
          </button>

          {paymentMethod === "MANUAL" && (
            <div className="space-y-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4">
              <div>
                <p className="text-sm font-semibold text-slate-800">
                  Manual payment instructions
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Place the order first, then upload a clear image of your
                  payment slip here.
                </p>
              </div>

              {manualOrderId ? (
                <div className="rounded-xl bg-white p-3 text-xs text-slate-600 shadow-sm">
                  <span className="font-semibold text-slate-700">
                    Order ID:
                  </span>{" "}
                  {manualOrderId}
                </div>
              ) : (
                <p className="text-xs text-slate-500">
                  Your order ID will appear here after you place the order.
                </p>
              )}

              <input
                type="file"
                accept="image/*"
                onChange={handleSlipChange}
                className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-slate-900 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-slate-800"
              />

              {manualSlipPreview && (
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                  <img
                    src={manualSlipPreview}
                    alt="Payment slip preview"
                    className="h-52 w-full object-contain bg-slate-100"
                  />
                </div>
              )}

              <button
                onClick={handleUploadManualSlip}
                disabled={uploadingSlip || !manualOrderId || !manualSlipFile}
                className="w-full rounded-2xl bg-amber-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {uploadingSlip ? "Uploading..." : "Upload Payment Slip"}
              </button>
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}
