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

const Home: React.FC = () => {
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
    <div className="min-h-screen pt-20 pb-24 sm:pb-10 px-10 max-w-5xl mx-auto flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center text-center space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="space-y-4">
          <div className="inline-block p-6 rounded-3xl bg-indigo-50 text-indigo-500 mb-4 border-b-4 border-indigo-100">
            <BookOpen size={64} strokeWidth={2.5} />
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-slate-700 tracking-tight">
            Master Your Memory
          </h1>
          <p className="text-lg text-slate-500 max-w-md mx-auto font-medium">
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
              <span className="uppercase tracking-wide">Start</span>
            </button>

            <button
              onClick={handleAddClick}
              className="flex-1 flex items-center justify-center space-x-2 py-4 px-6 rounded-2xl font-bold bg-white text-slate-600 border-2 border-slate-200 border-b-4 hover:bg-slate-50 hover:border-slate-300 active:border-b-2 active:translate-y-[2px] transition-all duration-200"
            >
              <Plus size={20} />
              <span className="uppercase tracking-wide">Add New</span>
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
            <span className="uppercase tracking-wide">Infinite Practice</span>
          </button>
        </div>

        {activeCount < 4 && (
          <p className="text-sm font-bold text-amber-600 bg-amber-50 px-4 py-3 rounded-xl border-2 border-amber-100">
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
          <p className="text-slate-500 font-medium mb-4">
            Select what type of cards you want to practice with.
          </p>

          <button
            onClick={() => handleStartGame("MIX")}
            className="w-full p-4 bg-indigo-50 border-2 border-indigo-100 rounded-2xl hover:bg-indigo-100 hover:border-indigo-200 active:bg-indigo-200 transition-all flex items-center space-x-4 group duration-200"
          >
            <div className="p-3 bg-white rounded-xl text-indigo-500 group-hover:scale-110 transition-transform shadow-sm">
              <Layers size={24} />
            </div>
            <div className="text-left">
              <h3 className="font-bold text-slate-700">Mix All</h3>
              <p className="text-xs text-slate-400 font-medium">
                Practice everything in your library
              </p>
            </div>
          </button>

          <button
            onClick={() => handleStartGame("WORD")}
            className="w-full p-4 bg-blue-50 border-2 border-blue-100 rounded-2xl hover:bg-blue-100 hover:border-blue-200 active:bg-blue-200 transition-all flex items-center space-x-4 group duration-200"
          >
            <div className="p-3 bg-white rounded-xl text-blue-500 group-hover:scale-110 transition-transform shadow-sm">
              <Type size={24} />
            </div>
            <div className="text-left">
              <h3 className="font-bold text-slate-700">Words Only</h3>
              <p className="text-xs text-slate-400 font-medium">
                Translate and identify terms
              </p>
            </div>
          </button>

          <button
            onClick={() => handleStartGame("DEFINITION")}
            className="w-full p-4 bg-emerald-50 border-2 border-emerald-100 rounded-2xl hover:bg-emerald-100 hover:border-emerald-200 active:bg-emerald-200 transition-all flex items-center space-x-4 group duration-200"
          >
            <div className="p-3 bg-white rounded-xl text-emerald-500 group-hover:scale-110 transition-transform shadow-sm">
              <FileText size={24} />
            </div>
            <div className="text-left">
              <h3 className="font-bold text-slate-700">Definitions Only</h3>
              <p className="text-xs text-slate-400 font-medium">
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
          <div className="flex gap-2 p-1 bg-slate-100 rounded-xl border-2 border-slate-100">
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
              <label className="block text-xs font-bold uppercase text-slate-400 mb-2">
                {mode === ItemType.WORD ? "Keyword / Term" : "Term to Define"}
              </label>
              <input
                type="text"
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                placeholder={
                  mode === ItemType.WORD ? "e.g., Apple" : "e.g., Gravity"
                }
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-400 focus:outline-none transition-all font-medium text-slate-700"
                required
              />
            </div>

            {mode === ItemType.WORD ? (
              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-2">
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
                        className="flex-1 px-4 py-3 rounded-xl border-2 border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-400 focus:outline-none transition-all font-medium text-slate-700"
                        required={idx === 0}
                      />
                      {meanings.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveMeaning(idx)}
                          className="p-3 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl border-2 border-transparent hover:border-rose-100 transition-colors"
                        >
                          <X size={20} />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={handleAddMeaning}
                    className="text-sm text-indigo-500 font-bold hover:text-indigo-600 flex items-center space-x-1 py-1 uppercase tracking-wide"
                  >
                    <Plus size={18} />
                    <span>Add another</span>
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-2">
                  Description / Definition
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g., The force that attracts a body toward the center of the earth."
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-400 focus:outline-none transition-all h-32 resize-none font-medium text-slate-700"
                  required
                />
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="flex-1 py-3 font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-colors uppercase tracking-wide"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-3 font-bold text-white bg-indigo-500 hover:bg-indigo-600 rounded-xl border-b-4 border-indigo-700 active:border-b-0 active:translate-y-1 transition-all uppercase tracking-wide"
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
