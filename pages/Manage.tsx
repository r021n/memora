import React, { useState, useEffect } from "react";
import { useStore } from "../context/StoreContext";
import Modal from "../components/Modal";
import { ItemType, MemoryItem } from "../types";
import {
  Edit2,
  Trash2,
  ToggleLeft,
  ToggleRight,
  CheckCircle2,
  XCircle,
  Sliders,
  Plus,
  X,
  AlertCircle,
} from "lucide-react";
import { withSound } from "../utils/sound";

const Manage: React.FC = () => {
  const { items, updateItem, deleteItem, addItem, settings, updateSettings } =
    useStore();
  const [selectedItem, setSelectedItem] = useState<MemoryItem | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // -- Edit State --
  const [editTerm, setEditTerm] = useState("");
  const [editMeanings, setEditMeanings] = useState<string[]>([]);
  const [editDescription, setEditDescription] = useState("");
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  // -- Add State --
  const [addMode, setAddMode] = useState<ItemType>(ItemType.WORD);
  const [addTerm, setAddTerm] = useState("");
  const [addMeanings, setAddMeanings] = useState<string[]>([""]);
  const [addDescription, setAddDescription] = useState("");

  // Reset delete confirmation when modal closes or item changes
  useEffect(() => {
    setIsConfirmingDelete(false);
  }, [selectedItem]);

  // --- Edit Functions ---

  const openEditModal = (item: MemoryItem) => {
    withSound(() => {
      setSelectedItem(item);
      setEditTerm(item.term);
      setEditMeanings(item.meanings.length ? [...item.meanings] : [""]);
      setEditDescription(item.description || "");
      setIsConfirmingDelete(false);
    });
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;

    withSound(() => {
      const updates: Partial<MemoryItem> = {
        term: editTerm,
      };

      if (selectedItem.type === ItemType.WORD) {
        updates.meanings = editMeanings.filter((m) => m.trim() !== "");
      } else {
        updates.description = editDescription;
      }

      updateItem(selectedItem.id, updates);
      setSelectedItem(null);
    });
  };

  const toggleStatus = (item: MemoryItem, e: React.MouseEvent) => {
    e.stopPropagation();
    // Toggle usually doesn't need delay as it's a switch, but sound is nice
    withSound(() => {
      updateItem(item.id, { isActive: !item.isActive });
    }, 50); // Shorter delay for toggles
  };

  const toggleStatusInModal = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!selectedItem) return;

    withSound(() => {
      const newState = !selectedItem.isActive;
      updateItem(selectedItem.id, { isActive: newState });
      setSelectedItem({ ...selectedItem, isActive: newState });
    }, 50);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    withSound(() => setIsConfirmingDelete(true));
  };

  const handleConfirmDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (selectedItem) {
      withSound(() => {
        deleteItem(selectedItem.id);
        setSelectedItem(null);
        setIsConfirmingDelete(false);
      });
    }
  };

  const handleCancelDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsConfirmingDelete(false);
  };

  // Edit Meanings Handlers
  const handleEditMeaningChange = (index: number, val: string) => {
    const arr = [...editMeanings];
    arr[index] = val;
    setEditMeanings(arr);
  };
  const addEditMeaning = () => setEditMeanings([...editMeanings, ""]);
  const removeEditMeaning = (idx: number) =>
    setEditMeanings(editMeanings.filter((_, i) => i !== idx));

  // --- Add Functions ---

  const handleOpenAdd = () => {
    withSound(() => setIsAddModalOpen(true));
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addTerm.trim()) return;

    withSound(() => {
      if (addMode === ItemType.WORD) {
        const filteredMeanings = addMeanings.filter((m) => m.trim() !== "");
        if (filteredMeanings.length === 0) return;
        addItem({
          type: ItemType.WORD,
          term: addTerm,
          meanings: filteredMeanings,
          isActive: true,
        });
      } else {
        if (!addDescription.trim()) return;
        addItem({
          type: ItemType.DEFINITION,
          term: addTerm,
          meanings: [],
          description: addDescription,
          isActive: true,
        });
      }

      // Reset Add Form
      setAddTerm("");
      setAddMeanings([""]);
      setAddDescription("");
      setAddMode(ItemType.WORD);
      setIsAddModalOpen(false);
    });
  };

  const handleAddMeaningChange = (index: number, val: string) => {
    const arr = [...addMeanings];
    arr[index] = val;
    setAddMeanings(arr);
  };
  const appendAddMeaning = () => setAddMeanings([...addMeanings, ""]);
  const removeAddMeaning = (idx: number) =>
    setAddMeanings(addMeanings.filter((_, i) => i !== idx));

  return (
    <div className="min-h-screen pt-20 pb-24 sm:pb-10 px-8 max-w-5xl mx-auto">
      {/* Header & Settings */}
      <div className="mb-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-700">Library</h1>
            <p className="text-slate-500 font-medium">Manage your collection</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <button
              onClick={handleOpenAdd}
              className="flex items-center justify-center space-x-2 px-4 py-3 bg-indigo-500 text-white rounded-xl border-b-4 border-indigo-700 active:border-b-0 active:translate-y-1 transition-all hover:bg-indigo-600 font-bold uppercase tracking-wide text-sm whitespace-nowrap"
            >
              <Plus size={18} />
              <span>Add Item</span>
            </button>

            <div className="bg-white px-4 py-2 rounded-xl border-2 border-slate-200 flex items-center space-x-4 flex-1">
              <div className="p-2 bg-indigo-50 text-indigo-500 rounded-lg shrink-0">
                <Sliders size={20} />
              </div>
              <div className="flex-1 w-full">
                <label className="block text-[10px] font-bold text-slate-400 uppercase">
                  Max Questions
                </label>
                <div className="flex items-center space-x-3 w-full">
                  <input
                    type="range"
                    min="5"
                    max="50"
                    step="5"
                    value={settings.maxQuestionsPerSession}
                    onChange={(e) =>
                      updateSettings({
                        maxQuestionsPerSession: parseInt(e.target.value),
                      })
                    }
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                  />
                  <span className="font-bold text-slate-700 w-6 text-right">
                    {settings.maxQuestionsPerSession}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Grid of Cards */}
      {items.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border-2 border-dashed border-slate-300">
          <p className="text-slate-400 font-bold">
            No items yet. Add some to get started!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => (
            <div
              key={item.id}
              onClick={() => openEditModal(item)}
              className={`group relative bg-white rounded-2xl border-2 p-5 cursor-pointer transition-all active:scale-[0.98] duration-200 ${
                !item.isActive
                  ? "opacity-60 border-slate-200 bg-slate-50"
                  : "border-slate-200 border-b-4 hover:border-indigo-300 hover:bg-indigo-50/30"
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <span
                  className={`text-[10px] font-black px-2 py-1 rounded-lg uppercase tracking-wide ${
                    item.type === ItemType.WORD
                      ? "bg-blue-100 text-blue-600"
                      : "bg-emerald-100 text-emerald-600"
                  }`}
                >
                  {item.type}
                </span>
                <button
                  onClick={(e) => toggleStatus(item, e)}
                  className={`transition-colors ${
                    item.isActive ? "text-indigo-500" : "text-slate-300"
                  }`}
                >
                  {item.isActive ? (
                    <ToggleRight size={32} />
                  ) : (
                    <ToggleLeft size={32} />
                  )}
                </button>
              </div>

              <h3 className="text-lg font-bold text-slate-700 mb-1 line-clamp-1">
                {item.term}
              </h3>
              <p className="text-sm text-slate-500 font-medium line-clamp-2 min-h-[2.5rem]">
                {item.type === ItemType.WORD
                  ? item.meanings.join(", ")
                  : item.description}
              </p>

              <div className="mt-4 pt-3 border-t-2 border-slate-100 flex items-center justify-between text-xs font-bold text-slate-400">
                <div className="flex items-center space-x-1 text-emerald-500">
                  <CheckCircle2 size={16} />
                  <span>{item.stats.correct}</span>
                </div>
                <div className="flex items-center space-x-1 text-rose-400">
                  <XCircle size={16} />
                  <span>{item.stats.incorrect}</span>
                </div>
                <div>
                  {item.stats.correct + item.stats.incorrect > 0
                    ? Math.round(
                        (item.stats.correct /
                          (item.stats.correct + item.stats.incorrect)) *
                          100
                      )
                    : 0}
                  %
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Modal */}
      {selectedItem && (
        <Modal
          isOpen={!!selectedItem}
          onClose={() => setSelectedItem(null)}
          title="Edit Item"
        >
          <div className="space-y-6">
            <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border-2 border-slate-100">
              <span className="text-sm font-bold text-slate-600">
                Included in exercises
              </span>
              <button
                type="button"
                onClick={toggleStatusInModal}
                className={`${
                  selectedItem.isActive ? "text-indigo-500" : "text-slate-300"
                } transition-colors`}
              >
                {selectedItem.isActive ? (
                  <ToggleRight size={40} />
                ) : (
                  <ToggleLeft size={40} />
                )}
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">
                  Term
                </label>
                <input
                  type="text"
                  value={editTerm}
                  onChange={(e) => setEditTerm(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 bg-white focus:border-indigo-400 focus:outline-none font-medium text-slate-700"
                />
              </div>

              {selectedItem.type === ItemType.WORD ? (
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-400 mb-1">
                    Meanings
                  </label>
                  <div className="space-y-2">
                    {editMeanings.map((m, idx) => (
                      <div key={idx} className="flex gap-2">
                        <input
                          type="text"
                          value={m}
                          onChange={(e) =>
                            handleEditMeaningChange(idx, e.target.value)
                          }
                          className="flex-1 px-4 py-2 rounded-xl border-2 border-slate-200 focus:border-indigo-400 focus:outline-none font-medium text-slate-700"
                        />
                        <button
                          type="button"
                          onClick={() => removeEditMeaning(idx)}
                          className="text-slate-300 hover:text-rose-500 px-2"
                        >
                          <Trash2 size={20} />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={addEditMeaning}
                      className="text-sm text-indigo-500 font-bold uppercase tracking-wide mt-2"
                    >
                      + Add meaning
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-400 mb-1">
                    Description
                  </label>
                  <textarea
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-indigo-400 focus:outline-none h-24 resize-none font-medium text-slate-700"
                  />
                </div>
              )}

              <div className="flex gap-3 pt-4">
                {isConfirmingDelete ? (
                  <div className="flex flex-1 gap-2 animate-in fade-in zoom-in duration-200">
                    <button
                      type="button"
                      onClick={handleCancelDelete}
                      className="px-4 py-3 text-slate-500 bg-slate-100 border-2 border-slate-200 hover:bg-slate-200 rounded-xl transition-all font-bold text-sm"
                    >
                      CANCEL
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmDelete}
                      className="flex-1 flex items-center justify-center px-4 py-3 text-white bg-rose-500 border-2 border-rose-600 hover:bg-rose-600 rounded-xl transition-all font-bold text-sm"
                    >
                      CONFIRM DELETE
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleDeleteClick}
                    className="flex items-center justify-center px-4 py-3 text-rose-500 bg-rose-50 border-2 border-rose-100 hover:border-rose-200 hover:bg-rose-100 rounded-xl transition-all"
                  >
                    <Trash2 size={24} />
                  </button>
                )}

                {!isConfirmingDelete && (
                  <button
                    type="submit"
                    className="flex-1 py-3 font-bold text-white bg-indigo-500 hover:bg-indigo-600 rounded-xl border-b-4 border-indigo-700 active:border-b-0 active:translate-y-1 transition-all uppercase tracking-wide"
                  >
                    Save Changes
                  </button>
                )}
              </div>
            </form>

            <div className="border-t-2 border-slate-100 pt-4">
              <h4 className="text-[10px] font-bold text-slate-400 uppercase mb-2">
                Lifetime Statistics
              </h4>
              <div className="flex justify-around bg-slate-50 p-3 rounded-xl border-2 border-slate-100">
                <div className="text-center">
                  <div className="text-xl font-black text-emerald-500">
                    {selectedItem.stats.correct}
                  </div>
                  <div className="text-[10px] text-slate-400 uppercase font-bold">
                    Correct
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-black text-rose-500">
                    {selectedItem.stats.incorrect}
                  </div>
                  <div className="text-[10px] text-slate-400 uppercase font-bold">
                    Wrong
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Add New Modal (Replicated from Home logic for Manage page) */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add to Library"
      >
        <form onSubmit={handleAddSubmit} className="space-y-6">
          <div className="flex gap-2 p-1 bg-slate-100 rounded-xl border-2 border-slate-100">
            <button
              type="button"
              onClick={() => withSound(() => setAddMode(ItemType.WORD), 100)}
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${
                addMode === ItemType.WORD
                  ? "bg-white text-indigo-500 border-b-4 border-slate-200"
                  : "text-slate-400 hover:text-slate-600"
              }`}
            >
              WORD
            </button>
            <button
              type="button"
              onClick={() =>
                withSound(() => setAddMode(ItemType.DEFINITION), 100)
              }
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${
                addMode === ItemType.DEFINITION
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
                {addMode === ItemType.WORD
                  ? "Keyword / Term"
                  : "Term to Define"}
              </label>
              <input
                type="text"
                value={addTerm}
                onChange={(e) => setAddTerm(e.target.value)}
                placeholder={
                  addMode === ItemType.WORD ? "e.g., Apple" : "e.g., Gravity"
                }
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-400 focus:outline-none transition-all font-medium text-slate-700"
                required
              />
            </div>

            {addMode === ItemType.WORD ? (
              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-2">
                  Meanings
                </label>
                <div className="space-y-3">
                  {addMeanings.map((meaning, idx) => (
                    <div key={idx} className="flex gap-2">
                      <input
                        type="text"
                        value={meaning}
                        onChange={(e) =>
                          handleAddMeaningChange(idx, e.target.value)
                        }
                        placeholder="Enter meaning..."
                        className="flex-1 px-4 py-3 rounded-xl border-2 border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-400 focus:outline-none transition-all font-medium text-slate-700"
                        required={idx === 0}
                      />
                      {addMeanings.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeAddMeaning(idx)}
                          className="p-3 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl border-2 border-transparent hover:border-rose-100 transition-colors"
                        >
                          <X size={20} />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={appendAddMeaning}
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
                  value={addDescription}
                  onChange={(e) => setAddDescription(e.target.value)}
                  placeholder="Enter definition..."
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-400 focus:outline-none transition-all h-32 resize-none font-medium text-slate-700"
                  required
                />
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="flex-1 py-3 font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-colors uppercase tracking-wide"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-3 font-bold text-white bg-indigo-500 hover:bg-indigo-600 rounded-xl border-b-4 border-indigo-700 active:border-b-0 active:translate-y-1 transition-all uppercase tracking-wide"
            >
              Save Item
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Manage;
