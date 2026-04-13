import { useNavigate } from "react-router-dom";

export default function QuizFloatingCTA() {
  const navigate = useNavigate();

  return (
    <div className="fixed bottom-6 right-4 sm:right-5 z-50 group">
      <div className="flex items-center">
        <div className="overflow-hidden">
          <div
            className="
            whitespace-nowrap
            rounded-lg
            bg-gray-800
            text-gray-200
            text-sm font-medium
            px-3 py-2
            shadow-lg
            transition-all duration-300 ease-out

            opacity-0
            translate-x-4
            max-w-0

            group-hover:opacity-100
            group-hover:translate-x-0
            group-hover:max-w-xs
            mr-3
          "
          >
            Not sure what fits you?
          </div>
        </div>

        <button
          onClick={() => navigate("/style-quiz")}
          className="
            flex items-center justify-center
            h-10 w-10
            rounded-full
            bg-white
            shadow-md
            transition-all duration-300

            hover:shadow-lg
            hover:scale-105
          "
        >
          {/* Sparkles SVG */}
          <svg
            viewBox="0 0 24 24"
            className="w-4 h-4 text-amber-600"
            fill="currentColor"
          >
            <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
