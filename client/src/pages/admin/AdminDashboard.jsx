import { Link } from "react-router-dom";
import { useProducts } from "../../hooks/useProducts";

export default function AdminDashboard() {
  const { products } = useProducts({});

  const totalProducts = products.length;
  const totalStock = products.reduce(
    (sum, product) => sum + Number(product.stock || 0),
    0,
  );
  const totalViews = products.reduce(
    (sum, product) => sum + Number(product.views || 0),
    0,
  );

  return (
    <section className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard title="Products" value={totalProducts} />
        <MetricCard title="Total Inventory" value={totalStock} />
        <MetricCard title="Total Views" value={totalViews} />
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-900">Quick actions</h2>
        <p className="mt-1 text-sm text-slate-500">
          Manage your catalog from one place.
        </p>

        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            className="rounded-lg bg-amber-600 px-4 py-2 font-semibold text-white hover:bg-amber-700"
            to="/admin/products/new"
          >
            Add Product
          </Link>
          <Link
            className="rounded-lg border border-slate-300 px-4 py-2 font-semibold text-slate-700 hover:bg-slate-100"
            to="/admin/products"
          >
            Manage Products
          </Link>
        </div>
      </div>
    </section>
  );
}

function MetricCard({ title, value }) {
  return (
    <article className="rounded-2xl bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-500">{title}</p>
      <p className="mt-2 text-3xl font-bold text-slate-900">{value}</p>
    </article>
  );
}
