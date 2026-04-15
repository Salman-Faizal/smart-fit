import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Wand2, X } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";

const SESSION_KEY = "smartfit_quiz_cta_dismissed";

export default function QuizFloatingCTA() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem(SESSION_KEY) === "1") {
      setDismissed(true);
    }
  }, []);

  if (!isAuthenticated || dismissed) return null;

  const handleDismiss = (e) => {
    e.stopPropagation();
    sessionStorage.setItem(SESSION_KEY, "1");
    setDismissed(true);
  };

  return (
    <>
      <style>{`
        @keyframes wand-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
        .quiz-wand-pulse {
          animation: wand-pulse 2s ease-in-out infinite;
          display: flex;
          align-items: center;
        }
      `}</style>

      <div className="fixed bottom-6 right-4 sm:right-6 z-50 flex items-center gap-2">
        <button
          onClick={() => navigate("/quiz")}
          className="flex items-center gap-2.5 bg-amber-600 text-white pl-4 pr-5 py-3 rounded-full shadow-lg hover:shadow-xl hover:scale-[1.03] transition-all duration-200 ease-out select-none"
        >
          <span className="quiz-wand-pulse">
            <Wand2 size={17} />
          </span>
          <span className="text-sm font-semibold whitespace-nowrap tracking-wide">
            Find your style
          </span>
        </button>

        <button
          onClick={handleDismiss}
          aria-label="Dismiss style quiz"
          className="flex items-center justify-center w-7 h-7 rounded-full bg-white shadow text-slate-400 hover:text-slate-700 hover:shadow-md transition-all duration-150"
        >
          <X size={13} strokeWidth={2.5} />
        </button>
      </div>
    </>
  );
}
