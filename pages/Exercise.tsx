import React, { useEffect, useState, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useStore } from "../context/StoreContext";
import { MemoryItem, QuestionData, QuestionType } from "../types";
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  RefreshCw,
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
  const { items, settings, updateStats, categories } = useStore();

  const mode = (location.state?.mode as "normal" | "infinite") || "normal";
  const filter = (location.state?.filter as "MIX" | "CATEGORY") || "MIX";
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
  const [questionMode, setQuestionMode] = useState<"aligned" | "randomized">(
    "aligned"
  );
  // Starting state: Check checkboxes unselected as requested, user must pick.
  // Using 'custom' with empty selection achieves "all uncheck".
  const [categoryMode, setCategoryMode] = useState<"all" | "custom">("custom");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [setupError, setSetupError] = useState<string | null>(null);

  // Shuffle array utility
  const shuffle = <T,>(array: T[]): T[] => {
    return [...array].sort(() => Math.random() - 0.5);
  };

  const getDifficultyWeight = (item: MemoryItem) => {
    const total = item.stats.correct + item.stats.incorrect;
    const accuracy = total === 0 ? 0 : item.stats.correct / total;
    return 0.4 + (1 - accuracy); // higher weight for items with lower accuracy
  };

  const getFilteredItems = useCallback(() => {
    let activeItems = items.filter((i) => i.isActive);

    // Category filter behavior:
    // - categoryMode === "all": include everything (including uncategorized)
    // - categoryMode === "custom": include only selected categories
    //   (if none selected, include none)
    if (categoryMode === "custom") {
      if (selectedCategories.length === 0) return [];
      activeItems = activeItems.filter((i) =>
        selectedCategories.includes(i.categoryId || "")
      );
    } else if (filter === "CATEGORY" && categoryId) {
      // Backward-compat: if user came from a category shortcut
      activeItems = activeItems.filter((i) => i.categoryId === categoryId);
    }

    return activeItems;
  }, [items, filter, categoryId, selectedCategories, categoryMode]);

  const pickWeightedItem = useCallback((pool: MemoryItem[]): MemoryItem => {
    const shuffledPool = shuffle(pool);
    const weights = shuffledPool.map((item) => getDifficultyWeight(item));
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    const r = Math.random() * totalWeight;
    let cumulative = 0;

    for (let i = 0; i < shuffledPool.length; i++) {
      cumulative += weights[i];
      if (r <= cumulative) return shuffledPool[i];
    }

    return shuffledPool[0];
  }, []);

  const buildAlignedQuestion = useCallback(
    (targetItem: MemoryItem, pool: MemoryItem[]): QuestionData | null => {
      const correct = targetItem.pairs[0];
      if (!correct) return null;

      const potentialDistractors = pool
        .filter((i) => i.id !== targetItem.id)
        .flatMap((i) => i.pairs)
        .filter((t) => t && t !== correct);

      const uniqueDistractors = Array.from(new Set(potentialDistractors));
      const distractors = shuffle(uniqueDistractors).slice(0, 3);

      if (distractors.length < 3) return null;

      return {
        type: QuestionType.MULTIPLE_CHOICE,
        item: targetItem,
        questionText: targetItem.key,
        correctAnswerText: correct,
        distractors,
      };
    },
    []
  );

  const buildRandomizedQuestion = useCallback(
    (targetItem: MemoryItem, pool: MemoryItem[]): QuestionData | null => {
      const fields = [
        { key: "key", text: targetItem.key },
        ...targetItem.pairs.map((m) => ({ key: "pair", text: m })),
      ].filter((f): f is { key: string; text: string } => Boolean(f?.text));

      const uniqueTexts = Array.from(new Set(fields.map((f) => f.text)));
      if (uniqueTexts.length === 0) return null;

      const questionText = shuffle(uniqueTexts)[0];
      const remaining = uniqueTexts.filter((t) => t !== questionText);
      const correctAnswerText = remaining[0] || targetItem.key;

      const distractorPool = pool
        .filter((i) => i.id !== targetItem.id)
        .flatMap((i) => {
          const candidates = [i.key, ...i.pairs];
          return candidates;
        })
        .filter((t) => t && t !== correctAnswerText && t !== questionText);

      const uniqueDistractors = Array.from(new Set(distractorPool));
      const distractors = shuffle(uniqueDistractors).slice(0, 3);

      if (distractors.length < 3) return null;

      return {
        type: QuestionType.MULTIPLE_CHOICE,
        item: targetItem,
        questionText,
        correctAnswerText,
        distractors,
      };
    },
    []
  );

  // Generate Questions Logic
  const generateQuestions = useCallback(
    (count: number): QuestionData[] => {
      const activeItems = getFilteredItems();
      if (activeItems.length < 4) return [];

      const generated: QuestionData[] = [];

      for (let i = 0; i < count; i++) {
        const targetItem = pickWeightedItem(activeItems);
        const question =
          questionMode === "aligned"
            ? buildAlignedQuestion(targetItem, activeItems)
            : buildRandomizedQuestion(targetItem, activeItems);

        if (question) {
          generated.push(question);
        }
      }

      return generated;
    },
    [
      getFilteredItems,
      pickWeightedItem,
      questionMode,
      buildAlignedQuestion,
      buildRandomizedQuestion,
    ]
  );

  useEffect(() => {
    if (filter === "CATEGORY" && categoryId) {
      setCategoryMode("custom");
      setSelectedCategories([categoryId]);
    }
  }, [filter, categoryId]);

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
        const nextQ = generateQuestions(1)[0];
        if (nextQ) {
          setQuestions((prev) => [...prev, nextQ]);
          setCurrentIndex((prev) => prev + 1);
          setGameState(GameState.PLAYING);
        } else {
          setGameState(GameState.FINISHED);
        }
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
    return getFilteredItems().length;
  }, [getFilteredItems]);

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
          <div className="space-y-2 text-center">
            <div className="inline-flex items-center justify-center p-3 mb-3 text-indigo-500 bg-white border-2 rounded-full border-slate-100">
              {mode === "infinite" ? (
                <Infinity size={40} />
              ) : (
                <CheckCircle size={40} />
              )}
            </div>
            <h1 className="text-2xl font-black tracking-tight text-slate-800">
              {mode === "infinite" ? "Session Paused" : "All Done!"}
            </h1>
            <p className="text-sm font-medium text-slate-500">
              {mode === "infinite"
                ? "Great mental workout."
                : "You've completed your set."}
            </p>
          </div>

          <div className="p-5 space-y-5 bg-white border-2 rounded-2xl border-slate-100">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 text-center border-2 rounded-xl bg-emerald-50 border-emerald-100">
                <span className="block text-2xl font-black text-emerald-500">
                  {sessionStats.correct}
                </span>
                <span className="text-xs font-bold tracking-wider uppercase text-emerald-600/70">
                  Correct
                </span>
              </div>
              <div className="p-3 text-center border-2 rounded-xl bg-rose-50 border-rose-100">
                <span className="block text-2xl font-black text-rose-500">
                  {sessionStats.incorrect}
                </span>
                <span className="text-xs font-bold tracking-wider uppercase text-rose-600/70">
                  Incorrect
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold tracking-wider uppercase text-slate-400">
                <span>Accuracy</span>
                <span>{accuracy}%</span>
              </div>
              <div className="w-full h-3 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full bg-indigo-500 rounded-full"
                  style={{ width: `${accuracy}%` }}
                />
              </div>
            </div>
          </div>

          <button
            onClick={handleBackToLibrary}
            className="w-full py-4 text-base font-bold text-white uppercase tracking-widest bg-slate-800 rounded-full border-2 border-slate-800 border-b-[6px] border-b-slate-950 transition-transform active:translate-y-1 active:border-b-2"
          >
            Back to Library
          </button>
        </div>
      </div>
    );
  }

  const handleStart = () => {
    const count = getFilteredCount();
    if (count < 4) {
      setSetupError("Minimal 4 item aktif diperlukan untuk mulai.");
      return;
    }

    const initialCount =
      mode === "infinite" ? 1 : settings.maxQuestionsPerSession || 10;
    const newQuestions = generateQuestions(initialCount);

    if (newQuestions.length === 0) {
      setSetupError("Gagal membuat soal, coba ubah pilihan.");
      return;
    }

    setQuestions(newQuestions);
    setGameState(GameState.PLAYING);
    setSetupError(null);
  };

  const toggleCategory = (id: string) => {
    setSelectedCategories((prev) => {
      if (categoryMode === "all") {
        // Switch to custom, starting from "all categories selected" then remove clicked
        setCategoryMode("custom");
        return categories.filter((c) => c.id !== id).map((c) => c.id);
      }
      if (prev.includes(id)) return prev.filter((c) => c !== id);
      return [...prev, id];
    });
  };

  const startScreen = (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-slate-50 md:p-6">
      <div className="relative w-full max-w-2xl p-6 space-y-6 bg-white border-2 shadow-sm border-slate-100 rounded-3xl md:p-8">
        {/* Close Button */}
        <button
          onClick={() => navigate(-1)}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full transition-colors"
        >
          <XCircle size={24} />
        </button>

        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-black text-slate-800 md:text-3xl">
            Mulai Latihan
          </h1>
          <p className="font-medium text-slate-500 text-sm">
            Atur preferensi sesukamu.
          </p>
        </div>

        {/* Mode & Stats Compact View */}
        <div className="flex items-center justify-between px-4 py-3 text-sm font-bold border bg-slate-50 border-slate-100 rounded-xl text-slate-500">
          <div className="flex items-center gap-2">
            <span>Mode:</span>
            <span className="text-slate-800 uppercase tracking-wide">
              {mode === "infinite" ? "Infinite" : "Normal"}
            </span>
          </div>
          <div className="text-xs font-semibold bg-white px-2 py-1 rounded-md border border-slate-200">
            {getFilteredCount()} Item
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-sm font-black uppercase tracking-wider text-slate-400">
            Tipe Soal
          </h2>

          <div className="grid gap-3 sm:grid-cols-2">
            <button
              onClick={() => setQuestionMode("aligned")}
              className={`p-3 rounded-xl border-2 text-left transition-all flex items-center gap-3 ${
                questionMode === "aligned"
                  ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
              }`}
            >
              <div
                className={`p-2 rounded-full ${
                  questionMode === "aligned" ? "bg-indigo-100" : "bg-slate-100"
                }`}
              >
                <CheckCircle
                  size={18}
                  className={
                    questionMode === "aligned"
                      ? "text-indigo-600"
                      : "text-slate-400"
                  }
                />
              </div>
              <div>
                <p className="font-black text-sm">Sesuai Data</p>
                <p className="text-xs opacity-70">Soal: Key → Pilihan: Pair</p>
              </div>
            </button>

            <button
              onClick={() => setQuestionMode("randomized")}
              className={`p-3 rounded-xl border-2 text-left transition-all flex items-center gap-3 ${
                questionMode === "randomized"
                  ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
              }`}
            >
              <div
                className={`p-2 rounded-full ${
                  questionMode === "randomized"
                    ? "bg-indigo-100"
                    : "bg-slate-100"
                }`}
              >
                <RefreshCw
                  size={18}
                  className={
                    questionMode === "randomized"
                      ? "text-indigo-600"
                      : "text-slate-400"
                  }
                />
              </div>
              <div>
                <p className="font-black text-sm">Acak</p>
                <p className="text-xs opacity-70">
                  Soal dan pilihan dibuat acak
                </p>
              </div>
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-sm font-black uppercase tracking-wider text-slate-400">
            Kategori
          </h2>
          <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto pr-2">
            <label
              className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl border-2 text-xs font-bold cursor-pointer transition-all ${
                categoryMode === "all"
                  ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
              }`}
            >
              <input
                type="checkbox"
                checked={categoryMode === "all"}
                onChange={() => {
                  if (categoryMode === "all") {
                    setCategoryMode("custom");
                    setSelectedCategories([]);
                  } else {
                    setCategoryMode("all");
                    setSelectedCategories([]);
                  }
                }}
                className="hidden"
              />
              <div
                className={`w-4 h-4 rounded-md border flex items-center justify-center ${
                  categoryMode === "all"
                    ? "bg-indigo-500 border-indigo-500"
                    : "border-slate-300 bg-white"
                }`}
              >
                {categoryMode === "all" && (
                  <CheckCircle size={12} className="text-white" />
                )}
              </div>
              <span>All</span>
            </label>

            {categories.length === 0 && (
              <span className="text-xs text-slate-400">(Kosong)</span>
            )}

            {categories.map((cat) => {
              const active =
                categoryMode === "all" || selectedCategories.includes(cat.id);
              return (
                <label
                  key={cat.id}
                  className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl border-2 text-xs font-bold cursor-pointer transition-all select-none ${
                    active
                      ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={() => toggleCategory(cat.id)}
                    className="hidden"
                  />
                  <div
                    className={`w-4 h-4 rounded-md border flex items-center justify-center ${
                      active
                        ? "bg-indigo-500 border-indigo-500"
                        : "border-slate-300 bg-white"
                    }`}
                  >
                    {active && <CheckCircle size={12} className="text-white" />}
                  </div>
                  <span>{cat.name}</span>
                </label>
              );
            })}
          </div>
        </div>

        {setupError && (
          <div className="p-3 text-xs font-bold text-center border-2 rounded-xl border-rose-200 bg-rose-50 text-rose-600 animate-pulse">
            {setupError}
          </div>
        )}

        {/* Start Button */}
        <button
          onClick={handleStart}
          disabled={getFilteredCount() < 4}
          className="w-full py-4 rounded-xl bg-emerald-500 text-white font-black text-lg border-2 border-emerald-500 border-b-[6px] border-b-emerald-700 transition-all active:translate-y-1 active:border-b-2 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-emerald-400"
        >
          START
        </button>
      </div>
    </div>
  );

  if (gameState === GameState.PREPARING) return startScreen;

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
        {mode === "infinite" ? (
          <>
            <div className="text-sm font-bold text-slate-400">
              #{currentIndex + 1}
            </div>

            <button
              onClick={() => setGameState(GameState.FINISHED)}
              className="px-3 py-2 text-xs font-bold text-rose-500 bg-rose-50 rounded-lg hover:bg-rose-100 transition-colors"
            >
              AKHIRI EXERCISE
            </button>
          </>
        ) : (
          <>
            <button
              onClick={handleExit}
              className="p-2 transition-colors text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl"
            >
              <ArrowLeft size={24} strokeWidth={2.5} />
            </button>

            <div className="flex-1 h-4 mx-4 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full transition-all duration-300 ease-out bg-indigo-500 rounded-full"
                style={{ width: `${progress}%` }}
              ></div>
            </div>

            <div className="w-16 text-sm font-bold text-right text-slate-400">
              {currentIndex + 1} / {questions.length}
            </div>
          </>
        )}
      </div>

      {/* Question Area */}
      <div className="flex flex-col items-center flex-1 w-full max-w-2xl p-6 pb-32 mx-auto">
        <div className="w-full flex-1 flex flex-col items-center justify-center min-h-[200px] mb-8">
          <h3 className="mb-4 text-xs font-black tracking-widest uppercase text-slate-300">
            Identify
          </h3>

          {/* Optional Image Display */}
          {currentQ?.item?.imageUrl && (
            <div className="mb-6">
              <img
                src={currentQ.item.imageUrl}
                alt="Term illustration"
                className="object-contain w-auto h-48 max-w-full bg-white border-2 shadow-sm rounded-2xl border-slate-100"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            </div>
          )}

          <div className="w-full leading-relaxed duration-300 text-slate-700 animate-in zoom-in-95 text-2xl md:text-3xl font-black text-center">
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
              if (option === currentQ?.correctAnswerText && isCorrect) {
                btnClass = "bg-emerald-500 border-emerald-600 text-white";
              } else if (
                option === selectedAnswer &&
                option !== currentQ?.correctAnswerText
              ) {
                btnClass = "bg-rose-500 border-rose-600 text-white";
              } else {
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
                className={`w-full p-4 rounded-2xl font-bold text-lg transition-all duration-100 transform active:scale-[0.98] active:border-b-2 active:translate-y-[2px] ${borderClass} ${btnClass} flex items-center justify-start text-left group`}
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

                  {!isCorrect &&
                    currentQ?.type === QuestionType.MULTIPLE_CHOICE && (
                      <div className="p-3 mt-3 text-left duration-500 delay-100 border bg-white/60 rounded-xl border-rose-200/60 animate-in fade-in slide-in-from-bottom-2">
                        <div className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-1">
                          Correct Answer
                        </div>
                        <div className="text-lg font-black leading-tight text-rose-600">
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
                className={`w-full py-3 rounded-full font-bold text-base text-white border-2 border-b-[6px] transition-transform active:translate-y-1 active:border-b-2 flex items-center justify-center space-x-2 uppercase tracking-wide ${
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
