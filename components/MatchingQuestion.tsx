import React, { useState, useEffect } from "react";
import { MatchingPair } from "../types";
import { playCorrect, playIncorrect, withSound } from "../utils/sound";
import { Check } from "lucide-react"; // Menghapus X karena tidak digunakan

interface MatchingQuestionProps {
  pairs: MatchingPair[];
  onComplete: () => void;
}

const MatchingQuestion: React.FC<MatchingQuestionProps> = ({
  pairs,
  onComplete,
}) => {
  const [shuffledLeft, setShuffledLeft] = useState<MatchingPair[]>([]);
  const [shuffledRight, setShuffledRight] = useState<MatchingPair[]>([]);

  const [selectedLeftId, setSelectedLeftId] = useState<string | null>(null);
  const [matchedIds, setMatchedIds] = useState<Set<string>>(new Set());
  const [errorPair, setErrorPair] = useState<{
    left: string;
    right: string;
  } | null>(null);

  // Initialize and shuffle
  useEffect(() => {
    const shuffle = <T,>(array: T[]): T[] =>
      [...array].sort(() => Math.random() - 0.5);

    setShuffledLeft(shuffle(pairs));
    setShuffledRight(shuffle(pairs));
    setMatchedIds(new Set());
    setSelectedLeftId(null);
    setErrorPair(null);
  }, [pairs]);

  const hasCompleted = React.useRef(false);

  useEffect(() => {
    if (matchedIds.size === pairs.length && pairs.length > 0) {
      if (hasCompleted.current) return;

      const timer = setTimeout(() => {
        if (!hasCompleted.current) {
          hasCompleted.current = true;
          onComplete();
        }
      }, 100);
      return () => clearTimeout(timer);
    } else {
      // Reset if pairs change (new question)
      hasCompleted.current = false;
    }
  }, [matchedIds, pairs.length, onComplete]);

  const handleLeftClick = (id: string) => {
    if (matchedIds.has(id) || errorPair !== null) return;

    withSound(() => {
      setSelectedLeftId(id);
    });
  };

  const handleRightClick = (id: string) => {
    if (matchedIds.has(id)) return;
    if (!selectedLeftId) return;
    if (errorPair !== null) return;

    const isMatch = id === selectedLeftId;

    if (isMatch) {
      playCorrect();
      setMatchedIds((prev) => {
        const newSet = new Set(prev);
        newSet.add(id);
        return newSet;
      });
      setSelectedLeftId(null);
    } else {
      playIncorrect();
      setErrorPair({ left: selectedLeftId, right: id });

      setTimeout(() => {
        setErrorPair(null);
        setSelectedLeftId(null);
      }, 500);
    }
  };

  return (
    <div className="w-full flex flex-col items-center max-w-4xl mx-auto px-2 py-4 animate-in fade-in slide-in-from-bottom-4 duration-500 my-auto">
      <div className="mb-4 text-center">
        <h3 className="text-xs font-black tracking-widest uppercase text-slate-400 mb-1">
          Match Pairs
        </h3>
      </div>

      <div className="flex w-full gap-2 md:gap-6 justify-between items-stretch">
        {/* Left Column */}
        <div className="flex-1 flex flex-col gap-2">
          {shuffledLeft.map((pair) => {
            const isMatched = matchedIds.has(pair.id);
            const isSelected = selectedLeftId === pair.id;
            const isShaking = errorPair?.left === pair.id;
            const showContent = isMatched || isSelected;

            return (
              <button
                key={`left-${pair.id}`}
                type="button"
                onClick={() => handleLeftClick(pair.id)}
                disabled={isMatched || isShaking || errorPair !== null}
                className={`
                  relative min-h-[6rem] w-full rounded-xl border-2 flex items-center justify-center p-3 text-center transition-all duration-200
                  ${isShaking ? "animate-shake bg-rose-50 border-rose-300" : ""}
                  ${
                    !isShaking && isMatched
                      ? "bg-emerald-50 border-emerald-100 text-emerald-800 opacity-50 scale-95"
                      : ""
                  }
                  ${
                    !isShaking && !isMatched && isSelected
                      ? "bg-indigo-500 border-indigo-600 text-white z-10 scale-[1.02]"
                      : ""
                  }
                  ${
                    !isShaking && !isMatched && !isSelected
                      ? "bg-white border-slate-200 active:bg-slate-50 text-slate-700"
                      : ""
                  }
                `}
              >
                {showContent ? (
                  <span className="font-bold text-2xl sm:text-2xl leading-tight break-words w-full animate-in zoom-in duration-200">
                    {pair.leftContent}
                  </span>
                ) : (
                  <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center">
                    <span className="font-bold text-lg text-slate-300">?</span>
                  </div>
                )}

                {isMatched && (
                  <div className="absolute top-1 right-1 text-emerald-500">
                    <Check size={14} strokeWidth={3} />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Right Column */}
        <div className="flex-1 flex flex-col gap-2">
          {shuffledRight.map((pair) => {
            const isMatched = matchedIds.has(pair.id);
            const isShaking = errorPair?.right === pair.id;

            return (
              <button
                key={`right-${pair.id}`}
                type="button"
                onClick={() => handleRightClick(pair.id)}
                disabled={isMatched || isShaking || errorPair !== null}
                className={`
                  relative min-h-[6rem] w-full rounded-xl border-2 flex items-center justify-center p-2 text-center transition-all duration-200
                  ${isShaking ? "animate-shake bg-rose-50 border-rose-300" : ""}
                  ${
                    !isShaking && isMatched
                      ? "bg-emerald-50 border-emerald-100 text-emerald-800 opacity-50 scale-95"
                      : ""
                  }
                  ${
                    !isShaking && !isMatched
                      ? "bg-white border-slate-200 active:bg-indigo-50 active:border-indigo-200 text-slate-700"
                      : ""
                  }
                `}
              >
                <span className="font-bold text-2xl sm:text-2xl leading-tight break-words w-full">
                  {pair.rightContent}
                </span>

                {isMatched && (
                  <div className="absolute top-1 right-1 text-emerald-500">
                    <Check size={14} strokeWidth={3} />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        .animate-shake {
          animation: shake 0.3s cubic-bezier(.36,.07,.19,.97) both;
        }
      `}</style>
    </div>
  );
};

export default MatchingQuestion;
