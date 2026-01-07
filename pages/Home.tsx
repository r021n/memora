import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Play, BookOpen, Infinity, X } from "lucide-react";
import { useStore } from "../context/StoreContext";
import Modal from "../components/Modal";
import CustomSelect from "../components/CustomSelect";

import { withSound } from "../utils/sound";

const Home: React.FC = () => {
  const navigate = useNavigate();
  const { addItem, items, categories } = useStore();
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  // Form State
  // Form State
  const [key, setKey] = useState("");
  const [pairs, setPairs] = useState<string[]>([""]);
  const [addCategoryId, setAddCategoryId] = useState<string>("");

  const categoryOptions = categories.map((c) => ({ id: c.id, label: c.name }));

  const activeCount = items.filter((i) => i.isActive).length;

  const handlePreStart = (selectedMode: "normal" | "infinite") => {
    withSound(() => {
      navigate("/exercise", {
        state: {
          mode: selectedMode,
          filter: "MIX",
        },
      });
    });
  };

  const handleAddClick = () => {
    withSound(() => setIsModalOpen(true));
  };

  const handleAddPair = () => {
    setPairs([...pairs, ""]);
  };

  const handleRemovePair = (index: number) => {
    const newPairs = [...pairs];
    newPairs.splice(index, 1);
    setPairs(newPairs);
  };

  const handlePairChange = (index: number, value: string) => {
    const newPairs = [...pairs];
    newPairs[index] = value;
    setPairs(newPairs);
  };

  const resetForm = () => {
    setKey("");
    setPairs([""]);
    setAddCategoryId("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!key.trim()) return;

    // Direct sound play here as we are not navigating away immediately,
    // but waiting for state update is fine.
    withSound(() => {
      const filteredPairs = pairs.filter((m) => m.trim() !== "");
      if (filteredPairs.length === 0) return;

      addItem({
        key: key,
        pairs: filteredPairs,
        isActive: true,
        categoryId: addCategoryId || undefined,
      });

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

      {/* Add New Item Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add to Library"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Mode Selection */}

          <div className="space-y-4">
            <div>
              <label className="block mb-2 text-xs font-bold uppercase text-slate-400">
                Category
              </label>
              <CustomSelect
                options={categoryOptions}
                value={addCategoryId}
                onChange={setAddCategoryId}
                placeholder="No Category"
              />
            </div>

            <div>
              <label className="block mb-2 text-xs font-bold uppercase text-slate-400">
                Keyword / Key
              </label>
              <input
                type="text"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder="e.g., Apple"
                className="w-full px-4 py-3 font-medium transition-all border-2 rounded-xl border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-400 focus:outline-none text-slate-700"
                required
              />
            </div>

            <div>
              <label className="block mb-2 text-xs font-bold uppercase text-slate-400">
                Pairs / Translations
              </label>
              <div className="space-y-3">
                {pairs.map((pair, idx) => (
                  <div key={idx} className="flex gap-2">
                    <input
                      type="text"
                      value={pair}
                      onChange={(e) => handlePairChange(idx, e.target.value)}
                      placeholder="Enter pair..."
                      className="flex-1 px-4 py-3 font-medium transition-all border-2 rounded-xl border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-400 focus:outline-none text-slate-700"
                      required={idx === 0}
                    />
                    {pairs.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemovePair(idx)}
                        className="p-3 transition-colors border-2 border-transparent text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl hover:border-rose-100"
                      >
                        <X size={20} />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={handleAddPair}
                  className="flex items-center py-1 space-x-1 text-sm font-bold tracking-wide text-indigo-500 uppercase hover:text-indigo-600"
                >
                  <Plus size={18} />
                  <span>Add another</span>
                </button>
              </div>
            </div>
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
