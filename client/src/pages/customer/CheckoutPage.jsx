import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api, assetUrl } from "../../lib/api";

// ─── Icons ────────────────────────────────────────────────────────────────────

function CheckCircleIcon({ className = "h-8 w-8" }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M8 12l3 3 5-5" />
    </svg>
  );
}

function ClockIcon({ className = "h-8 w-8" }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 7v5l3 3" />
    </svg>
  );
}

function XCircleIcon({ className = "h-8 w-8" }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M15 9l-6 6M9 9l6 6" />
    </svg>
  );
}

function CardIcon({ className = "h-5 w-5" }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="M2 10h20" />
    </svg>
  );
}

function BankIcon({ className = "h-5 w-5" }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 22h18M4 11v11M20 11v11M8 11v11M12 11v11M16 11v11M2 11l10-9 10 9" />
    </svg>
  );
}

function ShieldIcon({ className = "h-4 w-4" }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

function UploadIcon({ className = "h-7 w-7" }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
    </svg>
  );
}

// ─── Step Indicator ───────────────────────────────────────────────────────────

const STEPS = [
  { label: "Cart", key: "cart" },
  { label: "Payment", key: "payment" },
  { label: "Confirmation", key: "confirmation" },
];

function StepIndicator({ currentStep }) {
  return (
    <div className="mb-8 flex items-start">
      {STEPS.map((step, index) => {
        const stepNumber = index + 1;
        const isDone = stepNumber < currentStep;
        const isActive = stepNumber === currentStep;

        return (
          <Fragment key={step.key}>
            <div className="flex flex-col items-center">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all ${
                  isDone
                    ? "bg-amber-600 text-white"
                    : isActive
                      ? "border-2 border-amber-600 bg-white text-amber-700"
                      : "border-2 border-slate-200 bg-white text-slate-400"
                }`}
              >
                {isDone ? "✓" : stepNumber}
              </div>
              <span
                className={`mt-1.5 whitespace-nowrap text-[11px] font-medium ${
                  isActive
                    ? "text-amber-700"
                    : isDone
                      ? "text-slate-600"
                      : "text-slate-400"
                }`}
              >
                {step.label}
              </span>
            </div>
            {index < STEPS.length - 1 && (
              <div
                className={`mx-3 mt-4 h-px min-w-[2rem] flex-1 max-w-[5rem] transition-colors ${
                  isDone ? "bg-amber-600" : "bg-slate-200"
                }`}
              />
            )}
          </Fragment>
        );
      })}
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton({ className }) {
  return <div className={`animate-pulse rounded-lg bg-slate-200 ${className}`} />;
}

function CartItemSkeleton() {
  return (
    <li className="flex items-center gap-4 rounded-2xl border border-slate-100 p-4">
      <Skeleton className="h-20 w-20 flex-shrink-0 rounded-xl" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/3" />
        <Skeleton className="h-3 w-1/4" />
      </div>
      <Skeleton className="h-9 w-28 rounded-xl" />
    </li>
  );
}

function CheckoutSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-3 lg:items-start">
      <article className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
        <Skeleton className="mb-2 h-5 w-1/4" />
        <CartItemSkeleton />
        <CartItemSkeleton />
      </article>
      <aside className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <Skeleton className="h-5 w-1/2" />
        <div className="space-y-3 rounded-2xl bg-slate-50 p-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-6 w-full" />
        </div>
        <Skeleton className="h-12 w-full rounded-2xl" />
      </aside>
    </div>
  );
}

// ─── Stripe Redirecting Screen ────────────────────────────────────────────────

function StripeRedirectingScreen() {
  return (
    <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-white">
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-amber-50">
        <CardIcon className="h-7 w-7 text-amber-600" />
      </div>
      <h2 className="text-xl font-bold text-slate-900">Redirecting to Stripe…</h2>
      <p className="mx-auto mt-2 max-w-xs text-center text-sm text-slate-500">
        You&apos;re being taken to Stripe&apos;s secure checkout. Please don&apos;t
        close this window.
      </p>
      <div className="mt-6 flex gap-1.5">
        <span className="h-2 w-2 animate-bounce rounded-full bg-amber-600 [animation-delay:-0.3s]" />
        <span className="h-2 w-2 animate-bounce rounded-full bg-amber-600 [animation-delay:-0.15s]" />
        <span className="h-2 w-2 animate-bounce rounded-full bg-amber-600" />
      </div>
    </div>
  );
}

// ─── Checkout Result ───────────────────────────────────────────────────────────

function CheckoutResult({ result, onRetryStripe }) {
  const isSuccess = result.type === "success";
  const isPending = result.type === "pending";
  const isError = result.type === "failed" || result.type === "cancelled";

  const { iconBg, iconText, Icon } = isSuccess
    ? { iconBg: "bg-emerald-50", iconText: "text-emerald-600", Icon: CheckCircleIcon }
    : isPending
      ? { iconBg: "bg-amber-50", iconText: "text-amber-600", Icon: ClockIcon }
      : { iconBg: "bg-red-50", iconText: "text-red-600", Icon: XCircleIcon };

  return (
    <section className="mx-auto flex min-h-[70vh] max-w-2xl items-center px-4 py-12">
      <StepIndicator currentStep={3} />
      <div className="w-full rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
        <div
          className={`mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full ${iconBg} ${iconText}`}
        >
          <Icon className="h-10 w-10" />
        </div>

        <h2 className="text-2xl font-bold text-slate-900">{result.title}</h2>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-slate-500">
          {result.description}
        </p>

        {result.orderId && (
          <div className="mx-auto mt-6 max-w-sm rounded-2xl bg-slate-50 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
              Order Reference
            </p>
            <p className="mt-1.5 break-all font-mono text-sm font-semibold text-slate-800">
              {result.orderId}
            </p>
            {result.order && (
              <div className="mt-3 space-y-1.5 border-t border-slate-200 pt-3 text-left text-xs text-slate-600">
                {result.order.items?.length > 0 && (
                  <p>
                    <span className="font-medium text-slate-700">Items:</span>{" "}
                    {result.order.items.length}
                  </p>
                )}
                <p>
                  <span className="font-medium text-slate-700">Total:</span> $
                  {Number(result.order.totalPrice || 0).toFixed(2)}
                </p>
                <p>
                  <span className="font-medium text-slate-700">Method:</span>{" "}
                  {result.order.paymentMethod}
                </p>
              </div>
            )}
          </div>
        )}

        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          {isSuccess ? (
            <>
              <Link
                to="/profile"
                className="rounded-xl bg-amber-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-amber-700"
              >
                View Orders
              </Link>
              <Link
                to="/home"
                className="rounded-xl border border-slate-200 px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Continue Shopping
              </Link>
            </>
          ) : isPending ? (
            <>
              <Link
                to="/profile"
                className="rounded-xl bg-amber-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-amber-700"
              >
                Track Order
              </Link>
              <Link
                to="/home"
                className="rounded-xl border border-slate-200 px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
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
                  className="rounded-xl bg-amber-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-amber-700"
                >
                  Retry Payment
                </button>
              )}
              <Link
                to="/checkout"
                className="rounded-xl border border-slate-200 px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Back to Cart
              </Link>
            </>
          )}
        </div>

        {isError && (
          <p className="mt-6 text-xs text-slate-400">
            Your cart is intact. You can try again whenever you&apos;re ready.
          </p>
        )}
      </div>
    </section>
  );
}

// ─── Manual Payment View ───────────────────────────────────────────────────────

function ManualPaymentView({
  orderId,
  onSlipChange,
  slipFile,
  slipPreview,
  onUpload,
  uploading,
  uploaded,
  error,
}) {
  if (uploaded) {
    return (
      <section className="mx-auto flex min-h-[70vh] max-w-2xl items-center px-4 py-12">
        <div className="w-full rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <CheckCircleIcon className="h-10 w-10" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900">Slip Received</h2>
          <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-slate-500">
            We&apos;ve received your payment slip for order{" "}
            <span className="font-mono font-semibold text-slate-800">
              {orderId}
            </span>
            . Our team will verify and confirm your order shortly.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              to="/profile"
              className="rounded-xl bg-amber-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-amber-700"
            >
              Track Order
            </Link>
            <Link
              to="/home"
              className="rounded-xl border border-slate-200 px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-2xl px-4 py-8">
      <StepIndicator currentStep={2} />

      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        {/* Order confirmation banner */}
        <div className="mb-6 flex items-start gap-3 rounded-2xl bg-amber-50 p-4">
          <BankIcon className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
          <div>
            <p className="text-sm font-semibold text-slate-800">
              Order placed — upload your payment slip to complete
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              Reference:{" "}
              <span className="font-mono font-semibold text-slate-700">
                {orderId}
              </span>
            </p>
          </div>
        </div>

        <div className="space-y-5">
          <div>
            <p className="text-sm font-semibold text-slate-800">
              Upload Payment Slip
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Upload a clear photo or PDF of your bank transfer receipt.
            </p>
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
              <XCircleIcon className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-500" />
              {error}
            </div>
          )}

          {/* Drag-to-click upload zone */}
          <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 p-8 text-center transition hover:border-amber-400 hover:bg-amber-50">
            {slipPreview ? (
              <img
                src={slipPreview}
                alt="Payment slip preview"
                className="max-h-48 rounded-xl object-contain"
              />
            ) : (
              <>
                <UploadIcon className="mb-3 h-7 w-7 text-slate-400" />
                <span className="text-sm font-medium text-slate-600">
                  Click to browse or drag a file here
                </span>
                <span className="mt-1 text-xs text-slate-400">
                  JPEG, PNG or PDF
                </span>
              </>
            )}
            <input
              type="file"
              accept="image/*,application/pdf"
              onChange={onSlipChange}
              className="sr-only"
            />
          </label>

          {slipFile && !slipPreview && (
            <p className="text-xs text-slate-500">
              Selected:{" "}
              <span className="font-medium text-slate-700">{slipFile.name}</span>
            </p>
          )}

          <button
            onClick={onUpload}
            disabled={uploading || !slipFile}
            className="w-full rounded-2xl bg-amber-600 px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {uploading ? "Uploading…" : "Submit Payment Slip"}
          </button>

          <p className="text-center text-xs text-slate-400">
            Need help? Contact support with your order reference.
          </p>
        </div>
      </div>
    </section>
  );
}

// ─── Main Checkout Page ───────────────────────────────────────────────────────

export default function CheckoutPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  // cart === null means "still loading" (not yet fetched)
  const [cart, setCart] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState("STRIPE");
  const [loading, setLoading] = useState(false);
  const [stripeRedirecting, setStripeRedirecting] = useState(false);
  const [error, setError] = useState("");

  // Manual payment flow state
  const [manualOrderId, setManualOrderId] = useState("");
  const [manualSlipFile, setManualSlipFile] = useState(null);
  const [manualSlipPreview, setManualSlipPreview] = useState("");
  const [uploadingSlip, setUploadingSlip] = useState(false);
  const [slipUploaded, setSlipUploaded] = useState(false);

  // Result screen state (set when returning from Stripe redirect)
  const [checkoutResult, setCheckoutResult] = useState(null);

  // ── Data loading ────────────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    try {
      setError("");
      const cartData = await api.getCart();
      setCart(cartData.cart);
    } catch (err) {
      setError(err.message || "Failed to load cart");
      setCart({ items: [] }); // show empty state, not forever-spinner
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── Stripe return URL handler ───────────────────────────────────────────────

  useEffect(() => {
    const orderId = searchParams.get("order_id");
    const paymentState = searchParams.get("payment");

    if (!orderId || !paymentState) return;

    const syncPaymentState = async () => {
      try {
        setLoading(true);
        setError("");

        if (paymentState === "cancel") {
          await api.cancelStripeOrder(orderId);
          setCheckoutResult({
            type: "cancelled",
            title: "Payment cancelled",
            description:
              "You cancelled the Stripe checkout. Your cart is unchanged — try again whenever you're ready.",
            orderId,
          });
        } else if (paymentState === "success") {
          const { order } = await api.getOrderById(orderId);

          if (order.paymentStatus === "PAID" || order.status === "PAID") {
            setCheckoutResult({
              type: "success",
              title: "Payment successful",
              description:
                "Your order has been confirmed. Check your order history for tracking updates.",
              orderId,
              order,
            });
            await loadData();
          } else {
            setCheckoutResult({
              type: "pending",
              title: "Verifying payment…",
              description:
                "Your payment is being verified. This usually takes just a moment. Check your order history for updates.",
              orderId,
              order,
            });
          }
        } else if (paymentState === "failed") {
          await api.cancelStripeOrder(orderId);
          setCheckoutResult({
            type: "failed",
            title: "Payment failed",
            description:
              "The payment didn't go through. Your cart is intact — try again or choose a different method.",
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

  // ── Slip preview URL ────────────────────────────────────────────────────────

  useEffect(() => {
    if (!manualSlipFile || !manualSlipFile.type.startsWith("image/")) {
      setManualSlipPreview("");
      return;
    }
    const objectUrl = URL.createObjectURL(manualSlipFile);
    setManualSlipPreview(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [manualSlipFile]);

  // ── Derived values ─────────────────────────────────────────────────────────

  const cartTotal = useMemo(
    () => Number(cart?.totalPrice || 0).toFixed(2),
    [cart],
  );

  const itemCount = useMemo(
    () =>
      cart?.items?.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0) ||
      0,
    [cart],
  );

  const hasItems = Boolean(cart?.items?.length);

  // ── Cart mutation handlers ──────────────────────────────────────────────────

  const updateItemQuantity = async (itemId, currentQty, delta) => {
    const nextQty = currentQty + delta;
    if (nextQty < 1 || loading) return;

    try {
      setLoading(true);
      setError("");
      await api.updateCartItem(itemId, nextQty);
      await loadData();
    } catch (err) {
      setError(err.message || "Failed to update quantity");
    } finally {
      setLoading(false);
    }
  };

  const removeItem = async (itemId) => {
    if (loading) return;
    try {
      setLoading(true);
      setError("");
      await api.removeCartItem(itemId);
      await loadData();
    } catch (err) {
      setError(err.message || "Failed to remove item");
    } finally {
      setLoading(false);
    }
  };

  // ── Checkout handler ────────────────────────────────────────────────────────

  const handlePlaceOrder = async () => {
    try {
      setLoading(true);
      setError("");
      setManualOrderId("");
      setManualSlipFile(null);
      setSlipUploaded(false);
      setCheckoutResult(null);

      const checkoutData = await api.checkoutOrder(paymentMethod);
      const order = checkoutData.order;

      if (paymentMethod === "STRIPE") {
        const sessionData = await api.createStripeCheckoutSession(order._id);
        if (!sessionData.checkoutUrl) {
          throw new Error("Stripe checkout URL missing.");
        }
        // Show overlay before navigation so user sees it immediately
        setStripeRedirecting(true);
        window.location.assign(sessionData.checkoutUrl);
        return;
      }

      setManualOrderId(order._id);
    } catch (err) {
      setError(err.message || "Checkout failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ── Manual slip handlers ────────────────────────────────────────────────────

  const handleSlipChange = (e) => {
    const file = e.target.files?.[0] || null;
    if (!file) {
      setManualSlipFile(null);
      return;
    }

    const isImage = file.type.startsWith("image/");
    const isPdf = file.type === "application/pdf";

    if (!isImage && !isPdf) {
      setError("Please upload an image (JPEG, PNG) or PDF file.");
      e.target.value = "";
      return;
    }

    setError("");
    setManualSlipFile(file);
  };

  const handleUploadManualSlip = async () => {
    if (!manualOrderId || !manualSlipFile) return;

    try {
      setUploadingSlip(true);
      setError("");

      const formData = new FormData();
      formData.append("paymentSlip", manualSlipFile);
      await api.uploadPaymentSlip(manualOrderId, formData);
      setSlipUploaded(true);
    } catch (err) {
      setError(err.message || "Failed to upload payment slip");
    } finally {
      setUploadingSlip(false);
    }
  };

  const handleRetryStripe = () => {
    // The cancelled order can't be reused.
    // Re-entering the flow creates a fresh order from the intact cart.
    handlePlaceOrder();
  };

  // ── Render: priority-ordered phase gates ────────────────────────────────────

  if (stripeRedirecting) {
    return <StripeRedirectingScreen />;
  }

  if (checkoutResult) {
    return (
      <CheckoutResult
        result={checkoutResult}
        onRetryStripe={
          checkoutResult.type === "cancelled" || checkoutResult.type === "failed"
            ? handleRetryStripe
            : null
        }
      />
    );
  }

  if (manualOrderId) {
    return (
      <ManualPaymentView
        orderId={manualOrderId}
        onSlipChange={handleSlipChange}
        slipFile={manualSlipFile}
        slipPreview={manualSlipPreview}
        onUpload={handleUploadManualSlip}
        uploading={uploadingSlip}
        uploaded={slipUploaded}
        error={error}
      />
    );
  }

  // ── Render: initial cart load ───────────────────────────────────────────────

  if (cart === null) {
    return (
      <section className="mx-auto max-w-6xl px-4 py-8">
        <StepIndicator currentStep={1} />
        <CheckoutSkeleton />
      </section>
    );
  }

  // ── Render: main checkout ───────────────────────────────────────────────────

  return (
    <section className="mx-auto max-w-6xl px-4 py-8">
      <StepIndicator currentStep={1} />

      <div className="mb-6">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">
          Your Cart
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Review your items, then choose how you&apos;d like to pay.
        </p>
      </div>

      {error && (
        <div className="mb-5 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <XCircleIcon className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-500" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3 lg:items-start">
        {/* ── Cart Items ─────────────────────────────────────────────────── */}
        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
          <div className="mb-5 flex items-center justify-between">
            <h3 className="font-semibold text-slate-800">
              {itemCount} {itemCount === 1 ? "item" : "items"}
            </h3>
            {hasItems && (
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                Ready to checkout
              </span>
            )}
          </div>

          {!hasItems ? (
            <div className="flex flex-col items-center rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-6 py-16 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                <CardIcon className="h-6 w-6" />
              </div>
              <p className="text-sm font-medium text-slate-600">
                Your cart is empty
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Browse the store to add items.
              </p>
              <Link
                to="/home"
                className="mt-5 rounded-xl bg-amber-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-700"
              >
                Start Shopping
              </Link>
            </div>
          ) : (
            <ul className="space-y-3">
              {cart.items.map((item) => {
                const productName = item.product?.name || "Product";
                const imgUrl =
                  assetUrl(item.product?.images?.[0]) ||
                  "https://placehold.co/80x80?text=+";
                const unitPrice = Number(item.price || 0).toFixed(2);
                const lineTotal = (
                  Number(item.price || 0) * Number(item.quantity || 0)
                ).toFixed(2);

                return (
                  <li
                    key={item._id}
                    className="flex flex-col gap-4 rounded-2xl border border-slate-100 p-4 transition hover:border-slate-200 md:flex-row md:items-center md:justify-between"
                  >
                    <div className="flex items-center gap-4">
                      <Link
                        to={`/products/${item.product?._id}`}
                        className="flex-shrink-0 overflow-hidden rounded-xl"
                      >
                        <img
                          src={imgUrl}
                          alt={productName}
                          className="h-20 w-20 object-cover"
                        />
                      </Link>
                      <div>
                        <p className="font-semibold leading-tight text-slate-800">
                          {productName}
                        </p>
                        <p className="mt-0.5 text-sm text-slate-500">
                          ${unitPrice} each
                        </p>
                        <p className="mt-1 text-xs font-semibold text-amber-600">
                          ${lineTotal}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-start md:self-auto">
                      {/* Quantity stepper */}
                      <div className="inline-flex overflow-hidden rounded-xl border border-slate-200">
                        <button
                          type="button"
                          onClick={() =>
                            updateItemQuantity(item._id, item.quantity, -1)
                          }
                          disabled={loading || item.quantity <= 1}
                          className="flex h-9 w-9 items-center justify-center border-r border-slate-200 text-slate-600 transition hover:bg-slate-50 disabled:opacity-40"
                          aria-label={`Decrease quantity of ${productName}`}
                        >
                          −
                        </button>
                        <span className="flex h-9 min-w-[2.25rem] items-center justify-center px-1 text-sm font-semibold text-slate-800">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            updateItemQuantity(item._id, item.quantity, 1)
                          }
                          disabled={loading}
                          className="flex h-9 w-9 items-center justify-center border-l border-slate-200 text-slate-600 transition hover:bg-slate-50 disabled:opacity-40"
                          aria-label={`Increase quantity of ${productName}`}
                        >
                          +
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeItem(item._id)}
                        disabled={loading}
                        className="rounded-xl px-3 py-2 text-xs font-semibold text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
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

        {/* ── Order Summary Sidebar ──────────────────────────────────────── */}
        <aside className="space-y-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:sticky lg:top-24">
          <h3 className="font-semibold text-slate-800">Order Summary</h3>

          {/* Totals */}
          <div className="space-y-2 rounded-2xl bg-slate-50 p-4 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Subtotal</span>
              <span className="font-semibold text-slate-800">${cartTotal}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Shipping</span>
              <span className="font-semibold text-emerald-600">Free</span>
            </div>
            <div className="flex items-center justify-between border-t border-slate-200 pt-2.5 mt-2.5">
              <span className="font-semibold text-slate-700">Total</span>
              <span className="text-xl font-bold text-amber-600">
                ${cartTotal}
              </span>
            </div>
          </div>

          {/* Payment method */}
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Payment Method
            </p>

            {/* Stripe */}
            <button
              type="button"
              onClick={() => setPaymentMethod("STRIPE")}
              className={`flex w-full items-center gap-3 rounded-2xl border p-3.5 text-left transition ${
                paymentMethod === "STRIPE"
                  ? "border-amber-400 bg-amber-50 ring-1 ring-amber-400"
                  : "border-slate-200 hover:bg-slate-50"
              }`}
            >
              <span
                className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl transition ${
                  paymentMethod === "STRIPE"
                    ? "bg-amber-600 text-white"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                <CardIcon className="h-4 w-4" />
              </span>
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-800">
                  Card / Stripe
                </p>
                <p className="text-xs text-slate-500">
                  Visa, Mastercard &amp; more
                </p>
              </div>
              {paymentMethod === "STRIPE" && (
                <span className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-amber-600">
                  <span className="h-1.5 w-1.5 rounded-full bg-white" />
                </span>
              )}
            </button>

            {/* Manual / Bank Transfer */}
            <button
              type="button"
              onClick={() => setPaymentMethod("MANUAL")}
              className={`flex w-full items-center gap-3 rounded-2xl border p-3.5 text-left transition ${
                paymentMethod === "MANUAL"
                  ? "border-amber-400 bg-amber-50 ring-1 ring-amber-400"
                  : "border-slate-200 hover:bg-slate-50"
              }`}
            >
              <span
                className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl transition ${
                  paymentMethod === "MANUAL"
                    ? "bg-amber-600 text-white"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                <BankIcon className="h-4 w-4" />
              </span>
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-800">
                  Bank Transfer
                </p>
                <p className="text-xs text-slate-500">
                  Upload slip for verification
                </p>
              </div>
              {paymentMethod === "MANUAL" && (
                <span className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-amber-600">
                  <span className="h-1.5 w-1.5 rounded-full bg-white" />
                </span>
              )}
            </button>
          </div>

          {/* CTA */}
          <button
            onClick={handlePlaceOrder}
            disabled={loading || !hasItems}
            className="w-full rounded-2xl bg-amber-600 px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading
              ? "Processing…"
              : paymentMethod === "STRIPE"
                ? "Continue to Payment →"
                : "Place Order →"}
          </button>

          {/* Security note */}
          <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400">
            <ShieldIcon className="h-3.5 w-3.5" />
            <span>Secured by Stripe · 256-bit SSL</span>
          </div>
        </aside>
      </div>
    </section>
  );
}
