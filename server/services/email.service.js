const nodemailer = require("nodemailer");

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

const baseLayout = (content) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Smart Fit</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
          <!-- Header -->
          <tr>
            <td align="center" style="padding-bottom:24px;">
              <span style="font-size:26px;font-weight:800;color:#d97706;letter-spacing:-0.5px;">Smart Fit</span>
            </td>
          </tr>
          <!-- Card -->
          <tr>
            <td style="background:#ffffff;border-radius:16px;padding:36px 32px;box-shadow:0 1px 4px rgba(0,0,0,0.06);">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top:24px;">
              <p style="margin:0;font-size:12px;color:#9ca3af;">© Smart Fit &nbsp;|&nbsp; This is an automated email — please do not reply.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

const ctaButton = (href, label) =>
  `<a href="${href}" style="display:inline-block;margin-top:24px;padding:13px 28px;background:#d97706;color:#ffffff;text-decoration:none;border-radius:10px;font-weight:700;font-size:15px;">${label}</a>`;

const orderSummaryTable = (order) => {
  const deliveryFee = 350;
  const rows = (order.items || [])
    .map(
      (item) => `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;font-size:14px;color:#374151;">${item.product?.name || "Product"}</td>
        <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;font-size:14px;color:#6b7280;text-align:center;">×${item.quantity}</td>
        <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;font-size:14px;color:#374151;text-align:right;">LKR ${(item.price * item.quantity).toLocaleString("en-LK")}</td>
      </tr>`,
    )
    .join("");

  const subtotal = order.totalPrice || 0;
  const total = subtotal + deliveryFee;

  return `
  <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;border-collapse:collapse;">
    <thead>
      <tr>
        <th style="text-align:left;padding-bottom:8px;font-size:12px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.05em;border-bottom:2px solid #f3f4f6;">Item</th>
        <th style="text-align:center;padding-bottom:8px;font-size:12px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.05em;border-bottom:2px solid #f3f4f6;">Qty</th>
        <th style="text-align:right;padding-bottom:8px;font-size:12px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.05em;border-bottom:2px solid #f3f4f6;">Price</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
    <tfoot>
      <tr>
        <td colspan="2" style="padding-top:10px;font-size:13px;color:#6b7280;">Subtotal</td>
        <td style="padding-top:10px;font-size:13px;color:#6b7280;text-align:right;">LKR ${subtotal.toLocaleString("en-LK")}</td>
      </tr>
      <tr>
        <td colspan="2" style="padding-top:4px;font-size:13px;color:#6b7280;">Delivery Fee</td>
        <td style="padding-top:4px;font-size:13px;color:#6b7280;text-align:right;">LKR ${deliveryFee.toLocaleString("en-LK")}</td>
      </tr>
      <tr>
        <td colspan="2" style="padding-top:10px;font-size:16px;font-weight:800;color:#111827;border-top:2px solid #f3f4f6;">Total</td>
        <td style="padding-top:10px;font-size:16px;font-weight:800;color:#d97706;text-align:right;border-top:2px solid #f3f4f6;">LKR ${total.toLocaleString("en-LK")}</td>
      </tr>
    </tfoot>
  </table>`;
};

const estimatedDelivery = () => {
  const date = new Date();
  date.setDate(date.getDate() + 5);
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${days[date.getDay()]}, ${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
};

const orderNumber = (order) => String(order._id || "").slice(-8).toUpperCase();

// ─── Templates ────────────────────────────────────────────────────────────────

const welcomeEmail = (name) =>
  baseLayout(`
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#111827;">Welcome to Smart Fit, ${name}! 👋</h1>
    <p style="margin:0 0 16px;font-size:15px;color:#6b7280;line-height:1.6;">
      We're thrilled to have you on board. Smart Fit is your go-to destination for premium fitness apparel — built for performance, designed for style.
    </p>
    <p style="margin:0;font-size:15px;color:#6b7280;line-height:1.6;">
      Browse our latest collections, save your favourites to your wishlist, and enjoy a seamless checkout experience.
    </p>
    <div style="text-align:center;">
      ${ctaButton(`${FRONTEND_URL}/home`, "Start Shopping")}
    </div>
  `);

const verificationEmail = (name, otp) =>
  baseLayout(`
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#111827;">Verify your email address</h1>
    <p style="margin:0 0 20px;font-size:15px;color:#6b7280;line-height:1.6;">
      Hi ${name}, thanks for registering with Smart Fit. Use the code below to verify your email address.
    </p>
    <p style="margin:0 0 10px;font-size:13px;font-weight:600;color:#6b7280;text-align:center;text-transform:uppercase;letter-spacing:0.05em;">Your verification code is:</p>
    <div style="margin:0 auto 20px;text-align:center;background:#fffbeb;border:2px solid #f59e0b;border-radius:12px;padding:20px 32px;display:inline-block;max-width:240px;">
      <span style="font-size:36px;font-weight:900;color:#b45309;letter-spacing:0.25em;font-family:monospace;">${otp}</span>
    </div>
    <p style="margin:0;font-size:13px;color:#9ca3af;text-align:center;">
      This code expires in <strong>10 minutes</strong>. If you didn't create a Smart Fit account, you can safely ignore this email.
    </p>
  `);

const orderConfirmationEmail = (name, order) =>
  baseLayout(`
    <h1 style="margin:0 0 4px;font-size:22px;font-weight:800;color:#111827;">Order Confirmed 🎉</h1>
    <p style="margin:0 0 4px;font-size:13px;font-family:monospace;color:#9ca3af;">Order #${orderNumber(order)}</p>
    <p style="margin:0 0 20px;font-size:15px;color:#6b7280;line-height:1.6;">
      Hi ${name}, your order has been placed successfully. Here's your summary:
    </p>
    ${orderSummaryTable(order)}
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;">
      <tr>
        <td style="padding:4px 0;font-size:13px;color:#6b7280;">Payment method</td>
        <td style="padding:4px 0;font-size:13px;color:#374151;text-align:right;font-weight:600;">${order.paymentMethod === "STRIPE" ? "Card (Stripe)" : "Bank Transfer"}</td>
      </tr>
      <tr>
        <td style="padding:4px 0;font-size:13px;color:#6b7280;">Estimated delivery</td>
        <td style="padding:4px 0;font-size:13px;color:#374151;text-align:right;font-weight:600;">${estimatedDelivery()}</td>
      </tr>
    </table>
    <p style="margin:20px 0 0;font-size:13px;color:#9ca3af;">Estimated delivery: 3–5 business days from today.</p>
    <div style="text-align:center;">
      ${ctaButton(`${FRONTEND_URL}/profile?tab=orders`, "View Order")}
    </div>
  `);

const paymentSlipAcknowledgementEmail = (name, order) =>
  baseLayout(`
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#111827;">Payment proof received</h1>
    <p style="margin:0 0 4px;font-size:13px;font-family:monospace;color:#9ca3af;">Order #${orderNumber(order)}</p>
    <p style="margin:0 0 20px;font-size:15px;color:#6b7280;line-height:1.6;">
      Hi ${name}, thank you for uploading your payment proof for order #${orderNumber(order)} (LKR ${(order.totalPrice || 0).toLocaleString("en-LK")}). Our team will review it within 24 hours and notify you once it's verified.
    </p>
    <div style="background:#f8fafc;border-radius:10px;padding:14px 18px;margin-bottom:4px;">
      ${(order.items || []).map((i) => `<p style="margin:4px 0;font-size:13px;color:#374151;">• ${i.product?.name || "Product"} &times;${i.quantity} — LKR ${(i.price * i.quantity).toLocaleString("en-LK")}</p>`).join("")}
      <p style="margin:10px 0 0;font-size:14px;font-weight:700;color:#111827;border-top:1px solid #e2e8f0;padding-top:10px;">Total: LKR ${(order.totalPrice || 0).toLocaleString("en-LK")}</p>
    </div>
  `);

const orderRejectionEmail = (name, order) =>
  baseLayout(`
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#111827;">Update on your order</h1>
    <p style="margin:0 0 4px;font-size:13px;font-family:monospace;color:#9ca3af;">Order #${orderNumber(order)}</p>
    <p style="margin:0 0 16px;font-size:15px;color:#6b7280;line-height:1.6;">
      Hi ${name}, unfortunately we were unable to verify the payment for your recent order. This can happen if the payment slip was unclear or the transfer details didn't match.
    </p>
    <div style="background:#fef3c7;border-radius:10px;padding:14px 18px;margin-bottom:16px;">
      <p style="margin:0;font-size:13px;color:#92400e;">
        <strong>Items ordered:</strong> ${(order.items || []).map((i) => `${i.product?.name || "Product"} ×${i.quantity}`).join(", ")}
      </p>
      <p style="margin:6px 0 0;font-size:13px;color:#92400e;"><strong>Total:</strong> LKR ${(order.totalPrice || 0).toLocaleString("en-LK")}</p>
    </div>
    <p style="margin:0;font-size:15px;color:#6b7280;line-height:1.6;">
      You can place a new order and pay securely online using a card via Stripe — no manual transfer required.
    </p>
    <div style="text-align:center;">
      ${ctaButton(`${FRONTEND_URL}/home`, "Shop Again")}
    </div>
  `);

const orderCancellationEmail = (name, order) =>
  baseLayout(`
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#111827;">Order Cancelled</h1>
    <p style="margin:0 0 4px;font-size:13px;font-family:monospace;color:#9ca3af;">Order #${orderNumber(order)}</p>
    <p style="margin:0 0 16px;font-size:15px;color:#6b7280;line-height:1.6;">
      Hi ${name}, your order has been successfully cancelled as requested. Any reserved stock has been restored and you will not be charged.
    </p>
    <p style="margin:0;font-size:15px;color:#6b7280;line-height:1.6;">
      We hope to see you again soon. Browse our latest collection and find something you love.
    </p>
    <div style="text-align:center;">
      ${ctaButton(`${FRONTEND_URL}/home`, "Continue Shopping")}
    </div>
  `);

// ─── Send utility ─────────────────────────────────────────────────────────────

const sendEmail = async (to, subject, html) => {
  try {
    await transporter.sendMail({
      from: `"Smart Fit" <${process.env.GMAIL_USER}>`,
      to,
      subject,
      html,
    });
  } catch (err) {
    process.stderr.write(`[email] Failed to send to ${to}: ${err.message}\n`);
  }
};

module.exports = {
  sendEmail,
  welcomeEmail,
  verificationEmail,
  orderConfirmationEmail,
  paymentSlipAcknowledgementEmail,
  orderRejectionEmail,
  orderCancellationEmail,
};
