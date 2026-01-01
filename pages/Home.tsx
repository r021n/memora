import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Play,
  BookOpen,
  Infinity,
  X,
  Layers,
  Type,
  FileText,
} from "lucide-react";
import { useStore } from "../context/StoreContext";
import Modal from "../components/Modal";
import { ItemType } from "../types";
import { withSound } from "../utils/sound";
import { useRootBackGuard } from "../hooks/useRootBackGuard";

const Home: React.FC = () => {
  useRootBackGuard(true);
  const navigate = useNavigate();
  const { addItem, items } = useStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [setupMode, setSetupMode] = useState<"normal" | "infinite" | null>(
    null
  );

  // Form State
  const [mode, setMode] = useState<ItemType>(ItemType.WORD);
  const [term, setTerm] = useState("");
  const [meanings, setMeanings] = useState<string[]>([""]);
  const [description, setDescription] = useState("");

  const activeCount = items.filter((i) => i.isActive).length;

  const handlePreStart = (mode: "normal" | "infinite") => {
    withSound(() => setSetupMode(mode));
  };

  const handleStartGame = (filter: "MIX" | "WORD" | "DEFINITION") => {
    if (setupMode) {
      withSound(() => {
        navigate("/exercise", { state: { mode: setupMode, filter } });
        setSetupMode(null);
      });
    }
  };

  const handleAddClick = () => {
    withSound(() => setIsModalOpen(true));
  };

  const handleAddMeaning = () => {
    setMeanings([...meanings, ""]);
  };

  const handleRemoveMeaning = (index: number) => {
    const newMeanings = [...meanings];
    newMeanings.splice(index, 1);
    setMeanings(newMeanings);
  };

  const handleMeaningChange = (index: number, value: string) => {
    const newMeanings = [...meanings];
    newMeanings[index] = value;
    setMeanings(newMeanings);
  };

  const resetForm = () => {
    setTerm("");
    setMeanings([""]);
    setDescription("");
    setMode(ItemType.WORD);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!term.trim()) return;

    // Direct sound play here as we are not navigating away immediately,
    // but waiting for state update is fine.
    withSound(() => {
      if (mode === ItemType.WORD) {
        const filteredMeanings = meanings.filter((m) => m.trim() !== "");
        if (filteredMeanings.length === 0) return;

        addItem({
          type: ItemType.WORD,
          term: term,
          meanings: filteredMeanings,
          isActive: true,
        });
      } else {
        if (!description.trim()) return;

        addItem({
          type: ItemType.DEFINITION,
          term: term,
          meanings: [],
          description: description,
          isActive: true,
        });
      }

      resetForm();
      setIsModalOpen(false);
    });
  };

  return (
    <div className="flex flex-col max-w-5xl min-h-screen px-10 pt-20 pb-24 mx-auto sm:pb-10">
      <div className="flex flex-col items-center justify-center flex-1 space-y-8 text-center duration-500 animate-in fade-in slide-in-from-bottom-4">
        <div className="space-y-4">
          <div className="inline-block p-6 mb-4 text-indigo-500 border-b-4 border-indigo-100 rounded-3xl bg-indigo-50">
            <BookOpen size={64} strokeWidth={2.5} />
          </div>
          <h1 className="text-4xl font-[1000] tracking-tight md:text-5xl text-slate-700">
            Master Your Memory
          </h1>
          <p className="max-w-md mx-auto text-lg font-medium text-slate-500">
            Create your own flashcards and practice with smart, gamified
            exercises.
          </p>
        </div>

        <div className="w-full max-w-sm mx-auto space-y-3">
          <div className="flex gap-3">
            <button
              onClick={() => handlePreStart("normal")}
              disabled={activeCount < 4}
              className={`flex-1 flex items-center justify-center space-x-2 py-4 px-6 rounded-2xl font-bold text-white transition-all transform active:scale-[0.98] border-b-4 active:border-b-0 active:translate-y-1 duration-200 ${
                activeCount < 4
                  ? "bg-slate-300 border-2 border-slate-400 cursor-not-allowed"
                  : "bg-indigo-500 border-2 border-indigo-700 hover:bg-indigo-600"
              }`}
            >
              <Play size={20} fill="currentColor" />
              <span className="tracking-wide uppercase">Start</span>
            </button>

            <button
              onClick={handleAddClick}
              className="flex-1 flex items-center justify-center space-x-2 py-4 px-6 rounded-2xl font-bold bg-white text-slate-600 border-2 border-slate-200 border-b-4 hover:bg-slate-50 hover:border-slate-300 active:border-b-2 active:translate-y-[2px] transition-all duration-200"
            >
              <Plus size={20} />
              <span className="tracking-wide uppercase">Add New</span>
            </button>
          </div>

          <button
            onClick={() => handlePreStart("infinite")}
            disabled={activeCount < 4}
            className={`w-full flex items-center justify-center space-x-2 py-4 px-6 rounded-2xl font-bold text-white transition-all transform active:scale-[0.98] border-b-4 active:border-b-0 active:translate-y-1 duration-200 ${
              activeCount < 4
                ? "bg-slate-300 border-2 border-slate-400 cursor-not-allowed"
                : "bg-purple-500 border-2 border-purple-700 hover:bg-purple-600"
            }`}
          >
            <Infinity size={24} />
            <span className="tracking-wide uppercase">Infinite Practice</span>
          </button>
        </div>

        {activeCount < 4 && (
          <p className="px-4 py-3 text-sm font-bold border-2 text-amber-600 bg-amber-50 rounded-xl border-amber-100">
            ⚠️ Add at least 4 active items to start practicing.
          </p>
        )}
      </div>

      {/* Setup Practice Modal */}
      <Modal
        isOpen={!!setupMode}
        onClose={() => setSetupMode(null)}
        title="Choose Focus"
      >
        <div className="space-y-4">
          <p className="mb-4 font-medium text-slate-500">
            Select what type of cards you want to practice with.
          </p>

          <button
            onClick={() => handleStartGame("MIX")}
            className="flex items-center w-full p-4 space-x-4 transition-all duration-200 border-2 border-indigo-100 bg-indigo-50 rounded-2xl hover:bg-indigo-100 hover:border-indigo-200 active:bg-indigo-200 group"
          >
            <div className="p-3 text-indigo-500 transition-transform bg-white shadow-sm rounded-xl group-hover:scale-110">
              <Layers size={24} />
            </div>
            <div className="text-left">
              <h3 className="font-bold text-slate-700">Mix All</h3>
              <p className="text-xs font-medium text-slate-400">
                Practice everything in your library
              </p>
            </div>
          </button>

          <button
            onClick={() => handleStartGame("WORD")}
            className="flex items-center w-full p-4 space-x-4 transition-all duration-200 border-2 border-blue-100 bg-blue-50 rounded-2xl hover:bg-blue-100 hover:border-blue-200 active:bg-blue-200 group"
          >
            <div className="p-3 text-blue-500 transition-transform bg-white shadow-sm rounded-xl group-hover:scale-110">
              <Type size={24} />
            </div>
            <div className="text-left">
              <h3 className="font-bold text-slate-700">Words Only</h3>
              <p className="text-xs font-medium text-slate-400">
                Translate and identify terms
              </p>
            </div>
          </button>

          <button
            onClick={() => handleStartGame("DEFINITION")}
            className="flex items-center w-full p-4 space-x-4 transition-all duration-200 border-2 bg-emerald-50 border-emerald-100 rounded-2xl hover:bg-emerald-100 hover:border-emerald-200 active:bg-emerald-200 group"
          >
            <div className="p-3 transition-transform bg-white shadow-sm rounded-xl text-emerald-500 group-hover:scale-110">
              <FileText size={24} />
            </div>
            <div className="text-left">
              <h3 className="font-bold text-slate-700">Definitions Only</h3>
              <p className="text-xs font-medium text-slate-400">
                Guess terms from descriptions
              </p>
            </div>
          </button>
        </div>
      </Modal>

      {/* Add New Item Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add to Library"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Mode Selection */}
          <div className="flex gap-2 p-1 border-2 bg-slate-100 rounded-xl border-slate-100">
            <button
              type="button"
              onClick={() => withSound(() => setMode(ItemType.WORD), 100)}
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${
                mode === ItemType.WORD
                  ? "bg-white text-indigo-500 border-b-4 border-slate-200"
                  : "text-slate-400 hover:text-slate-600"
              }`}
            >
              WORD
            </button>
            <button
              type="button"
              onClick={() => withSound(() => setMode(ItemType.DEFINITION), 100)}
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${
                mode === ItemType.DEFINITION
                  ? "bg-white text-indigo-500 border-b-4 border-slate-200"
                  : "text-slate-400 hover:text-slate-600"
              }`}
            >
              DEFINITION
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block mb-2 text-xs font-bold uppercase text-slate-400">
                {mode === ItemType.WORD ? "Keyword / Term" : "Term to Define"}
              </label>
              <input
                type="text"
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                placeholder={
                  mode === ItemType.WORD ? "e.g., Apple" : "e.g., Gravity"
                }
                className="w-full px-4 py-3 font-medium transition-all border-2 rounded-xl border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-400 focus:outline-none text-slate-700"
                required
              />
            </div>

            {mode === ItemType.WORD ? (
              <div>
                <label className="block mb-2 text-xs font-bold uppercase text-slate-400">
                  Meanings / Translations
                </label>
                <div className="space-y-3">
                  {meanings.map((meaning, idx) => (
                    <div key={idx} className="flex gap-2">
                      <input
                        type="text"
                        value={meaning}
                        onChange={(e) =>
                          handleMeaningChange(idx, e.target.value)
                        }
                        placeholder="Enter meaning..."
                        className="flex-1 px-4 py-3 font-medium transition-all border-2 rounded-xl border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-400 focus:outline-none text-slate-700"
                        required={idx === 0}
                      />
                      {meanings.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveMeaning(idx)}
                          className="p-3 transition-colors border-2 border-transparent text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl hover:border-rose-100"
                        >
                          <X size={20} />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={handleAddMeaning}
                    className="flex items-center py-1 space-x-1 text-sm font-bold tracking-wide text-indigo-500 uppercase hover:text-indigo-600"
                  >
                    <Plus size={18} />
                    <span>Add another</span>
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <label className="block mb-2 text-xs font-bold uppercase text-slate-400">
                  Description / Definition
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g., The force that attracts a body toward the center of the earth."
                  className="w-full h-32 px-4 py-3 font-medium transition-all border-2 resize-none rounded-xl border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-400 focus:outline-none text-slate-700"
                  required
                />
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="flex-1 py-3 font-bold tracking-wide uppercase transition-colors text-slate-500 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-3 font-bold tracking-wide text-white uppercase transition-all bg-indigo-500 border-b-4 border-indigo-700 hover:bg-indigo-600 rounded-xl active:border-b-0 active:translate-y-1"
            >
              Save
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Home;
