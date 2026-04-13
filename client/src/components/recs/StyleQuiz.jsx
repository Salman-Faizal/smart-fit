// import React, { useEffect, useMemo, useState } from "react";

// const occasionOptions = [
//   { id: "office", label: "Office & Work", emoji: "💼" },
//   { id: "events", label: "Parties & Events", emoji: "🎉" },
//   { id: "casual", label: "Casual & Weekend", emoji: "☕" },
//   { id: "gym", label: "Gym & Active", emoji: "🏋️" },
//   { id: "all", label: "All Occasions", emoji: "✨" },
// ];

// const fitOptions = [
//   { id: "slim", label: "Slim", desc: "Clean, close-to-body lines" },
//   { id: "regular", label: "Regular", desc: "Balanced and timeless" },
//   { id: "relaxed", label: "Relaxed", desc: "Easy drape and comfort" },
// ];

// const colorOptions = [
//   { id: "white", label: "White", color: "#f8fafc" },
//   { id: "black", label: "Black", color: "#111827" },
//   { id: "navy", label: "Navy", color: "#1e3a8a" },
//   { id: "gray", label: "Gray", color: "#6b7280" },
//   { id: "beige", label: "Beige", color: "#d6c7a1" },
//   { id: "olive", label: "Olive", color: "#556b2f" },
//   { id: "burgundy", label: "Burgundy", color: "#7f1d1d" },
//   { id: "sky", label: "Sky Blue", color: "#0ea5e9" },
//   { id: "brown", label: "Brown", color: "#7c4a21" },
//   { id: "mustard", label: "Mustard", color: "#d4a017" },
// ];

// const budgetOptions = [
//   { value: 0, label: "Under 1,500", range: "Under LKR 1,500" },
//   { value: 1, label: "1,500–3,500", range: "LKR 1,500–3,500" },
//   { value: 2, label: "3,500–6,000", range: "LKR 3,500–6,000" },
//   { value: 3, label: "6,000+", range: "LKR 6,000+" },
// ];

// const personalityOptions = [
//   {
//     id: "sharp",
//     title: "The Sharp Professional",
//     desc: "Tailored, polished, and made to lead.",
//     gradient: "from-gray-900 to-slate-700",
//   },
//   {
//     id: "streetwear",
//     title: "The Streetwear Enthusiast",
//     desc: "Fresh layers, relaxed confidence, and edge.",
//     gradient: "from-zinc-900 to-stone-700",
//   },
//   {
//     id: "minimalist",
//     title: "The Minimalist",
//     desc: "Clean lines, muted tones, maximum versatility.",
//     gradient: "from-neutral-900 to-gray-700",
//   },
//   {
//     id: "bold",
//     title: "The Bold Trendsetter",
//     desc: "Statement pieces with a confident finish.",
//     gradient: "from-amber-900 to-orange-700",
//   },
// ];

// const products = [
//   { name: "Slim Oxford Shirt", price: 4200, fit: "Slim" },
//   { name: "Tapered Chino Trousers", price: 5500, fit: "Regular" },
//   { name: "Textured Knit Polo", price: 3600, fit: "Regular" },
//   { name: "Tailored Blazer", price: 9800, fit: "Slim" },
//   { name: "Minimal Crew Tee", price: 2400, fit: "Relaxed" },
//   { name: "Structured Overshirt", price: 6100, fit: "Relaxed" },
//   { name: "Classic Derby Shoes", price: 8900, fit: "Classic" },
//   { name: "Slim Performance Joggers", price: 4700, fit: "Athleisure" },
// ];

// const completeLook = ["Oxford Shirt", "Slim Chinos", "Derby Shoes"];

// function cx(...classes) {
//   return classes.filter(Boolean).join(" ");
// }

// function formatCurrency(amount) {
//   return `LKR ${amount.toLocaleString("en-LK")}`;
// }

// function getBudgetLabel(value) {
//   return (
//     budgetOptions[Math.min(Math.max(Number(value) || 0, 0), 3)]?.range ??
//     "LKR 1,500–3,500"
//   );
// }

// function getDominantColor(selectedColors) {
//   if (!selectedColors.length) return "Navy";
//   return colorOptions.find((c) => c.id === selectedColors[0])?.label ?? "Navy";
// }

// function getStyleType(answers) {
//   const personalityMap = {
//     sharp: "Sharp",
//     streetwear: "Streetwear",
//     minimalist: "Minimalist",
//     bold: "Bold",
//   };

//   const occasionMap = {
//     office: "Professional",
//     events: "Statement",
//     casual: "Minimal",
//     gym: "Athletic",
//     all: "Versatile",
//   };

//   const fitMap = {
//     slim: "Precision",
//     regular: "Balance",
//     relaxed: "Ease",
//   };

//   const first = personalityMap[answers.personality] || "Sharp";
//   const second = answers.fit
//     ? answers.fit === "slim"
//       ? "Minimalist"
//       : answers.fit === "regular"
//         ? "Professional"
//         : "Relaxed"
//     : fitMap.regular;
//   const occasion = occasionMap[answers.occasion] || "Versatile";

//   if (answers.personality === "minimalist") return `${first} ${occasion}`;
//   if (answers.personality === "streetwear") return `${first} ${second}`;
//   if (answers.personality === "bold") return `${first} ${occasion}`;
//   return `${first} ${second}`;
// }

// function StyleIconSilhouette({ type }) {
//   const common = "fill-none stroke-current stroke-[2.2]";
//   if (type === "slim") {
//     return (
//       <svg viewBox="0 0 80 120" className="h-28 w-20 text-gray-100">
//         <circle cx="40" cy="16" r="10" className={common} />
//         <path
//           d="M30 28 L50 28 L58 52 L52 76 L48 112 H32 L28 76 L22 52 Z"
//           className={common}
//         />
//         <path d="M30 40 L18 58" className={common} />
//         <path d="M50 40 L62 58" className={common} />
//         <path d="M34 112 L30 120" className={common} />
//         <path d="M46 112 L50 120" className={common} />
//       </svg>
//     );
//   }
//   if (type === "relaxed") {
//     return (
//       <svg viewBox="0 0 80 120" className="h-28 w-20 text-gray-100">
//         <circle cx="40" cy="16" r="10" className={common} />
//         <path
//           d="M26 30 H54 L62 54 L58 78 L54 112 H26 L22 78 L18 54 Z"
//           className={common}
//         />
//         <path d="M26 42 L14 62" className={common} />
//         <path d="M54 42 L66 62" className={common} />
//         <path d="M30 112 L26 120" className={common} />
//         <path d="M50 112 L54 120" className={common} />
//       </svg>
//     );
//   }
//   return (
//     <svg viewBox="0 0 80 120" className="h-28 w-20 text-gray-100">
//       <circle cx="40" cy="16" r="10" className={common} />
//       <path
//         d="M28 28 H52 L58 52 L54 76 L50 112 H30 L26 76 L22 52 Z"
//         className={common}
//       />
//       <path d="M28 40 L16 58" className={common} />
//       <path d="M52 40 L64 58" className={common} />
//       <path d="M32 112 L28 120" className={common} />
//       <path d="M48 112 L52 120" className={common} />
//     </svg>
//   );
// }

// function BodyOutline() {
//   return (
//     <svg viewBox="0 0 220 260" className="h-64 w-full max-w-xs text-gray-600">
//       <circle
//         cx="110"
//         cy="36"
//         r="22"
//         fill="none"
//         stroke="currentColor"
//         strokeWidth="4"
//       />
//       <path
//         d="M84 64 C88 82, 94 92, 110 92 C126 92, 132 82, 136 64"
//         fill="none"
//         stroke="currentColor"
//         strokeWidth="4"
//         strokeLinecap="round"
//       />
//       <path
//         d="M78 88 C88 96, 95 104, 100 122 C104 138, 104 162, 100 194"
//         fill="none"
//         stroke="currentColor"
//         strokeWidth="4"
//         strokeLinecap="round"
//       />
//       <path
//         d="M142 88 C132 96, 125 104, 120 122 C116 138, 116 162, 120 194"
//         fill="none"
//         stroke="currentColor"
//         strokeWidth="4"
//         strokeLinecap="round"
//       />
//       <path
//         d="M94 86 H126"
//         fill="none"
//         stroke="currentColor"
//         strokeWidth="4"
//         strokeLinecap="round"
//       />
//       <path
//         d="M72 116 C86 120, 94 124, 110 124 C126 124, 134 120, 148 116"
//         fill="none"
//         stroke="currentColor"
//         strokeWidth="4"
//         strokeLinecap="round"
//       />
//       <path
//         d="M94 194 L88 240"
//         fill="none"
//         stroke="currentColor"
//         strokeWidth="4"
//         strokeLinecap="round"
//       />
//       <path
//         d="M126 194 L132 240"
//         fill="none"
//         stroke="currentColor"
//         strokeWidth="4"
//         strokeLinecap="round"
//       />
//       <path
//         d="M88 240 H76"
//         fill="none"
//         stroke="currentColor"
//         strokeWidth="4"
//         strokeLinecap="round"
//       />
//       <path
//         d="M132 240 H144"
//         fill="none"
//         stroke="currentColor"
//         strokeWidth="4"
//         strokeLinecap="round"
//       />
//     </svg>
//   );
// }

// function QuizStep({
//   currentStep,
//   title,
//   subtitle,
//   children,
//   progress,
//   onNext,
//   onBack,
//   canContinue,
// }) {
//   const [entered, setEntered] = useState(false);

//   useEffect(() => {
//     setEntered(false);
//     const id = window.requestAnimationFrame(() => setEntered(true));
//     return () => window.cancelAnimationFrame(id);
//   }, [currentStep]);

//   return (
//     <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
//       <div className="mb-6 rounded-2xl border border-gray-800 bg-gray-800/90 p-4 shadow-2xl shadow-black/20">
//         <div className="mb-3 flex items-center justify-between gap-4">
//           <div>
//             <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-400">
//               Smart Fit Style Quiz
//             </p>
//             <h1 className="mt-1 text-2xl font-bold text-white sm:text-3xl">
//               {title}
//             </h1>
//             <p className="mt-1 text-sm text-gray-300">{subtitle}</p>
//           </div>
//           <div className="hidden rounded-full border border-gray-700 bg-gray-900 px-4 py-2 text-sm font-medium text-gray-200 sm:block">
//             Step {currentStep} of 6
//           </div>
//         </div>
//         <div className="h-2 w-full rounded-full bg-gray-700">
//           <div
//             className="h-2 rounded-full bg-amber-600 transition-all duration-500"
//             style={{ width: `${progress}%` }}
//           />
//         </div>
//       </div>

//       <div
//         key={currentStep}
//         className={cx(
//           "transition-all duration-300 ease-out",
//           entered ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4",
//         )}
//       >
//         {children}
//       </div>

//       <div className="mt-8 flex items-center justify-between gap-3">
//         <button
//           onClick={onBack}
//           className={cx(
//             "rounded-xl px-5 py-3 text-sm font-semibold transition",
//             currentStep === 1
//               ? "invisible pointer-events-none"
//               : "bg-gray-800 text-gray-100 hover:bg-gray-700",
//           )}
//         >
//           Back
//         </button>
//         <button
//           onClick={onNext}
//           disabled={!canContinue}
//           className={cx(
//             "rounded-xl px-5 py-3 text-sm font-semibold transition",
//             canContinue
//               ? "bg-amber-600 text-white hover:bg-amber-500"
//               : "cursor-not-allowed bg-amber-600/40 text-white/70",
//           )}
//         >
//           {currentStep === 6 ? "See Results" : "Continue"}
//         </button>
//       </div>
//     </div>
//   );
// }

// function OccasionStep({ value, onChange }) {
//   return (
//     <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
//       {occasionOptions.map((opt) => {
//         const selected = value === opt.id;
//         return (
//           <button
//             key={opt.id}
//             onClick={() => onChange(opt.id)}
//             className={cx(
//               "rounded-2xl border p-4 text-left transition-all duration-200",
//               selected
//                 ? "border-amber-600 bg-amber-600/10 ring-1 ring-amber-600/70"
//                 : "border-gray-700 bg-gray-800 hover:border-gray-600 hover:bg-gray-700/80",
//             )}
//           >
//             <div className="text-3xl">{opt.emoji}</div>
//             <div className="mt-4 text-base font-semibold text-white">
//               {opt.label}
//             </div>
//           </button>
//         );
//       })}
//     </div>
//   );
// }

// function FitStep({ value, onChange }) {
//   return (
//     <div className="grid gap-4 md:grid-cols-3">
//       {fitOptions.map((opt) => {
//         const selected = value === opt.id;
//         return (
//           <button
//             key={opt.id}
//             onClick={() => onChange(opt.id)}
//             className={cx(
//               "rounded-2xl border p-5 transition-all duration-200",
//               selected
//                 ? "border-amber-600 bg-gray-800 ring-2 ring-amber-600 shadow-[0_0_0_1px_rgba(217,119,6,0.35)]"
//                 : "border-gray-700 bg-gray-800 hover:border-gray-500",
//             )}
//           >
//             <div className="flex justify-center">
//               <StyleIconSilhouette type={opt.id} />
//             </div>
//             <div className="mt-2 text-center text-lg font-semibold text-white">
//               {opt.label}
//             </div>
//             <div className="mt-1 text-center text-sm text-gray-400">
//               {opt.desc}
//             </div>
//           </button>
//         );
//       })}
//     </div>
//   );
// }

// function ColorStep({ values, onToggle }) {
//   return (
//     <div className="grid grid-cols-5 gap-4 sm:grid-cols-10">
//       {colorOptions.map((opt) => {
//         const selected = values.includes(opt.id);
//         return (
//           <button
//             key={opt.id}
//             onClick={() => onToggle(opt.id)}
//             className="flex flex-col items-center gap-2"
//           >
//             <div
//               className={cx(
//                 "relative h-12 w-12 rounded-full border-2 transition-all",
//                 selected
//                   ? "border-amber-600 ring-2 ring-amber-600/60"
//                   : "border-gray-700",
//               )}
//               style={{ backgroundColor: opt.color }}
//             >
//               {selected && (
//                 <svg
//                   viewBox="0 0 24 24"
//                   className="absolute inset-0 m-auto h-6 w-6 text-white"
//                 >
//                   <path
//                     d="M20 6L9 17l-5-5"
//                     fill="none"
//                     stroke="currentColor"
//                     strokeWidth="3"
//                     strokeLinecap="round"
//                     strokeLinejoin="round"
//                   />
//                 </svg>
//               )}
//             </div>
//             <span className="text-xs font-medium text-gray-300">
//               {opt.label}
//             </span>
//           </button>
//         );
//       })}
//     </div>
//   );
// }

// function BudgetStep({ value, onChange }) {
//   const selected = budgetOptions[Math.min(Math.max(Number(value) || 0, 0), 3)];
//   return (
//     <div className="rounded-2xl border border-gray-700 bg-gray-800 p-6">
//       <div className="flex items-center justify-between gap-3">
//         <div>
//           <h3 className="text-lg font-semibold text-white">Budget Range</h3>
//           <p className="mt-1 text-sm text-gray-400">
//             Choose the range that best matches your comfort zone.
//           </p>
//         </div>
//         <div className="hidden rounded-full border border-amber-600/30 bg-amber-600/10 px-3 py-1 text-xs font-semibold text-amber-400 sm:block">
//           Smart Fit uses this to tune recommendations
//         </div>
//       </div>

//       <div className="mt-8">
//         <input
//           type="range"
//           min="0"
//           max="3"
//           step="1"
//           value={value}
//           onChange={(e) => onChange(Number(e.target.value))}
//           className="w-full accent-amber-600"
//           style={{ accentColor: "#d97706" }}
//         />
//       </div>

//       <div className="mt-6 text-center">
//         <div className="text-3xl font-bold text-white">{selected.range}</div>
//         <div className="mt-2 text-sm text-gray-400">{selected.label}</div>
//       </div>
//     </div>
//   );
// }

// function MeasurementsStep({ values, onChange }) {
//   return (
//     <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
//       <div className="rounded-2xl border border-gray-700 bg-gray-800 p-6">
//         <div className="mb-5">
//           <h3 className="text-lg font-semibold text-white">
//             Body Measurements
//           </h3>
//           <p className="mt-1 text-sm text-gray-400">
//             Helps us predict your size
//           </p>
//         </div>

//         <div className="grid gap-4 sm:grid-cols-3">
//           {[
//             { key: "height", label: "Height (cm)", placeholder: "e.g. 175" },
//             { key: "weight", label: "Weight (kg)", placeholder: "e.g. 72" },
//             { key: "chest", label: "Chest (in)", placeholder: "e.g. 40" },
//           ].map((field) => (
//             <label key={field.key} className="block">
//               <span className="mb-2 block text-sm font-medium text-gray-200">
//                 {field.label}
//               </span>
//               <input
//                 type="number"
//                 inputMode="numeric"
//                 placeholder={field.placeholder}
//                 value={values[field.key]}
//                 onChange={(e) => onChange(field.key, e.target.value)}
//                 className="w-full rounded-xl border border-gray-700 bg-gray-900 px-4 py-3 text-white placeholder:text-gray-500 outline-none transition focus:border-amber-600 focus:ring-2 focus:ring-amber-600/30"
//               />
//             </label>
//           ))}
//         </div>
//       </div>

//       <div className="flex items-center justify-center rounded-2xl border border-gray-700 bg-gray-800 p-6">
//         <BodyOutline />
//       </div>
//     </div>
//   );
// }

// function PersonalityStep({ value, onChange }) {
//   return (
//     <div className="grid gap-4 md:grid-cols-2">
//       {personalityOptions.map((opt) => {
//         const selected = value === opt.id;
//         return (
//           <button
//             key={opt.id}
//             onClick={() => onChange(opt.id)}
//             className={cx(
//               "rounded-2xl border p-5 text-left transition-all duration-200",
//               `bg-gradient-to-br ${opt.gradient}`,
//               selected
//                 ? "border-amber-600 ring-2 ring-amber-600"
//                 : "border-gray-700 hover:border-gray-500",
//             )}
//           >
//             <div className="text-lg font-bold text-white">{opt.title}</div>
//             <div className="mt-2 max-w-sm text-sm leading-6 text-gray-200/85">
//               {opt.desc}
//             </div>
//           </button>
//         );
//       })}
//     </div>
//   );
// }

// function ResultsPage({ answers, onRetake }) {
//   const [mounted, setMounted] = useState(false);
//   const [showLogic, setShowLogic] = useState(false);
//   const [ringProgress, setRingProgress] = useState(0);

//   useEffect(() => {
//     setMounted(false);
//     setShowLogic(false);
//     setRingProgress(0);
//     const t = window.setTimeout(() => {
//       setMounted(true);
//       window.setTimeout(() => setRingProgress(87), 80);
//     }, 60);
//     return () => window.clearTimeout(t);
//   }, [answers]);

//   const styleType = getStyleType(answers);
//   const dominantColor = getDominantColor(answers.colors);
//   const budgetLabel = getBudgetLabel(answers.budget);
//   const fitLabel =
//     fitOptions.find((f) => f.id === answers.fit)?.label ?? "Regular";
//   const occasionLabel =
//     occasionOptions.find((o) => o.id === answers.occasion)?.label ??
//     "All Occasions";
//   const personalityLabel =
//     personalityOptions.find((p) => p.id === answers.personality)?.title ??
//     "The Sharp Professional";

//   const logicText = useMemo(() => {
//     const colors = answers.colors.length
//       ? answers.colors
//           .map((id) => colorOptions.find((c) => c.id === id)?.label)
//           .filter(Boolean)
//           .join(", ")
//       : "neutral tones";
//     return `Your answers point to ${styleType.toLowerCase()} dressing. You selected ${personalityLabel.toLowerCase()}, prefer a ${fitLabel.toLowerCase()} fit, and chose ${occasionLabel.toLowerCase()} as your main use case. Your color choices lean toward ${colors}, while your budget sits in the ${budgetLabel.toLowerCase()} range. That combination suggests cleaner silhouettes, versatile layers, and sharper pieces that can be dressed up or down without feeling overdone.`;
//   }, [
//     answers.colors,
//     budgetLabel,
//     fitLabel,
//     occasionLabel,
//     personalityLabel,
//     styleType,
//   ]);

//   const radius = 54;
//   const circumference = 2 * Math.PI * radius;
//   const dashOffset = circumference - (ringProgress / 100) * circumference;

//   return (
//     <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
//       <div className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
//         <div
//           className={cx(
//             "rounded-3xl border border-gray-800 bg-gray-800 p-6 shadow-2xl transition-all duration-500",
//             mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4",
//           )}
//         >
//           <div className="rounded-2xl border-l-4 border-amber-600 bg-gray-900/70 p-5">
//             <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-400">
//               Style Profile
//             </p>
//             <h2 className="mt-2 text-3xl font-bold text-white">{styleType}</h2>
//             <div className="mt-4 grid gap-3 text-sm text-gray-300 sm:grid-cols-2 lg:grid-cols-4">
//               <div>
//                 <span className="text-gray-500">Fit:</span> {fitLabel}
//               </div>
//               <div>
//                 <span className="text-gray-500">Dominant color:</span>{" "}
//                 {dominantColor}
//               </div>
//               <div>
//                 <span className="text-gray-500">Budget:</span> {budgetLabel}
//               </div>
//               <div>
//                 <span className="text-gray-500">Occasion:</span> {occasionLabel}
//               </div>
//             </div>
//           </div>
//         </div>

//         <div
//           className={cx(
//             "rounded-3xl border border-gray-800 bg-gray-800 p-6 shadow-2xl transition-all duration-500 delay-100",
//             mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4",
//           )}
//         >
//           <div className="flex items-center justify-center">
//             <svg viewBox="0 0 140 140" className="h-44 w-44">
//               <circle
//                 cx="70"
//                 cy="70"
//                 r={radius}
//                 fill="none"
//                 stroke="#374151"
//                 strokeWidth="12"
//               />
//               <circle
//                 cx="70"
//                 cy="70"
//                 r={radius}
//                 fill="none"
//                 stroke="#d97706"
//                 strokeWidth="12"
//                 strokeLinecap="round"
//                 strokeDasharray={circumference}
//                 strokeDashoffset={dashOffset}
//                 transform="rotate(-90 70 70)"
//                 style={{ transition: "stroke-dashoffset 1200ms ease" }}
//               />
//               <text
//                 x="70"
//                 y="66"
//                 textAnchor="middle"
//                 className="fill-white text-[18px] font-bold"
//               >
//                 87%
//               </text>
//               <text
//                 x="70"
//                 y="88"
//                 textAnchor="middle"
//                 className="fill-gray-300 text-[10px] font-medium tracking-[0.28em]"
//               >
//                 STYLE MATCH
//               </text>
//             </svg>
//           </div>
//           <div className="mt-2 text-center text-sm text-gray-400">
//             Your quiz answers have been translated into a smart buying profile.
//           </div>
//         </div>
//       </div>

//       <div
//         className={cx(
//           "mt-8 rounded-3xl border border-gray-800 bg-gray-800 p-6 shadow-2xl transition-all duration-500 delay-150",
//           mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4",
//         )}
//       >
//         <div className="mb-5 flex items-center justify-between gap-3">
//           <div>
//             <h3 className="text-2xl font-bold text-white">Curated For You</h3>
//             <p className="mt-1 text-sm text-gray-400">
//               Products shaped around your style profile.
//             </p>
//           </div>
//           <span className="rounded-full border border-amber-600/30 bg-amber-600/10 px-3 py-1 text-xs font-semibold text-amber-400">
//             8 picks
//           </span>
//         </div>

//         <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
//           {products.map((product, index) => (
//             <div
//               key={product.name}
//               className={cx(
//                 "rounded-2xl border border-gray-700 bg-gray-900 p-3 transition-all duration-500",
//                 mounted
//                   ? "opacity-100 translate-y-0"
//                   : "opacity-0 translate-y-4",
//               )}
//               style={{ transitionDelay: `${180 + index * 90}ms` }}
//             >
//               <div className="aspect-[4/5] w-full rounded-xl bg-gray-700" />
//               <div className="mt-3 text-sm font-semibold text-white">
//                 {product.name}
//               </div>
//               <div className="mt-1 text-sm text-gray-300">
//                 {formatCurrency(product.price)}
//               </div>
//               <span className="mt-2 inline-flex rounded-full bg-amber-600/20 px-2.5 py-1 text-xs font-semibold text-amber-400">
//                 {product.fit} Fit
//               </span>
//               <button className="mt-3 w-full rounded-xl bg-amber-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-amber-500">
//                 Add to Cart
//               </button>
//             </div>
//           ))}
//         </div>
//       </div>

//       <div
//         className={cx(
//           "mt-8 rounded-3xl border border-gray-800 bg-gray-800 p-6 shadow-2xl transition-all duration-500 delay-200",
//           mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4",
//         )}
//       >
//         <h3 className="text-2xl font-bold text-white">Complete The Look</h3>
//         <div className="mt-5 flex flex-col items-stretch gap-4 md:flex-row md:items-center md:justify-center">
//           {completeLook.map((item, idx) => (
//             <React.Fragment key={item}>
//               <div className="rounded-2xl border border-gray-700 bg-gray-900 px-5 py-4 text-center text-sm font-semibold text-white">
//                 {item}
//               </div>
//               {idx < completeLook.length - 1 && (
//                 <div className="text-center text-3xl font-bold text-amber-600">
//                   +
//                 </div>
//               )}
//             </React.Fragment>
//           ))}
//         </div>
//       </div>

//       <div
//         className={cx(
//           "mt-8 rounded-3xl border border-gray-800 bg-gray-800 p-6 shadow-2xl transition-all duration-500 delay-250",
//           mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4",
//         )}
//       >
//         <button
//           onClick={() => setShowLogic((v) => !v)}
//           className="flex w-full items-center justify-between rounded-2xl bg-gray-900 px-5 py-4 text-left"
//         >
//           <span className="text-lg font-semibold text-white">
//             Why these recommendations?
//           </span>
//           <span className="text-2xl font-bold text-amber-600">
//             {showLogic ? "−" : "+"}
//           </span>
//         </button>
//         {showLogic && (
//           <p className="mt-4 px-5 pb-1 text-sm leading-7 text-gray-300">
//             {logicText}
//           </p>
//         )}
//       </div>

//       <div className="mt-8 flex justify-end">
//         <button
//           onClick={onRetake}
//           className="rounded-xl bg-gray-100 px-5 py-3 text-sm font-semibold text-gray-900 transition hover:bg-white"
//         >
//           Retake Quiz
//         </button>
//       </div>
//     </div>
//   );
// }

// export default function StyleQuiz() {
//   const [currentStep, setCurrentStep] = useState(1);
//   const [answers, setAnswers] = useState({
//     occasion: "",
//     fit: "",
//     colors: [],
//     budget: 1,
//     measurements: { height: "", weight: "", chest: "" },
//     personality: "",
//   });

//   const progress = (currentStep / 6) * 100;

//   const canContinue = useMemo(() => {
//     switch (currentStep) {
//       case 1:
//         return Boolean(answers.occasion);
//       case 2:
//         return Boolean(answers.fit);
//       case 3:
//         return answers.colors.length > 0;
//       case 4:
//         return true;
//       case 5:
//         return true;
//       case 6:
//         return Boolean(answers.personality);
//       default:
//         return false;
//     }
//   }, [answers, currentStep]);

//   const goNext = () => {
//     if (!canContinue) return;
//     setCurrentStep((s) => Math.min(s + 1, 7));
//   };

//   const goBack = () => setCurrentStep((s) => Math.max(s - 1, 1));

//   const resetQuiz = () => {
//     setAnswers({
//       occasion: "",
//       fit: "",
//       colors: [],
//       budget: 1,
//       measurements: { height: "", weight: "", chest: "" },
//       personality: "",
//     });
//     setCurrentStep(1);
//   };

//   const toggleColor = (id) => {
//     setAnswers((prev) => ({
//       ...prev,
//       colors: prev.colors.includes(id)
//         ? prev.colors.filter((c) => c !== id)
//         : [...prev.colors, id],
//     }));
//   };

//   const updateMeasurement = (key, value) => {
//     setAnswers((prev) => ({
//       ...prev,
//       measurements: { ...prev.measurements, [key]: value },
//     }));
//   };

//   const stepMeta = [
//     {
//       title: "Choose your occasion",
//       subtitle: "Start with where and how you dress most often.",
//     },
//     {
//       title: "Pick a fit preference",
//       subtitle: "Tell Smart Fit how you like your clothes to sit.",
//     },
//     {
//       title: "Pick your colors",
//       subtitle: "Choose the palette that feels most like you.",
//     },
//     {
//       title: "Set your budget",
//       subtitle: "We will keep the recommendations in range.",
//     },
//     {
//       title: "Add measurements",
//       subtitle: "Optional details that help refine size suggestions.",
//     },
//     {
//       title: "Define your personality",
//       subtitle: "Choose the style energy that fits you best.",
//     },
//   ];

//   if (currentStep === 7) {
//     return <ResultsPage answers={answers} onRetake={resetQuiz} />;
//   }

//   return (
//     <div className="min-h-screen bg-gray-900 text-white">
//       <QuizStep
//         currentStep={currentStep}
//         title={stepMeta[currentStep - 1].title}
//         subtitle={stepMeta[currentStep - 1].subtitle}
//         progress={progress}
//         onNext={goNext}
//         onBack={goBack}
//         canContinue={canContinue}
//       >
//         {currentStep === 1 && (
//           <OccasionStep
//             value={answers.occasion}
//             onChange={(occasion) => setAnswers((p) => ({ ...p, occasion }))}
//           />
//         )}
//         {currentStep === 2 && (
//           <FitStep
//             value={answers.fit}
//             onChange={(fit) => setAnswers((p) => ({ ...p, fit }))}
//           />
//         )}
//         {currentStep === 3 && (
//           <ColorStep values={answers.colors} onToggle={toggleColor} />
//         )}
//         {currentStep === 4 && (
//           <BudgetStep
//             value={answers.budget}
//             onChange={(budget) => setAnswers((p) => ({ ...p, budget }))}
//           />
//         )}
//         {currentStep === 5 && (
//           <MeasurementsStep
//             values={answers.measurements}
//             onChange={updateMeasurement}
//           />
//         )}
//         {currentStep === 6 && (
//           <PersonalityStep
//             value={answers.personality}
//             onChange={(personality) =>
//               setAnswers((p) => ({ ...p, personality }))
//             }
//           />
//         )}
//       </QuizStep>
//     </div>
//   );
// }
