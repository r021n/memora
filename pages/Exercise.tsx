import React, { useEffect, useState, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useStore } from "../context/StoreContext";
import {
  MemoryItem,
  QuestionData,
  ItemType,
  QuestionType,
  MatchingPair,
} from "../types";
import MatchingQuestion from "../components/MatchingQuestion";
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
    (location.state?.filter as "MIX" | "WORD" | "DEFINITION" | "CATEGORY") ||
    "MIX";
  const categoryId = location.state?.categoryId as string | undefined;

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
    (count: number, startIndex: number = 0): QuestionData[] => {
      // 1. Filter by active
      let activeItems: MemoryItem[] = items.filter(
        (i: MemoryItem) => i.isActive
      );

      // 2. Filter by Type choice
      if (filter === "WORD") {
        activeItems = activeItems.filter((i) => i.type === ItemType.WORD);
      } else if (filter === "DEFINITION") {
        activeItems = activeItems.filter((i) => i.type === ItemType.DEFINITION);
      } else if (filter === "CATEGORY" && categoryId) {
        activeItems = activeItems.filter((i) => i.categoryId === categoryId);
      }

      // Check if we have enough items AFTER filtering
      if (activeItems.length < 4) return [];

      const generated: QuestionData[] = [];

      // Separate words for matching mode
      const wordItems = activeItems.filter((i) => i.type === ItemType.WORD);

      // Shuffle active items for normal questions to ensure variety
      const shuffledActive = shuffle(activeItems);
      let normalIndex = 0;

      for (let i = 0; i < count; i++) {
        const globalIndex = startIndex + i + 1;
        const isMatchingRound = globalIndex % 4 === 0;

        // Matching Mode Logic
        if (
          isMatchingRound &&
          filter !== "DEFINITION" &&
          wordItems.length >= 4
        ) {
          const selected = shuffle(wordItems).slice(0, 4);
          const pairs: MatchingPair[] = selected.map((item) => {
            const showTermLeft = Math.random() > 0.5;
            const hasMeanings = item.meanings && item.meanings.length > 0;
            const meaning = hasMeanings ? item.meanings[0] : "???";

            return {
              id: item.id,
              leftContent: showTermLeft ? item.term : meaning,
              rightContent: showTermLeft ? meaning : item.term,
              item: item,
            };
          });

          generated.push({
            type: QuestionType.MATCHING,
            pairs: pairs,
          });
          continue;
        }

        // Normal Question Logic
        // Wrap around if we run out of unique items in this batch
        const targetItem = shuffledActive[normalIndex % shuffledActive.length];
        normalIndex++;

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

        // Generate Distractors
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

        const uniqueDistractors = Array.from(new Set(potentialDistractors));
        const distractors = shuffle(uniqueDistractors).slice(0, 3);

        generated.push({
          type: QuestionType.MULTIPLE_CHOICE,
          item: targetItem,
          questionText,
          correctAnswerText,
          distractors,
        });
      }

      return generated;
    },
    [items, filter, categoryId]
  );

  // Initial Setup
  useEffect(() => {
    // If we already have questions, don't regen
    if (questions.length > 0) return;

    // Check if we have enough data BEFORE trying to generate
    const count = getFilteredCount();
    if (count < 4) {
      // If not enough data, we won't generate questions.
      // The render logic below will switch to "Not Enough Data" view automatically
      // because we check `getFilteredCount() < 4`
      return;
    }

    const initialCount = mode === "infinite" ? 1 : 10;
    const newQuestions = generateQuestions(initialCount);

    if (newQuestions.length > 0) {
      setQuestions(newQuestions);
      setGameState(GameState.PLAYING);
    }
  }, [items, mode, generateQuestions, questions.length, filter, categoryId]);

  // Set options for current question
  useEffect(() => {
    if (gameState === GameState.PLAYING && questions[currentIndex]) {
      const q = questions[currentIndex];
      if (
        q.type === QuestionType.MULTIPLE_CHOICE &&
        q.correctAnswerText &&
        q.distractors
      ) {
        const options = shuffle([q.correctAnswerText, ...q.distractors]);
        setShuffledOptions(options);
      }
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

  const isNavigating = React.useRef(false); // Ref to prevent double navigation

  const handleMatchingComplete = useCallback(
    (pairs: MatchingPair[]) => {
      // Treat the whole matching session as 1 "Correct" point for the session stats
      // But update stats for all involved items

      pairs.forEach((p) => {
        updateStats(p.item.id, true);
      });

      setSessionStats((prev) => ({
        correct: prev.correct + 1,
        incorrect: prev.incorrect,
      }));

      setIsCorrect(true);

      setTimeout(() => {
        setGameState(GameState.FEEDBACK);
      }, 50); // Very fast transition for matching mode
    },
    [updateStats]
  );

  const handleAnswer = (answer: string) => {
    if (gameState !== GameState.PLAYING) return;

    const currentQ = questions[currentIndex];
    if (!currentQ || currentQ.type !== QuestionType.MULTIPLE_CHOICE) return;

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

    if (currentQ.item) {
      updateStats(currentQ.item.id, correct);
    }

    setSessionStats((prev) => ({
      correct: prev.correct + (correct ? 1 : 0),
      incorrect: prev.incorrect + (correct ? 0 : 1),
    }));
  };

  const handleNextQuestion = () => {
    // Prevent double clicks / race conditions
    if (gameState === GameState.PLAYING) return;
    if (isNavigating.current) return;

    isNavigating.current = true;

    withSound(() => {
      if (mode === "infinite") {
        // Generate one new question and append it
        // Pass current length to keep "Multiple of 4" logic consistent
        const nextQ = generateQuestions(1, questions.length)[0];
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

      // Release lock after a short delay
      setTimeout(() => {
        isNavigating.current = false;
      }, 500);
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

  const getFilteredCount = useCallback(() => {
    let activeItems = items.filter((i) => i.isActive);

    if (filter === "WORD") {
      activeItems = activeItems.filter((i) => i.type === ItemType.WORD);
    } else if (filter === "DEFINITION") {
      activeItems = activeItems.filter((i) => i.type === ItemType.DEFINITION);
    } else if (filter === "CATEGORY" && categoryId) {
      activeItems = activeItems.filter((i) => i.categoryId === categoryId);
    }

    return activeItems.length;
  }, [items, filter, categoryId]);

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
          We found <strong>{getFilteredCount()}</strong> active items for this
          selection.
          <br />
          You need at least <strong>4</strong> active items to start.
        </p>
        <button
          onClick={() => {
            const btn = document.activeElement as HTMLButtonElement;
            if (btn) {
              btn.style.transform = "translateY(4px)";
              btn.style.borderBottomWidth = "2px";
            }
            setTimeout(() => {
              withSound(() => navigate("/"));
            }, 150);
          }}
          className="px-6 py-3 font-bold text-white bg-indigo-500 border-2 border-indigo-500 border-b-[6px] border-b-indigo-700 rounded-xl transition-transform active:translate-y-1 active:border-b-2"
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

    const handleBackToLibrary = () => {
      const button = document.activeElement as HTMLButtonElement;
      if (button) {
        button.style.transform = "translateY(4px)";
        button.style.borderBottomWidth = "0px";
      }
      setTimeout(() => {
        withSound(() => navigate("/"));
      }, 150);
    };

    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-slate-50">
        <div className="w-full max-w-sm mx-auto space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center p-3 mb-3 bg-white rounded-full text-indigo-500 border-2 border-slate-100">
              {mode === "infinite" ? (
                <Infinity size={40} />
              ) : (
                <CheckCircle size={40} />
              )}
            </div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">
              {mode === "infinite" ? "Session Paused" : "All Done!"}
            </h1>
            <p className="text-slate-500 font-medium text-sm">
              {mode === "infinite"
                ? "Great mental workout."
                : "You've completed your set."}
            </p>
          </div>

          <div className="bg-white rounded-2xl p-5 border-2 border-slate-100 space-y-5">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-emerald-50 text-center border-2 border-emerald-100">
                <span className="block text-2xl font-black text-emerald-500">
                  {sessionStats.correct}
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-600/70">
                  Correct
                </span>
              </div>
              <div className="p-3 rounded-xl bg-rose-50 text-center border-2 border-rose-100">
                <span className="block text-2xl font-black text-rose-500">
                  {sessionStats.incorrect}
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-rose-600/70">
                  Incorrect
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
                <span>Accuracy</span>
                <span>{accuracy}%</span>
              </div>
              <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-500 rounded-full"
                  style={{ width: `${accuracy}%` }}
                />
              </div>
            </div>
          </div>

          <button
            onClick={handleBackToLibrary}
            className="w-full py-4 text-base font-bold text-white uppercase tracking-widest bg-slate-800 rounded-xl border-2 border-slate-800 border-b-[6px] border-b-slate-950 transition-transform active:translate-y-1 active:border-b-2"
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
        {currentQ?.type === QuestionType.MATCHING && currentQ.pairs ? (
          <MatchingQuestion
            key={`match-${currentIndex}`}
            pairs={currentQ.pairs}
            onComplete={() => handleMatchingComplete(currentQ.pairs!)}
          />
        ) : (
          <>
            <div className="w-full flex-1 flex flex-col items-center justify-center min-h-[200px] mb-8">
              <h3 className="mb-4 text-xs font-black tracking-widest uppercase text-slate-300">
                {currentQ?.item?.type === ItemType.WORD
                  ? "Translate / Identify"
                  : "Define"}
              </h3>

              {/* Optional Image Display */}
              {currentQ?.item?.imageUrl && (
                <div className="mb-6">
                  <img
                    src={currentQ.item.imageUrl}
                    alt="Term illustration"
                    className="h-48 w-auto max-w-full rounded-2xl object-contain shadow-sm border-2 border-slate-100 bg-white"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                </div>
              )}

              <div
                className={`leading-relaxed duration-300 text-slate-700 animate-in zoom-in-95 ${
                  currentQ?.item?.type === ItemType.DEFINITION
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
                  if (
                    option === (currentQ as any).correctAnswerText &&
                    isCorrect
                  ) {
                    // Correct Answer (Green) - Only show if user got it right
                    btnClass = "bg-emerald-500 border-emerald-600 text-white";
                  } else if (
                    option === selectedAnswer &&
                    option !== (currentQ as any).correctAnswerText
                  ) {
                    // Wrong Selection (Red)
                    btnClass = "bg-rose-500 border-rose-600 text-white";
                  } else {
                    // Unselected or Hidden Correct Answer (Dimmed)
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
          </>
        )}
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

                  {!isCorrect &&
                    currentQ?.type === QuestionType.MULTIPLE_CHOICE && (
                      <div className="mt-3 p-3 bg-white/60 rounded-xl border border-rose-200/60 text-left animate-in fade-in slide-in-from-bottom-2 duration-500 delay-100">
                        <div className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-1">
                          Correct Answer
                        </div>
                        <div className="text-lg font-black text-rose-600 leading-tight">
                          {currentQ.correctAnswerText}
                        </div>
                      </div>
                    )}
                </div>
              </div>

              <button
                onClick={() => {
                  const btn = document.activeElement as HTMLButtonElement;
                  if (btn) {
                    btn.style.transform = "translateY(4px)";
                    btn.style.borderBottomWidth = "2px";
                  }
                  setTimeout(() => {
                    handleNextQuestion();
                  }, 80);
                }}
                className={`w-full py-3 rounded-xl font-bold text-base text-white border-2 border-b-[6px] transition-transform active:translate-y-1 active:border-b-2 flex items-center justify-center space-x-2 uppercase tracking-wide ${
                  isCorrect
                    ? "bg-emerald-500 border-emerald-500 border-b-emerald-700"
                    : "bg-rose-500 border-rose-500 border-b-rose-700"
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
