import React, { useState, useEffect } from "react";
import { useStore } from "../context/StoreContext";
import Modal from "../components/Modal";
import CustomSelect from "../components/CustomSelect";
import Toast from "../components/Toast";
import LoadingOverlay from "../components/LoadingOverlay";
import { MemoryItem } from "../types";
import {
  Trash2,
  ToggleLeft,
  ToggleRight,
  CheckCircle2,
  XCircle,
  Sliders,
  Plus,
  X,
  AlertCircle,
  Upload,
  Download,
  Folder,
  ArrowLeft,
  Search,
} from "lucide-react";
import { withSound } from "../utils/sound";
import { compressImage } from "../utils/image";
import { Image as ImageIcon } from "lucide-react";

const Manage: React.FC = () => {
  const {
    items,
    updateItem,
    deleteItem,
    addItem,
    settings,
    updateSettings,
    categories,
    addCategory,
    deleteCategory,
    importData, // Add this to context destructuring
  } = useStore();
  const [selectedItem, setSelectedItem] = useState<MemoryItem | null>(null);

  // -- UI Feedback State --
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);

  // Group Deletion State
  const [deleteGroupModal, setDeleteGroupModal] = useState<{
    isOpen: boolean;
    categoryId: string | null;
    categoryName: string;
  }>({
    isOpen: false,
    categoryId: null,
    categoryName: "",
  });
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");

  // -- View & Search State --
  const [viewMode, setViewMode] = useState<"GROUPS" | "ITEMS">("GROUPS");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null
  );
  const [searchQuery, setSearchQuery] = useState("");

  // -- Edit State --
  const [editKey, setEditKey] = useState("");
  const [editPairs, setEditPairs] = useState<string[]>([]);
  const [editCategoryId, setEditCategoryId] = useState<string>("");
  const [editImageUrl, setEditImageUrl] = useState("");
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  // -- Add State --
  const [addKey, setAddKey] = useState("");
  const [addPairs, setAddPairs] = useState<string[]>([""]);
  const [addCategoryId, setAddCategoryId] = useState<string>("");
  const [addImageUrl, setAddImageUrl] = useState("");

  // Helpers
  const categoryOptions = categories.map((c) => ({ id: c.id, label: c.name }));

  // Derived State
  const filteredItems = items.filter((item) => {
    // 1. Filter by Category
    if (selectedCategoryId === null) {
      // "All" group - all items
    } else {
      if (item.categoryId !== selectedCategoryId) return false;
    }

    // 2. Filter by Search Query
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const termMatch = item.key.toLowerCase().includes(q);
    const pairMatch = item.pairs.some((m) => m.toLowerCase().includes(q));

    return termMatch || pairMatch;
  });

  // Calculate Group Stats
  const getGroupStats = (catId: string | null) => {
    const groupItems = items.filter((i) =>
      catId === null ? true : i.categoryId === catId
    );
    return { count: groupItems.length };
  };

  // Reset delete confirmation when modal closes or item changes
  useEffect(() => {
    setIsConfirmingDelete(false);
  }, [selectedItem]);

  // --- Handlers ---

  const handleGroupClick = (catId: string | null) => {
    withSound(() => {
      setSelectedCategoryId(catId);
      setViewMode("ITEMS");
      setSearchQuery(""); // clear search when entering a group
    });
  };

  const handleBackToGroups = () => {
    withSound(() => {
      setViewMode("GROUPS");
      setSelectedCategoryId(null);
    });
  };

  const handleDownload = async (e: React.MouseEvent, catId: string | null) => {
    e.stopPropagation();
    withSound(async () => {
      try {
        setIsExporting(true);
        // Small delay to allow UI to update
        await new Promise((resolve) => setTimeout(resolve, 100));

        const groupItems = items.filter((i) =>
          catId === null ? true : i.categoryId === catId
        );
        let groupName = "All_Items";
        if (catId) {
          const cat = categories.find((c) => c.id === catId);
          groupName = cat ? cat.name.replace(/\s+/g, "_") : "Unknown_Group";
        }

        const dataToExport = {
          exportDate: new Date().toISOString(),
          groupName: groupName,
          categoryId: catId,
          items: groupItems.map((item) => ({
            ...item,
            stats: { correct: 0, incorrect: 0 },
          })),
          categories: catId
            ? categories.filter((c) => c.id === catId)
            : categories,
        };

        const blob = new Blob([JSON.stringify(dataToExport, null, 2)], {
          type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `memora_${groupName}_${new Date().getTime()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch (error) {
        console.error("Export failed", error);
        setToast({ message: "Export failed", type: "error" });
      } finally {
        setIsExporting(false);
      }
    });
  };

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleUploadClick = () => {
    withSound(() => {
      fileInputRef.current?.click();
    }, 0);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Start loading animation immediately
    setIsLoading(true);

    // Use a timeout to ensure the loading bar is shown for at least 1 second
    setTimeout(() => {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const json = JSON.parse(event.target?.result as string);
          if (json.items && Array.isArray(json.items)) {
            withSound(async () => {
              await importData(json.items, json.categories || []);
              setIsLoading(false);
              setToast({
                message: `Successfully imported ${json.items.length} items.`,
                type: "success",
              });
            });
          } else {
            setIsLoading(false);
            setToast({
              message: "Invalid file format. 'items' array missing.",
              type: "error",
            });
          }
        } catch (err) {
          console.error(err);
          setIsLoading(false);
          setToast({ message: "Failed to parse JSON file.", type: "error" });
        } finally {
          if (fileInputRef.current) fileInputRef.current.value = "";
        }
      };
      reader.readAsText(file);
    }, 1000);
  };

  const handleImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (url: string) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsCompressing(true);
      const compressedBase64 = await compressImage(file);
      setter(compressedBase64);
      setToast({ message: "Image uploaded and compressed!", type: "success" });
    } catch (error) {
      console.error("Image upload failed", error);
      setToast({ message: "Failed to process image.", type: "error" });
    } finally {
      setIsCompressing(false);
    }
  };

  // --- Edit Functions ---

  const openEditModal = (item: MemoryItem) => {
    withSound(() => {
      setSelectedItem(item);
      setEditKey(item.key);
      setEditPairs(item.pairs.length ? [...item.pairs] : [""]);
      setEditCategoryId(item.categoryId || "");
      setEditImageUrl(item.imageUrl || "");
      setIsConfirmingDelete(false);
    });
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;

    withSound(() => {
      const updates: Partial<MemoryItem> = {
        key: editKey,
        pairs: editPairs.filter((m) => m.trim() !== ""),
        categoryId: editCategoryId || undefined,
        imageUrl: editImageUrl.trim() || undefined,
      };

      updateItem(selectedItem.id, updates);
      setSelectedItem(null);
      setToast({ message: "Item updated successfully!", type: "success" });
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

  // Edit Pairs Handlers
  const handleEditPairChange = (index: number, val: string) => {
    const arr = [...editPairs];
    arr[index] = val;
    setEditPairs(arr);
  };
  const addEditPair = () => setEditPairs([...editPairs, ""]);
  const removeEditPair = (idx: number) =>
    setEditPairs(editPairs.filter((_, i) => i !== idx));

  // --- Add Functions ---

  const handleOpenAdd = () => {
    withSound(() => {
      setAddCategoryId(selectedCategoryId || "");
      setIsAddModalOpen(true);
    });
  };

  const handleOpenCategory = () => {
    withSound(() => setIsCategoryModalOpen(true));
  };

  // Group Deletion Handlers
  const handleDeleteGroupClick = (
    e: React.MouseEvent,
    categoryId: string,
    categoryName: string
  ) => {
    e.stopPropagation();
    withSound(() => {
      setDeleteGroupModal({
        isOpen: true,
        categoryId,
        categoryName,
      });
    });
  };

  const handleConfirmDeleteGroup = () => {
    if (deleteGroupModal.categoryId) {
      withSound(() => {
        deleteCategory(deleteGroupModal.categoryId!);
        setDeleteGroupModal({
          isOpen: false,
          categoryId: null,
          categoryName: "",
        });
      });
    }
  };

  const handleCancelDeleteGroup = () => {
    setDeleteGroupModal({
      isOpen: false,
      categoryId: null,
      categoryName: "",
    });
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addKey.trim()) return;

    withSound(() => {
      const filteredPairs = addPairs.filter((m) => m.trim() !== "");
      if (filteredPairs.length === 0) return;
      addItem({
        key: addKey,
        pairs: filteredPairs,
        isActive: true,
        categoryId: addCategoryId || undefined,
        imageUrl: addImageUrl.trim() || undefined,
      });

      // Reset Add Form
      setAddKey("");
      setAddPairs([""]);
      setAddCategoryId("");
      setAddImageUrl("");
      setIsAddModalOpen(false);
    });
  };

  const handleAddPairChange = (index: number, val: string) => {
    const arr = [...addPairs];
    arr[index] = val;
    setAddPairs(arr);
  };
  const appendAddPair = () => setAddPairs([...addPairs, ""]);
  const removeAddPair = (idx: number) =>
    setAddPairs(addPairs.filter((_, i) => i !== idx));

  return (
    <div className="max-w-6xl min-h-screen px-6 pt-20 pb-24 mx-auto sm:pb-10">
      <LoadingOverlay isVisible={isLoading} message="Importing Data..." />
      <LoadingOverlay isVisible={isExporting} message="Preparing Export..." />
      <LoadingOverlay
        isVisible={isCompressing}
        message="Compressing Image..."
      />
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      {/* Hidden File Input for Upload */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept=".json"
      />

      {/* Header Area */}
      <div className="mb-8">
        {viewMode === "GROUPS" ? (
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div>
              <h1 className="text-3xl font-extrabold text-slate-700">
                Library
              </h1>
              <p className="font-medium text-slate-500">
                Manage your collections
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleUploadClick}
                className="flex items-center px-4 py-3 space-x-2 text-sm font-bold text-slate-600 transition-all bg-white border-b-4 border-slate-200 rounded-xl hover:bg-slate-50 active:border-b-0 active:translate-y-1"
              >
                <Upload size={18} />
                <span>Import JSON</span>
              </button>
              <button
                onClick={handleOpenCategory}
                className="flex items-center px-4 py-3 space-x-2 text-sm font-bold text-indigo-500 transition-all bg-white border-b-4 border-slate-200 rounded-xl hover:bg-slate-50 active:border-b-0 active:translate-y-1"
              >
                <Sliders size={18} />
                <span>Categories</span>
              </button>
              <button
                onClick={handleOpenAdd}
                className="flex items-center px-4 py-3 space-x-2 text-sm font-bold text-white transition-all bg-indigo-500 border-b-4 border-indigo-700 rounded-xl hover:bg-indigo-600 active:border-b-0 active:translate-y-1"
              >
                <Plus size={18} />
                <span>Add Item</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 mb-2">
              <button
                onClick={handleBackToGroups}
                className="p-2 transition-colors text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                <ArrowLeft size={24} />
              </button>
              <h2 className="text-2xl font-bold text-slate-700">
                {selectedCategoryId === null
                  ? "All Items"
                  : categories.find((c) => c.id === selectedCategoryId)?.name ||
                    "Group"}
              </h2>
            </div>
            <div className="flex gap-2">
              <div className="relative w-full">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
                  <Search size={20} />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search items..."
                  className="w-full pl-10 pr-4 py-3 font-medium bg-white border-2 border-slate-200 rounded-xl focus:outline-none focus:border-indigo-400 text-slate-700"
                />
              </div>
              <button
                onClick={handleOpenAdd}
                className="flex items-center px-4 py-3 space-x-2 text-sm font-bold text-white transition-all bg-indigo-500 border-b-4 border-indigo-700 rounded-xl hover:bg-indigo-600 active:border-b-0 active:translate-y-1"
              >
                <Plus size={18} />
                <span className="hidden sm:inline">Add</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Content */}
      {viewMode === "GROUPS" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* 1. All Items Card */}
          <div
            onClick={() => handleGroupClick(null)}
            className="group relative bg-white rounded-2xl border-2 border-slate-200 border-b-4 p-6 cursor-pointer hover:border-indigo-300 hover:bg-indigo-50/10 transition-all duration-200 active:scale-[0.98]"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-indigo-100 text-indigo-600 rounded-xl">
                <Folder size={24} />
              </div>
              <button
                onClick={(e) => handleDownload(e, null)}
                className="p-2 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 rounded-lg transition-colors"
                title="Download All"
              >
                <Download size={20} />
              </button>
            </div>
            <h3 className="text-xl font-bold text-slate-700 mb-1">All Items</h3>
            <p className="text-slate-500 font-medium">{items.length} items</p>
          </div>

          {/* 2. Category Cards */}
          {categories.map((cat) => (
            <div
              key={cat.id}
              onClick={() => handleGroupClick(cat.id)}
              className="group relative bg-white rounded-2xl border-2 border-slate-200 border-b-4 p-6 cursor-pointer hover:border-indigo-300 hover:bg-indigo-50/10 transition-all duration-200 active:scale-[0.98]"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-white border-2 border-slate-100 text-slate-500 rounded-xl group-hover:bg-white/80">
                  <Folder size={24} />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={(e) => handleDownload(e, cat.id)}
                    className="p-2 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 rounded-lg transition-colors"
                    title="Download Group"
                  >
                    <Download size={20} />
                  </button>
                  <button
                    onClick={(e) => handleDeleteGroupClick(e, cat.id, cat.name)}
                    className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                    title="Delete Group"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>
              <h3 className="text-xl font-bold text-slate-700 mb-1 line-clamp-1">
                {cat.name}
              </h3>
              <p className="text-slate-500 font-medium">
                {getGroupStats(cat.id).count} items
              </p>
            </div>
          ))}
        </div>
      ) : (
        <div>
          {filteredItems.length === 0 ? (
            <div className="py-20 text-center bg-white border-2 border-dashed rounded-2xl border-slate-300">
              <p className="font-bold text-slate-400">
                {searchQuery
                  ? "No matching items found."
                  : "No items in this group."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  onClick={() => openEditModal(item)}
                  className={`group relative bg-white rounded-2xl border-2 p-5 cursor-pointer transition-all active:scale-[0.98] duration-200 ${
                    !item.isActive
                      ? "opacity-60 border-slate-200 bg-slate-50"
                      : "border-slate-200 border-b-4 hover:border-indigo-300 hover:bg-indigo-50/30"
                  }`}
                >
                  <div className="flex items-start justify-end mb-2">
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

                  <h3 className="mb-1 text-lg font-bold text-slate-700 line-clamp-1">
                    {item.key}
                  </h3>
                  <p className="text-sm text-slate-500 font-medium line-clamp-2 min-h-[2.5rem]">
                    {item.pairs.join(", ")}
                  </p>

                  {item.categoryId && (
                    <div className="mt-3">
                      <span className="inline-block px-2 py-1 text-[10px] font-bold text-slate-500 bg-slate-100 rounded-md">
                        {categories.find((c) => c.id === item.categoryId)
                          ?.name || "Unknown"}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-3 mt-4 text-xs font-bold border-t-2 border-slate-100 text-slate-400">
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
            <div className="flex items-center justify-between p-3 border-2 bg-slate-50 rounded-xl border-slate-100">
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

            {/* Category Select for Edit */}
            <div>
              <label className="block mb-1 text-xs font-bold uppercase text-slate-400">
                Category
              </label>
              <CustomSelect
                options={categoryOptions}
                value={editCategoryId}
                onChange={setEditCategoryId}
                placeholder="No Category"
              />
            </div>

            <div>
              <label className="block mb-1 text-xs font-bold uppercase text-slate-400">
                Image
              </label>
              <div className="flex items-center gap-4">
                {editImageUrl && (
                  <div className="relative w-24 h-24 overflow-hidden border-2 rounded-xl border-slate-200">
                    <img
                      src={editImageUrl}
                      alt="Preview"
                      className="object-cover w-full h-full"
                    />
                    <button
                      onClick={() => setEditImageUrl("")}
                      className="absolute top-1 right-1 p-1 bg-white rounded-full shadow-sm text-rose-500 hover:bg-rose-50"
                    >
                      <X size={12} />
                    </button>
                  </div>
                )}
                <label className="flex flex-col items-center justify-center w-24 h-24 transition-all border-2 border-dashed cursor-pointer rounded-xl border-slate-300 hover:border-indigo-400 hover:bg-indigo-50 text-slate-400 hover:text-indigo-500">
                  <ImageIcon size={24} />
                  <span className="text-[10px] font-bold mt-1">Upload</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleImageUpload(e, setEditImageUrl)}
                  />
                </label>
              </div>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block mb-1 text-xs font-bold uppercase text-slate-400">
                  Key
                </label>
                <input
                  type="text"
                  value={editKey}
                  onChange={(e) => setEditKey(e.target.value)}
                  className="w-full px-4 py-3 font-medium bg-white border-2 rounded-xl border-slate-200 focus:border-indigo-400 focus:outline-none text-slate-700"
                />
              </div>

              <div>
                <label className="block mb-1 text-xs font-bold uppercase text-slate-400">
                  Pairs
                </label>
                <div className="space-y-2">
                  {editPairs.map((m, idx) => (
                    <div key={idx} className="flex gap-2">
                      <input
                        type="text"
                        value={m}
                        onChange={(e) =>
                          handleEditPairChange(idx, e.target.value)
                        }
                        className="flex-1 px-4 py-2 font-medium border-2 rounded-xl border-slate-200 focus:border-indigo-400 focus:outline-none text-slate-700"
                      />
                      <button
                        type="button"
                        onClick={() => removeEditPair(idx)}
                        className="px-2 text-slate-300 hover:text-rose-500"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addEditPair}
                    className="mt-2 text-sm font-bold tracking-wide text-indigo-500 uppercase"
                  >
                    + Add pair
                  </button>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                {isConfirmingDelete ? (
                  <div className="flex flex-1 gap-2 duration-200 animate-in fade-in zoom-in">
                    <button
                      type="button"
                      onClick={handleCancelDelete}
                      className="px-4 py-3 text-sm font-bold transition-all border-2 text-slate-500 bg-slate-100 border-slate-200 hover:bg-slate-200 rounded-xl"
                    >
                      CANCEL
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmDelete}
                      className="flex items-center justify-center flex-1 px-4 py-3 text-sm font-bold text-white transition-all border-2 bg-rose-500 border-rose-600 hover:bg-rose-600 rounded-xl"
                    >
                      CONFIRM DELETE
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleDeleteClick}
                    className="flex items-center justify-center px-4 py-3 transition-all border-2 text-rose-500 bg-rose-50 border-rose-100 hover:border-rose-200 hover:bg-rose-100 rounded-xl"
                  >
                    <Trash2 size={24} />
                  </button>
                )}

                {!isConfirmingDelete && (
                  <button
                    type="submit"
                    className="flex-1 py-3 font-bold tracking-wide text-white uppercase transition-all bg-indigo-500 border-b-4 border-indigo-700 hover:bg-indigo-600 rounded-xl active:border-b-0 active:translate-y-1"
                  >
                    Save Changes
                  </button>
                )}
              </div>
            </form>

            <div className="pt-4 border-t-2 border-slate-100">
              <h4 className="text-[10px] font-bold text-slate-400 uppercase mb-2">
                Lifetime Statistics
              </h4>
              <div className="flex justify-around p-3 border-2 bg-slate-50 rounded-xl border-slate-100">
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

      {/* Add New Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add to Library"
      >
        <form onSubmit={handleAddSubmit} className="space-y-6">
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
              Image
            </label>
            <div className="flex items-center gap-4">
              {addImageUrl && (
                <div className="relative w-24 h-24 overflow-hidden border-2 rounded-xl border-slate-200">
                  <img
                    src={addImageUrl}
                    alt="Preview"
                    className="object-cover w-full h-full"
                  />
                  <button
                    type="button"
                    onClick={() => setAddImageUrl("")}
                    className="absolute top-1 right-1 p-1 bg-white rounded-full shadow-sm text-rose-500 hover:bg-rose-50"
                  >
                    <X size={12} />
                  </button>
                </div>
              )}
              <label className="flex flex-col items-center justify-center w-24 h-24 transition-all border-2 border-dashed cursor-pointer rounded-xl border-slate-300 hover:border-indigo-400 hover:bg-indigo-50 text-slate-400 hover:text-indigo-500">
                <ImageIcon size={24} />
                <span className="text-[10px] font-bold mt-1">Upload</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleImageUpload(e, setAddImageUrl)}
                />
              </label>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block mb-2 text-xs font-bold uppercase text-slate-400">
                Keyword / Key
              </label>
              <input
                type="text"
                value={addKey}
                onChange={(e) => setAddKey(e.target.value)}
                placeholder="e.g., Apple"
                className="w-full px-4 py-3 font-medium transition-all border-2 rounded-xl border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-400 focus:outline-none text-slate-700"
                required
              />
            </div>

            <div>
              <label className="block mb-2 text-xs font-bold uppercase text-slate-400">
                Pairs
              </label>
              <div className="space-y-3">
                {addPairs.map((meaning, idx) => (
                  <div key={idx} className="flex gap-2">
                    <input
                      type="text"
                      value={meaning}
                      onChange={(e) => handleAddPairChange(idx, e.target.value)}
                      placeholder="Enter meaning..."
                      className="flex-1 px-4 py-3 font-medium transition-all border-2 rounded-xl border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-400 focus:outline-none text-slate-700"
                      required={idx === 0}
                    />
                    {addPairs.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeAddPair(idx)}
                        className="p-3 transition-colors border-2 border-transparent text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl hover:border-rose-100"
                      >
                        <X size={20} />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={appendAddPair}
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
              onClick={() => setIsAddModalOpen(false)}
              className="flex-1 py-3 font-bold tracking-wide uppercase transition-colors text-slate-500 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-3 font-bold tracking-wide text-white uppercase transition-all bg-indigo-500 border-b-4 border-indigo-700 hover:bg-indigo-600 rounded-xl active:border-b-0 active:translate-y-1"
            >
              Save Item
            </button>
          </div>
        </form>
      </Modal>

      {/* Category Management Modal */}
      <Modal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        title="Manage Categories"
      >
        <div className="space-y-6">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              import("../utils/sound").then((mod) => mod.playClick());
              addCategory(newCategoryName);
              setNewCategoryName("");
            }}
            className="flex flex-col gap-2 sm:flex-row"
          >
            <input
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="New Category Name"
              className="flex-1 px-4 py-3 font-medium bg-white border-2 rounded-xl border-slate-200 focus:border-indigo-400 focus:outline-none text-slate-700"
            />
            <button
              type="submit"
              disabled={!newCategoryName.trim()}
              className="px-4 py-3 font-bold text-white transition-all bg-indigo-500 border-b-4 border-indigo-700 rounded-xl active:border-b-0 active:translate-y-1 hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              <Plus size={24} />
              <span className="ml-2 sm:hidden">Add Category</span>
            </button>
          </form>

          <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-2">
            {categories.length === 0 ? (
              <p className="text-center text-slate-400 font-medium py-4">
                No categories yet.
              </p>
            ) : (
              categories.map((cat) => (
                <div
                  key={cat.id}
                  className="flex items-center justify-between p-3 border-2 bg-slate-50 border-slate-100 rounded-xl"
                >
                  <span className="font-bold text-slate-700">{cat.name}</span>
                  <button
                    onClick={() => withSound(() => deleteCategory(cat.id))}
                    className="p-2 text-slate-400 hover:text-rose-500 transition-colors"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </Modal>

      {/* Delete Group Confirmation Modal */}
      <Modal
        isOpen={deleteGroupModal.isOpen}
        onClose={handleCancelDeleteGroup}
        title="Delete Group?"
      >
        <div className="space-y-6">
          <div className="flex flex-col items-center justify-center p-6 text-center border-2 border-rose-100 bg-rose-50 rounded-2xl">
            <div className="p-4 mb-4 bg-white rounded-full text-rose-500">
              <AlertCircle size={48} />
            </div>
            <h3 className="text-xl font-bold text-slate-700">Are you sure?</h3>
            <p className="mt-2 font-medium text-slate-500">
              You are about to delete{" "}
              <span className="font-bold text-slate-700">
                "{deleteGroupModal.categoryName}"
              </span>
              .
              <br />
              All items in this group will be permanently removed.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleCancelDeleteGroup}
              className="flex-1 py-3 font-bold tracking-wide uppercase transition-colors text-slate-500 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmDeleteGroup}
              className="flex-1 py-3 font-bold tracking-wide text-white uppercase transition-all bg-rose-500 border-b-4 border-rose-700 hover:bg-rose-600 rounded-xl active:border-b-0 active:translate-y-1"
            >
              Delete
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Manage;
