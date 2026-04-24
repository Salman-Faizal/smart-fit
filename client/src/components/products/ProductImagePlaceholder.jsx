export default function ProductImagePlaceholder({ className = "" }) {
  return (
    <div
      className={`flex items-center justify-center bg-slate-100 ${className}`}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#94a3b8"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ width: "40%", height: "40%" }}
        aria-hidden="true"
      >
        {/* hook */}
        <path d="M12 2c1.1 0 2 .9 2 2 0 1.1-.9 1.8-2 2" />
        {/* hanger body */}
        <path d="M12 6 L2.5 18.5 L21.5 18.5 Z" />
        {/* bottom bar */}
        <line x1="1.5" y1="20.5" x2="22.5" y2="20.5" />
      </svg>
    </div>
  );
}
