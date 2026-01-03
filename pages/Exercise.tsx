import React, { useEffect, useState, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useStore } from "../context/StoreContext";
import { MemoryItem, QuestionData, ItemType } from "../types";
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  RefreshCw,
  Home,
  ArrowRight,
  Infinity,
} from "lucide-react";
import {
  playCorrect,
  playIncorrect,
  playFinish,
  withSound,
} from "../utils/sound";

enum GameState {
  PREPARING,
  PLAYING,
  FEEDBACK,
  FINISHED,
}

const Exercise: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { items, settings, updateStats } = useStore();

  const mode = (location.state?.mode as "normal" | "infinite") || "normal";
  const filter =
    (location.state?.filter as "MIX" | "WORD" | "DEFINITION") || "MIX";

  const [gameState, setGameState] = useState<GameState>(GameState.PREPARING);
  const [questions, setQuestions] = useState<QuestionData[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState(false);
  const [shuffledOptions, setShuffledOptions] = useState<string[]>([]);
  const [sessionStats, setSessionStats] = useState({
    correct: 0,
    incorrect: 0,
  });

  // Shuffle array utility
  const shuffle = <T,>(array: T[]): T[] => {
    return [...array].sort(() => Math.random() - 0.5);
  };

  // Generate Questions Logic
  const generateQuestions = useCallback(
    (count: number): QuestionData[] => {
      // 1. Filter by active
      let activeItems: MemoryItem[] = items.filter(
        (i: MemoryItem) => i.isActive
      );

      // 2. Filter by Type choice
      if (filter === "WORD") {
        activeItems = activeItems.filter((i) => i.type === ItemType.WORD);
      } else if (filter === "DEFINITION") {
        activeItems = activeItems.filter((i) => i.type === ItemType.DEFINITION);
      }

      if (activeItems.length < 4) return [];

      const sessionItems = shuffle<MemoryItem>(activeItems).slice(0, count);

      return sessionItems.map((targetItem) => {
        let questionText = "";
        let correctAnswerText = "";

        if (targetItem.type === ItemType.DEFINITION) {
          questionText = targetItem.description || "";
          correctAnswerText = targetItem.term;
        } else {
          const showTermAsQuestion = Math.random() > 0.5;
          if (showTermAsQuestion) {
            questionText = targetItem.term;
            correctAnswerText =
              targetItem.meanings[
                Math.floor(Math.random() * targetItem.meanings.length)
              ];
          } else {
            questionText =
              targetItem.meanings[
                Math.floor(Math.random() * targetItem.meanings.length)
              ];
            correctAnswerText = targetItem.term;
          }
        }

        // Generate Distractors (Total options should be 4, so 3 distractors)
        const potentialDistractors = activeItems
          .filter((i) => i.id !== targetItem.id)
          .map((i) => {
            if (targetItem.type === ItemType.DEFINITION) return i.term;
            if (
              targetItem.type === ItemType.WORD &&
              correctAnswerText === targetItem.term
            ) {
              return i.term;
            } else {
              return i.meanings.length > 0 ? i.meanings[0] : i.term;
            }
          });

        const distractors = shuffle(potentialDistractors).slice(0, 3); // 3 Distractors + 1 Correct = 4 Total

        return {
          item: targetItem,
          questionText,
          correctAnswerText,
          distractors,
        };
      });
    },
    [items, filter]
  );

  // Initial Setup
  useEffect(() => {
    if (questions.length > 0) return; // Prevent regeneration on state updates

    const initialCount = mode === "infinite" ? 1 : 10;
    const newQuestions = generateQuestions(initialCount);

    if (newQuestions.length > 0) {
      setQuestions(newQuestions);
      setGameState(GameState.PLAYING);
    }
  }, [items, mode, generateQuestions, questions.length]);

  // Set options for current question
  useEffect(() => {
    if (gameState === GameState.PLAYING && questions[currentIndex]) {
      const q = questions[currentIndex];
      const options = shuffle([q.correctAnswerText, ...q.distractors]);
      setShuffledOptions(options);
      setSelectedAnswer(null);
    }
  }, [gameState, currentIndex, questions]);

  // Effect for Finish Sound
  useEffect(() => {
    if (gameState === GameState.FINISHED) {
      // Small delay to let the UI transition visually first
      const timer = setTimeout(() => {
        playFinish();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [gameState]);

  const handleAnswer = (answer: string) => {
    if (gameState !== GameState.PLAYING) return;

    const currentQ = questions[currentIndex];
    if (!currentQ) return;

    setSelectedAnswer(answer);
    const correct = answer === currentQ.correctAnswerText;

    // Play Sound
    if (correct) {
      playCorrect();
    } else {
      playIncorrect();
    }

    setIsCorrect(correct);

    // Slight delay before showing feedback modal to allow button animation to finish
    // Not strictly using withSound because we want the specific answer sounds, not the generic click
    setTimeout(() => {
      setGameState(GameState.FEEDBACK);
    }, 150);

    updateStats(currentQ.item.id, correct);

    setSessionStats((prev) => ({
      correct: prev.correct + (correct ? 1 : 0),
      incorrect: prev.incorrect + (correct ? 0 : 1),
    }));
  };

  const handleNextQuestion = () => {
    withSound(() => {
      if (mode === "infinite") {
        // Generate one new question and append it
        const nextQ = generateQuestions(1)[0];
        setQuestions((prev) => [...prev, nextQ]);
        setCurrentIndex((prev) => prev + 1);
        setGameState(GameState.PLAYING);
      } else {
        // Normal Mode
        if (currentIndex < questions.length - 1) {
          setCurrentIndex((prev) => prev + 1);
          setGameState(GameState.PLAYING);
        } else {
          setGameState(GameState.FINISHED);
        }
      }
    });
  };

  const handleExit = () => {
    withSound(() => {
      if (
        mode === "infinite" &&
        (sessionStats.correct > 0 || sessionStats.incorrect > 0)
      ) {
        // In infinite mode, back button ends the session so stats can be seen
        setGameState(GameState.FINISHED);
      } else {
        navigate("/");
      }
    });
  };

  const getFilteredCount = () => {
    let count = 0;
    if (filter === "MIX") count = items.filter((i) => i.isActive).length;
    if (filter === "WORD")
      count = items.filter(
        (i) => i.isActive && i.type === ItemType.WORD
      ).length;
    if (filter === "DEFINITION")
      count = items.filter(
        (i) => i.isActive && i.type === ItemType.DEFINITION
      ).length;
    return count;
  };

  if (getFilteredCount() < 4) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center">
        <div className="p-4 mb-4 border-2 rounded-full bg-amber-100 text-amber-600 border-amber-200">
          <XCircle size={32} />
        </div>
        <h2 className="mb-2 text-xl font-bold text-slate-800">
          Not Enough Data
        </h2>
        <p className="mb-6 font-medium text-slate-500">
          You need at least 4 active items
          {filter !== "MIX" ? ` of type '${filter}'` : ""} to start.
        </p>
        <button
          onClick={() => withSound(() => navigate("/"))}
          className="px-6 py-3 font-bold text-white transition-all bg-indigo-500 border-b-4 border-indigo-700 rounded-xl active:border-b-0 active:translate-y-1"
        >
          Back Home
        </button>
      </div>
    );
  }

  // Finished Screen
  if (gameState === GameState.FINISHED) {
    const totalAnswered = sessionStats.correct + sessionStats.incorrect;
    const accuracy =
      totalAnswered > 0
        ? Math.round((sessionStats.correct / totalAnswered) * 100)
        : 0;

    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-slate-50 animate-in fade-in duration-700">
        <div className="w-full max-w-sm mx-auto space-y-8">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center p-4 mb-4 bg-white rounded-full text-indigo-500 animate-in zoom-in duration-500 delay-150">
              {mode === "infinite" ? (
                <Infinity size={48} />
              ) : (
                <CheckCircle size={48} />
              )}
            </div>
            <h1 className="text-3xl font-black text-slate-800 tracking-tight">
              {mode === "infinite" ? "Session Paused" : "All Done!"}
            </h1>
            <p className="text-slate-500 font-medium">
              {mode === "infinite"
                ? "Great mental workout."
                : "You've completed your set."}
            </p>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-slate-100 space-y-6 animate-in slide-in-from-bottom-8 duration-700 delay-200">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-emerald-50 text-center border border-emerald-100">
                <span className="block text-3xl font-black text-emerald-500">
                  {sessionStats.correct}
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-600/70">
                  Correct
                </span>
              </div>
              <div className="p-4 rounded-2xl bg-rose-50 text-center border border-rose-100">
                <span className="block text-3xl font-black text-rose-500">
                  {sessionStats.incorrect}
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-rose-600/70">
                  Incorrect
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm font-bold text-slate-400 uppercase tracking-wider">
                <span>Accuracy</span>
                <span>{accuracy}%</span>
              </div>
              <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-500 rounded-full transition-all duration-1000 ease-out"
                  style={{ width: `${accuracy}%` }}
                />
              </div>
            </div>
          </div>

          <button
            onClick={() => withSound(() => navigate("/"))}
            className="w-full py-4 text-lg font-bold text-white uppercase tracking-widest bg-slate-800 rounded-2xl border-b-4 border-slate-950 hover:bg-slate-700 transition-all active:border-b-0 active:translate-y-1 animate-in fade-in duration-700 delay-500"
          >
            Back to Library
          </button>
        </div>
      </div>
    );
  }

  if (gameState === GameState.PREPARING)
    return (
      <div className="flex items-center justify-center min-h-screen font-bold text-indigo-500">
        Preparing...
      </div>
    );

  const currentQ = questions[currentIndex];
  if (!currentQ && gameState === GameState.PLAYING) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        Loading Question...
      </div>
    );
  }

  const progress =
    mode === "infinite" ? 100 : (currentIndex / questions.length) * 100;

  return (
    <div className="relative flex flex-col min-h-screen overflow-hidden bg-white">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 py-4 bg-white border-b-2 border-slate-100">
        <button
          onClick={handleExit}
          className="p-2 transition-colors text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl"
        >
          <ArrowLeft size={24} strokeWidth={2.5} />
        </button>

        {mode === "normal" ? (
          <div className="flex-1 h-4 mx-4 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full transition-all duration-300 ease-out bg-indigo-500 rounded-full"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        ) : (
          <div className="flex items-center justify-center flex-1 gap-1 text-xs font-black tracking-widest text-center uppercase text-slate-300">
            <Infinity size={14} />
            <span>Infinite Mode</span>
          </div>
        )}

        <div className="w-16 text-sm font-bold text-right text-slate-400">
          {mode === "infinite"
            ? `#${currentIndex + 1}`
            : `${currentIndex + 1} / ${questions.length}`}
        </div>
      </div>

      {/* Question Area */}
      <div className="flex flex-col items-center flex-1 w-full max-w-2xl p-6 pb-32 mx-auto">
        <div className="w-full flex-1 flex flex-col items-center justify-center min-h-[200px] mb-8">
          <h3 className="mb-4 text-xs font-black tracking-widest uppercase text-slate-300">
            {currentQ?.item.type === ItemType.WORD
              ? "Translate / Identify"
              : "Define"}
          </h3>
          <div
            className={`leading-relaxed duration-300 text-slate-700 animate-in zoom-in-95 ${
              currentQ?.item.type === ItemType.DEFINITION
                ? "text-lg font-bold text-left px-4"
                : "text-2xl md:text-3xl font-black text-center"
            }`}
          >
            "{currentQ?.questionText}"
          </div>
        </div>

        {/* Options Grid */}
        <div className="grid w-full gap-4">
          {shuffledOptions.map((option, idx) => {
            // Colors based on state
            let btnClass =
              "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"; // Default
            let borderClass = "border-2 border-b-4";

            // Logic for feedback state
            if (gameState === GameState.FEEDBACK) {
              if (option === currentQ.correctAnswerText) {
                // Correct Answer (Green)
                btnClass = "bg-emerald-500 border-emerald-600 text-white";
              } else if (
                option === selectedAnswer &&
                option !== currentQ.correctAnswerText
              ) {
                // Wrong Selection (Red)
                btnClass = "bg-rose-500 border-rose-600 text-white";
              } else {
                // Unselected (Dimmed)
                btnClass =
                  "bg-slate-50 border-transparent text-slate-300 opacity-40";
                borderClass = "border-2";
              }
            }

            return (
              <button
                key={idx}
                disabled={gameState === GameState.FEEDBACK}
                onClick={() => handleAnswer(option)}
                className={`w-full p-4 rounded-2xl font-bold text-lg transition-all duration-100 transform active:scale-[0.98] active:border-b-2 active:translate-y-[2px] ${borderClass} ${btnClass} flex items-center justify-between group`}
              >
                <span>{option}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Feedback Popup / Bottom Sheet */}
      {gameState === GameState.FEEDBACK && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end pointer-events-none">
          {/* Overlay gradient */}
          <div className="absolute inset-0 bg-slate-900/10 pointer-events-auto backdrop-blur-[1px]" />

          <div
            className={`relative pointer-events-auto p-6 pb-8 rounded-t-3xl border-t-2 animate-in slide-in-from-bottom duration-300 ${
              isCorrect
                ? "bg-emerald-50 border-emerald-100"
                : "bg-rose-50 border-rose-100"
            }`}
          >
            <div className="flex flex-col max-w-2xl gap-6 mx-auto">
              <div className="flex items-center space-x-4">
                <div
                  className={`flex-shrink-0 p-3 rounded-full ${
                    isCorrect
                      ? "bg-emerald-100 text-emerald-600"
                      : "bg-rose-100 text-rose-600"
                  }`}
                >
                  {isCorrect ? (
                    <CheckCircle size={32} strokeWidth={3} />
                  ) : (
                    <XCircle size={32} strokeWidth={3} />
                  )}
                </div>
                <div>
                  <h3
                    className={`text-2xl font-black ${
                      isCorrect ? "text-emerald-700" : "text-rose-700"
                    }`}
                  >
                    {isCorrect ? "Excellent!" : "Incorrect"}
                  </h3>
                  {!isCorrect && (
                    <div className="mt-1 text-rose-600">
                      <span className="text-xs font-bold uppercase opacity-70">
                        Correct Answer
                      </span>
                      <div className="text-lg font-bold leading-tight">
                        {currentQ.correctAnswerText}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <button
                onClick={handleNextQuestion}
                className={`w-full py-3 rounded-3xl font-bold text-lg text-white border-b-4 active:border-b-0 active:translate-y-1 transition-all flex items-center justify-center space-x-2 uppercase tracking-wide ${
                  isCorrect
                    ? "bg-emerald-500 border-2 border-emerald-700 hover:bg-emerald-600"
                    : "bg-rose-500 border-2 border-rose-700 hover:bg-rose-600"
                }`}
              >
                <span>Continue</span>
                <ArrowRight size={24} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Exercise;
