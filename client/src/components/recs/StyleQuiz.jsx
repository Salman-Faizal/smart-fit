import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Wand2,
  Coffee,
  Briefcase,
  Music,
  Zap,
  Shirt,
  Tag,
  Award,
  Flame,
  Minus,
  Activity,
  Watch,
  Layers,
  Wind,
  Sun,
} from "lucide-react";
import { api } from "../../lib/api";
import ProductCard from "../products/ProductCard";

// ─── Question Config ──────────────────────────────────────────────────────────

const QUESTIONS = [
  {
    key: "occasion",
    title: "What's the occasion?",
    type: "single",
    options: [
      { value: "Everyday Casual", Icon: Coffee },
      { value: "Formal & Office", Icon: Briefcase },
      { value: "Night Out", Icon: Music },
      { value: "Active & Sport", Icon: Zap },
    ],
  },
  {
    key: "fit",
    title: "What's your preferred fit?",
    type: "single",
    options: [
      { value: "Slim Fit", Icon: Shirt },
      { value: "Regular Fit", Icon: Shirt },
      { value: "Relaxed Fit", Icon: Shirt },
      { value: "Oversized", Icon: Shirt },
    ],
  },
  {
    key: "colorMood",
    title: "Pick your color mood",
    type: "color",
    options: [
      { value: "Neutrals", swatch: "#9ca3af" },
      { value: "Earth Tones", swatch: "#92400e" },
      { value: "Bold & Bright", swatch: null },
      { value: "Navy & Blues", swatch: "#1e3a5f" },
    ],
  },
  {
    key: "budget",
    title: "What's your budget per item?",
    type: "single",
    options: [
      { value: "Under LKR 2,000", Icon: Tag },
      { value: "LKR 2,000\u20134,000", Icon: Tag },
      { value: "LKR 4,000\u20137,000", Icon: Tag },
      { value: "LKR 7,000+", Icon: Tag },
    ],
  },
  {
    key: "style",
    title: "How would you describe your style?",
    type: "style",
    options: [
      {
        value: "Classic & Timeless",
        subtitle: "Clean cuts, enduring pieces",
        Icon: Award,
      },
      {
        value: "Streetwear & Trends",
        subtitle: "Bold, current, expressive",
        Icon: Flame,
      },
      {
        value: "Smart Casual",
        subtitle: "Relaxed but put-together",
        Icon: Coffee,
      },
      {
        value: "Minimalist",
        subtitle: "Less is more",
        Icon: Minus,
      },
    ],
  },
  {
    key: "categories",
    title: "What are you shopping for?",
    type: "multi",
    options: [
      { value: "T-Shirts", Icon: Shirt },
      { value: "Shirts", Icon: Shirt },
      { value: "Trousers", Icon: Layers },
      { value: "Chinos", Icon: Layers },
      { value: "Jackets", Icon: Wind },
      { value: "Shorts", Icon: Sun },
      { value: "Activewear", Icon: Activity },
      { value: "Accessories", Icon: Watch },
    ],
  },
];

const TOTAL_STEPS = QUESTIONS.length;

const LOADING_MESSAGES = [
  "Analysing your style...",
  "Browsing our collection...",
  "Curating your perfect picks...",
];

// ─── Option Cards ─────────────────────────────────────────────────────────────

function SingleCard({ value, Icon, selected, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-2.5 p-4 rounded-xl border-2 text-center cursor-pointer transition-all duration-150 ${
        selected
          ? "border-amber-500 bg-amber-50"
          : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
      }`}
    >
      <Icon
        size={22}
        className={selected ? "text-amber-600" : "text-slate-400"}
      />
      <span
        className={`text-sm font-semibold leading-tight ${
          selected ? "text-amber-800" : "text-slate-700"
        }`}
      >
        {value}
      </span>
    </button>
  );
}

function ColorCard({ value, swatch, selected, onClick }) {
  const swatchStyle = swatch
    ? { backgroundColor: swatch }
    : {
        background:
          "linear-gradient(135deg, #ef4444 0%, #f97316 25%, #eab308 50%, #22c55e 70%, #3b82f6 85%, #8b5cf6 100%)",
      };

  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all duration-150 ${
        selected
          ? "border-amber-500 bg-amber-50"
          : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
      }`}
    >
      <div
        className="w-10 h-10 rounded-full shadow-sm ring-1 ring-black/10"
        style={swatchStyle}
      />
      <span
        className={`text-sm font-semibold ${
          selected ? "text-amber-800" : "text-slate-700"
        }`}
      >
        {value}
      </span>
    </button>
  );
}

function StyleCard({ value, subtitle, Icon, selected, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-2.5 p-5 rounded-xl border-2 text-center cursor-pointer transition-all duration-150 ${
        selected
          ? "border-amber-500 bg-amber-50"
          : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
      }`}
    >
      <Icon
        size={22}
        className={selected ? "text-amber-600" : "text-slate-400"}
      />
      <p
        className={`text-sm font-bold leading-tight ${
          selected ? "text-amber-800" : "text-slate-800"
        }`}
      >
        {value}
      </p>
      <p className="text-xs text-slate-400 italic leading-snug">{subtitle}</p>
    </button>
  );
}

function MultiCard({ value, Icon, selected, disabled, onClick }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex flex-col items-center gap-2.5 p-4 rounded-xl border-2 text-center cursor-pointer transition-all duration-150 ${
        selected
          ? "border-amber-500 bg-amber-50"
          : disabled
          ? "border-slate-100 cursor-not-allowed"
          : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
      }`}
    >
      <Icon
        size={22}
        className={
          selected ? "text-amber-600" : disabled ? "text-slate-300" : "text-slate-400"
        }
      />
      <span
        className={`text-sm font-semibold leading-tight ${
          selected
            ? "text-amber-800"
            : disabled
            ? "text-slate-300"
            : "text-slate-700"
        }`}
      >
        {value}
      </span>
    </button>
  );
}

// ─── Loading State ────────────────────────────────────────────────────────────

function LoadingCard({ msgIdx }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] py-20">
      <div className="bg-white rounded-2xl shadow-md px-10 py-12 flex flex-col items-center gap-6 max-w-xs w-full mx-4">
        <div className="w-12 h-12 rounded-full border-4 border-amber-100 border-t-amber-600 animate-spin" />
        <p className="text-slate-600 text-base font-medium text-center min-h-[1.5rem]">
          {LOADING_MESSAGES[msgIdx]}
        </p>
      </div>
    </div>
  );
}

// ─── Results Section ──────────────────────────────────────────────────────────

function ResultsSection({ results, onRetake }) {
  const navigate = useNavigate();

  return (
    <div className="py-8">
      {/* Header */}
      <div className="mb-8 text-center">
        <h2 className="text-2xl font-bold text-slate-900 mb-3">
          Your Style Picks{" "}
          <span role="img" aria-label="target">
            🎯
          </span>
        </h2>
        {results?.styleSummary && (
          <span className="inline-block bg-amber-50 text-amber-700 border border-amber-200 text-sm font-semibold px-4 py-1.5 rounded-full">
            {results.styleSummary}
          </span>
        )}
        {results?.totalFound != null && (
          <p className="text-slate-400 text-sm mt-3">
            {results.isFallback
              ? "Showing our closest picks \u2014 we couldn\u2019t find an exact match for all your preferences"
              : `${results.totalFound} product${results.totalFound !== 1 ? "s" : ""} matched your style profile`}
          </p>
        )}
      </div>

      {/* Grid or empty state */}
      {!results?.products?.length ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Wand2 size={40} className="text-slate-300 mb-4" />
          <p className="text-slate-600 font-semibold text-lg mb-2">
            We couldn&rsquo;t find an exact match
          </p>
          <p className="text-slate-400 text-sm mb-8">
            Try adjusting your answers to see more picks
          </p>
          <button
            onClick={onRetake}
            className="bg-amber-600 text-white px-6 py-2.5 rounded-full text-sm font-semibold hover:bg-amber-700 transition-colors"
          >
            Retake Quiz &rarr;
          </button>
        </div>
      ) : (
        <>
          {results.products.length <= 3 && (
            <p className="text-center text-slate-400 text-sm mb-6 italic">
              Showing our closest matches for your style
            </p>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-10">
            {results.products.map((product) => (
              <div key={product._id}>
                <ProductCard product={product} />
                {product.reason && (
                  <p className="text-xs text-slate-400 italic mt-1.5 px-1">
                    {product.reason}
                  </p>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Bottom actions */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-6 border-t border-slate-100">
        <p className="text-slate-400 text-sm">Not what you expected?</p>
        <div className="flex items-center gap-3">
          <button
            onClick={onRetake}
            className="text-amber-600 text-sm font-semibold hover:text-amber-700 transition-colors"
          >
            Retake Quiz &rarr;
          </button>
          <span className="text-slate-200 select-none">|</span>
          <button
            onClick={() => navigate("/home")}
            className="border border-slate-300 text-slate-600 text-sm font-medium px-4 py-1.5 rounded-full hover:border-slate-400 hover:text-slate-800 transition-colors"
          >
            Browse All Products
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Quiz Page ───────────────────────────────────────────────────────────

export default function StyleQuizPage() {
  const [phase, setPhase] = useState("quiz"); // "quiz" | "loading" | "results"
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(true);
  const [answers, setAnswers] = useState({
    occasion: null,
    fit: null,
    colorMood: null,
    budget: null,
    style: null,
    categories: [],
  });
  const [results, setResults] = useState(null);
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);
  const resultsRef = useRef(null);

  // Cycle loading messages every 500ms
  useEffect(() => {
    if (phase !== "loading") return;
    setLoadingMsgIdx(0);
    const timer = setInterval(() => {
      setLoadingMsgIdx((i) => (i + 1) % LOADING_MESSAGES.length);
    }, 500);
    return () => clearInterval(timer);
  }, [phase]);

  const q = QUESTIONS[step];

  const currentAnswer =
    q.key === "categories" ? answers.categories : answers[q.key];

  const isAnswered =
    q.type === "multi" ? answers.categories.length > 0 : currentAnswer !== null;

  // Animated transition between questions
  const transition = (callback) => {
    setVisible(false);
    setTimeout(() => {
      callback();
      setVisible(true);
    }, 150);
  };

  const selectOption = (value) => {
    if (q.type === "multi") {
      setAnswers((prev) => {
        const cats = prev.categories;
        if (cats.includes(value)) {
          return { ...prev, categories: cats.filter((c) => c !== value) };
        }
        if (cats.length >= 3) return prev;
        return { ...prev, categories: [...cats, value] };
      });
    } else {
      setAnswers((prev) => ({ ...prev, [q.key]: value }));
    }
  };

  const handleBack = () => {
    if (step === 0) return;
    transition(() => setStep((s) => s - 1));
  };

  const handleNext = async () => {
    if (!isAnswered) return;

    if (step < TOTAL_STEPS - 1) {
      transition(() => setStep((s) => s + 1));
      return;
    }

    // Last step — submit
    setPhase("loading");
    const loadingStart = Date.now();

    try {
      const result = await api.submitStyleQuiz({
        occasion: answers.occasion,
        fit: answers.fit,
        colorMood: answers.colorMood,
        budget: answers.budget,
        style: answers.style,
        categories: answers.categories,
      });

      const elapsed = Date.now() - loadingStart;
      const remaining = Math.max(0, 1500 - elapsed);

      setTimeout(() => {
        setResults(result);
        setPhase("results");
        setTimeout(() => {
          resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 100);
      }, remaining);
    } catch {
      setPhase("quiz");
    }
  };

  const handleRetake = () => {
    setAnswers({
      occasion: null,
      fit: null,
      colorMood: null,
      budget: null,
      style: null,
      categories: [],
    });
    setResults(null);
    setStep(0);
    setVisible(true);
    setPhase("quiz");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const progressPct = ((step + 1) / TOTAL_STEPS) * 100;

  // ── Loading phase ───────────────────────────────────────────────────────────

  if (phase === "loading") {
    return <LoadingCard msgIdx={loadingMsgIdx} />;
  }

  // ── Results phase ───────────────────────────────────────────────────────────

  if (phase === "results") {
    return (
      <div ref={resultsRef}>
        <ResultsSection results={results} onRetake={handleRetake} />
      </div>
    );
  }

  // ── Quiz phase ──────────────────────────────────────────────────────────────

  return (
    <div className="max-w-2xl mx-auto py-8 px-2 sm:px-0">
      {/* Page header */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-2.5 mb-2">
          <Wand2 size={22} className="text-amber-600" />
          <h1 className="text-2xl font-bold text-slate-900">
            Smart Fit Style Quiz
          </h1>
        </div>
        <p className="text-slate-500 text-sm">
          Answer 6 quick questions and we&rsquo;ll find your perfect picks
        </p>
      </div>

      {/* Progress bar */}
      <div className="mb-8">
        <div className="flex justify-end mb-2">
          <span className="text-xs text-slate-400 font-medium tabular-nums">
            Step {step + 1} of {TOTAL_STEPS}
          </span>
        </div>
        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-amber-600 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Question card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 px-6 py-8 mb-6">
        <div
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(12px)",
            transition: "opacity 200ms ease-out, transform 200ms ease-out",
          }}
        >
          {/* Question title */}
          <h2 className="text-xl font-bold text-slate-900 text-center mb-6">
            {q.title}
          </h2>

          {/* Single-select options */}
          {q.type === "single" && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {q.options.map(({ value, Icon }) => (
                <SingleCard
                  key={value}
                  value={value}
                  Icon={Icon}
                  selected={currentAnswer === value}
                  onClick={() => selectOption(value)}
                />
              ))}
            </div>
          )}

          {/* Color swatch options */}
          {q.type === "color" && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {q.options.map(({ value, swatch }) => (
                <ColorCard
                  key={value}
                  value={value}
                  swatch={swatch}
                  selected={currentAnswer === value}
                  onClick={() => selectOption(value)}
                />
              ))}
            </div>
          )}

          {/* Style options (icon + label + italic subtitle) */}
          {q.type === "style" && (
            <div className="grid grid-cols-2 gap-3">
              {q.options.map(({ value, subtitle, Icon }) => (
                <StyleCard
                  key={value}
                  value={value}
                  subtitle={subtitle}
                  Icon={Icon}
                  selected={currentAnswer === value}
                  onClick={() => selectOption(value)}
                />
              ))}
            </div>
          )}

          {/* Multi-select options */}
          {q.type === "multi" && (
            <>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs text-slate-400">Select up to 3</span>
                {answers.categories.length > 0 && (
                  <span className="text-xs bg-amber-600 text-white font-bold px-2.5 py-1 rounded-full">
                    {answers.categories.length} selected
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {q.options.map(({ value, Icon }) => {
                  const selected = answers.categories.includes(value);
                  const atLimit =
                    answers.categories.length >= 3 && !selected;
                  return (
                    <MultiCard
                      key={value}
                      value={value}
                      Icon={Icon}
                      selected={selected}
                      disabled={atLimit}
                      onClick={() => selectOption(value)}
                    />
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between px-1">
        <div>
          {step > 0 && (
            <button
              onClick={handleBack}
              className="text-slate-500 text-sm hover:text-slate-800 transition-colors"
            >
              &larr; Back
            </button>
          )}
        </div>

        <button
          onClick={handleNext}
          disabled={!isAnswered}
          className={`px-6 py-2.5 rounded-full text-sm font-semibold transition-all duration-150 ${
            isAnswered
              ? "bg-amber-600 text-white hover:bg-amber-700 shadow-sm hover:shadow"
              : "bg-slate-100 text-slate-400 cursor-not-allowed"
          }`}
        >
          {step === TOTAL_STEPS - 1 ? "See My Picks \u2192" : "Next \u2192"}
        </button>
      </div>
    </div>
  );
}
