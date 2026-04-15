import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ChevronDown,
  Plus,
  CreditCard,
  BarChart2,
  Layers,
  UserCircle,
} from "lucide-react";

const FAQS = [
  {
    q: "How do I approve a bank payment?",
    a: "Go to Orders → Pending Bank Payments tab. Find the order, click View to see the payment slip, then click Approve to confirm payment. The order will move to Paid status automatically.",
  },
  {
    q: "How do I bulk upload products?",
    a: "On the Products page, click Bulk Upload. Download the sample CSV template, fill it in with your product data (Name, Category, Description, Price, Stock, Sizes, Status, ImageURL), then drag-and-drop or browse to upload. Review the preview and click Import.",
  },
  {
    q: "What does the low stock threshold do?",
    a: "The low stock threshold (set in Settings → Order Settings) controls which products appear in the Low Stock Alerts widget on the Dashboard. Any product with stock below this number will be flagged.",
  },
  {
    q: "How do I update the monthly revenue target?",
    a: "Go to Settings → Order Settings → Monthly Revenue Target. Enter the target value in LKR and click Save Settings. The Dashboard monthly target widget will update immediately.",
  },
  {
    q: "How do I change an order's status?",
    a: "On the Orders page, click the eye icon on any order row. A side panel opens showing order details. Use the status dropdown at the bottom of the panel and click Save.",
  },
  {
    q: "Can I delete a customer account?",
    a: "No — customer accounts cannot be permanently deleted from the admin panel to preserve order history. You can ban a customer to prevent them from logging in. Go to Customers, find the customer, and click Ban.",
  },
  {
    q: "Where do I find abandoned cart data?",
    a: "The Dashboard Conversion Rate widget shows cart adds vs. checkouts. The difference (Cart Adds − Checkouts) represents abandoned carts. A full abandoned cart report is available in the Reports section.",
  },
  {
    q: "How do I export orders?",
    a: "On the Orders → All Orders tab, apply any filters you need, then click the Export CSV button in the top-right of the filter bar. The export reflects your current filter selection.",
  },
  {
    q: "How do I manage product categories?",
    a: "On the Products page, click the Categories button. A modal opens where you can add new categories, rename existing ones, or delete categories that have no active products.",
  },
  {
    q: "How do I recalculate trending scores?",
    a: "Trending scores are automatically recalculated every 6 hours. To trigger an immediate recalculation, go to Profile → Admin Utilities and click Recalculate Trending Scores.",
  },
];

const QUICK_LINKS = [
  { label: "Add Product", to: "/admin/products/new", icon: Plus, color: "bg-amber-50 text-amber-700 border-amber-200" },
  { label: "Pending Payments", to: "/admin/orders", icon: CreditCard, color: "bg-blue-50 text-blue-700 border-blue-200" },
  { label: "Reports", to: "/admin/reports", icon: BarChart2, color: "bg-violet-50 text-violet-700 border-violet-200" },
  { label: "Manage Categories", to: "/admin/products", icon: Layers, color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { label: "Update Profile", to: "/admin/profile", icon: UserCircle, color: "bg-slate-50 text-slate-700 border-slate-200" },
];

export default function AdminHelpPage() {
  const [openIndex, setOpenIndex] = useState(null);

  const toggle = (i) => setOpenIndex(openIndex === i ? null : i);

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      {/* Quick Links */}
      <div>
        <h2 className="mb-4 text-base font-semibold text-slate-900">Quick Links</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {QUICK_LINKS.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.to + link.label}
                to={link.to}
                className={`flex items-center gap-3 rounded-2xl border px-4 py-3.5 transition hover:shadow-sm ${link.color}`}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span className="text-sm font-semibold">{link.label}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* FAQ Accordion */}
      <div>
        <h2 className="mb-4 text-base font-semibold text-slate-900">Frequently Asked Questions</h2>
        <div className="divide-y divide-slate-100 overflow-hidden rounded-2xl bg-white shadow-sm">
          {FAQS.map((faq, i) => (
            <div key={i}>
              <button
                type="button"
                onClick={() => toggle(i)}
                className="flex w-full items-center justify-between px-5 py-4 text-left transition hover:bg-slate-50"
              >
                <span className="text-sm font-medium text-slate-900 pr-4">{faq.q}</span>
                <ChevronDown
                  className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 ${openIndex === i ? "rotate-180" : ""}`}
                />
              </button>
              {openIndex === i && (
                <div className="border-t border-slate-100 bg-slate-50/60 px-5 py-4">
                  <p className="text-sm leading-relaxed text-slate-600">{faq.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
