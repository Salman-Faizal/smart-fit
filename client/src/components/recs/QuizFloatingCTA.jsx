import { useNavigate } from "react-router-dom";
import { Wand2 } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";

export default function QuizFloatingCTA() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) return null;

  return (
    <>
      <style>{`
        @keyframes quiz-ring-pulse {
          0% { box-shadow: 0 0 0 0 rgba(217, 119, 6, 0.4); }
          100% { box-shadow: 0 0 0 12px rgba(217, 119, 6, 0); }
        }
        .quiz-ring-pulse {
          animation: quiz-ring-pulse 1.5s ease-out infinite;
        }
        .quiz-pill {
          display: inline-flex;
          align-items: center;
          overflow: hidden;
          width: 48px;
          transition: width 0.3s ease;
          white-space: nowrap;
        }
        .quiz-pill:hover {
          width: 180px;
        }
        .quiz-pill-text {
          opacity: 0;
          width: 0;
          transition: opacity 0.25s ease 0.05s, width 0.3s ease;
          overflow: hidden;
        }
        .quiz-pill:hover .quiz-pill-text {
          opacity: 1;
          width: auto;
        }
      `}</style>

      <div className="fixed bottom-6 right-4 sm:right-6 z-50">
        <button
          type="button"
          onClick={() => navigate("/quiz")}
          className="quiz-pill quiz-ring-pulse h-12 rounded-full bg-amber-600 text-white shadow-lg hover:shadow-xl cursor-pointer select-none flex-row-reverse"
          aria-label="Find your style"
        >
          {/* Icon — always visible, on the right */}
          <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center">
            <Wand2 size={20} />
          </span>
          {/* Text — revealed on hover, on the left */}
          <span className="quiz-pill-text pl-4 text-sm font-semibold tracking-wide">
            Find your style
          </span>
        </button>
      </div>
    </>
  );
}
