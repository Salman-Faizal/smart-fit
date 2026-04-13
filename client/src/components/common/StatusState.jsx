export function LoadingState({ label = "Loading..." }) {
  return (
    <div className="p-5 text-center">
      <p className="text-sm font-medium text-slate-500">{label}</p>
    </div>
  );
}

export function ErrorState({ message }) {
  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700 shadow-sm">
      <p className="font-medium">{message || "Something went wrong."}</p>
    </div>
  );
}

export function EmptyState({ title, description }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
      <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      <p className="mt-2 text-sm text-slate-500">{description}</p>
    </div>
  );
}
