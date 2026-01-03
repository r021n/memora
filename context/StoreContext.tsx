import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { MemoryItem, AppSettings, ItemType, Category } from "../types";
import { generateUUID } from "../utils/uuid";

interface StoreContextType {
  items: MemoryItem[];
  categories: Category[];
  settings: AppSettings;
  addItem: (item: Omit<MemoryItem, "id" | "stats" | "createdAt">) => void;
  updateItem: (id: string, updates: Partial<MemoryItem>) => void;
  deleteItem: (id: string) => void;
  addCategory: (name: string) => void;
  deleteCategory: (id: string) => void;
  updateStats: (id: string, isCorrect: boolean) => void;
  updateSettings: (newSettings: Partial<AppSettings>) => void;
  importData: (newItems: MemoryItem[], newCategories: Category[]) => void;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

const STORAGE_KEY_ITEMS = "memora_items";
const STORAGE_KEY_CATEGORIES = "memora_categories";
const STORAGE_KEY_SETTINGS = "memora_settings";

const DEFAULT_SETTINGS: AppSettings = {
  maxQuestionsPerSession: 10,
};

// Seed data based on user request context, mostly empty or basic
const SEED_DATA: MemoryItem[] = [
  {
    id: "seed-1",
    type: ItemType.WORD,
    term: "Cat",
    meanings: ["Kucing", "Hewan berkaki empat"],
    isActive: true,
    stats: { correct: 0, incorrect: 0 },
    createdAt: Date.now(),
  },
  {
    id: "seed-2",
    type: ItemType.DEFINITION,
    term: "Photosynthesis",
    description:
      "The process by which green plants use sunlight to synthesize foods.",
    meanings: [],
    isActive: true,
    stats: { correct: 0, incorrect: 0 },
    createdAt: Date.now(),
  },
  {
    id: "seed-3",
    type: ItemType.WORD,
    term: "Hello",
    meanings: ["Halo", "Hai", "Sapaan"],
    isActive: true,
    stats: { correct: 0, incorrect: 0 },
    createdAt: Date.now(),
  },
  {
    id: "seed-4",
    type: ItemType.WORD,
    term: "Run",
    meanings: ["Lari", "Berlari"],
    isActive: true,
    stats: { correct: 0, incorrect: 0 },
    createdAt: Date.now(),
  },
  {
    id: "seed-5",
    type: ItemType.DEFINITION,
    term: "Gravity",
    description:
      "The force that attracts a body toward the center of the earth.",
    meanings: [],
    isActive: true,
    stats: { correct: 0, incorrect: 0 },
    createdAt: Date.now(),
  },
];

export const StoreProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [items, setItems] = useState<MemoryItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  // Load from local storage on mount
  useEffect(() => {
    try {
      const storedItems = localStorage.getItem(STORAGE_KEY_ITEMS);
      const storedCategories = localStorage.getItem(STORAGE_KEY_CATEGORIES);
      const storedSettings = localStorage.getItem(STORAGE_KEY_SETTINGS);

      if (storedItems) {
        setItems(JSON.parse(storedItems));
      } else {
        setItems(SEED_DATA);
      }

      if (storedCategories) {
        setCategories(JSON.parse(storedCategories));
      }

      if (storedSettings) {
        setSettings(JSON.parse(storedSettings));
      }
    } catch (e) {
      console.error("Failed to load data", e);
    } finally {
      setLoading(false);
    }
  }, []);

  // Save to local storage whenever state changes
  useEffect(() => {
    if (!loading) {
      localStorage.setItem(STORAGE_KEY_ITEMS, JSON.stringify(items));
    }
  }, [items, loading]);

  useEffect(() => {
    if (!loading) {
      localStorage.setItem(STORAGE_KEY_CATEGORIES, JSON.stringify(categories));
    }
  }, [categories, loading]);

  useEffect(() => {
    if (!loading) {
      localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
    }
  }, [settings, loading]);

  const addItem = (
    newItemData: Omit<MemoryItem, "id" | "stats" | "createdAt">
  ) => {
    const newItem: MemoryItem = {
      ...newItemData,
      id: generateUUID(),
      stats: { correct: 0, incorrect: 0 },
      createdAt: Date.now(),
    };
    setItems((prev) => [newItem, ...prev]);
  };

  const updateItem = (id: string, updates: Partial<MemoryItem>) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );
  };

  const deleteItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const addCategory = (name: string) => {
    if (!name.trim()) return;
    const newCategory: Category = {
      id: generateUUID(),
      name: name.trim(),
    };
    setCategories((prev) => [...prev, newCategory]);
  };

  const deleteCategory = (id: string) => {
    // Also remove category reference from items?
    // User requirement: "user dapat membuat kategori kategori. untuk definisi atau word bebas untuk diinclude ke category atau tidak"
    // Usually safest to clear the reference.
    setItems((prev) =>
      prev.map((item) =>
        item.categoryId === id ? { ...item, categoryId: undefined } : item
      )
    );
    setCategories((prev) => prev.filter((c) => c.id !== id));
  };

  const updateStats = (id: string, isCorrect: boolean) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          return {
            ...item,
            stats: {
              correct: isCorrect ? item.stats.correct + 1 : item.stats.correct,
              incorrect: isCorrect
                ? item.stats.incorrect
                : item.stats.incorrect + 1,
            },
          };
        }
        return item;
      })
    );
  };

  const updateSettings = (newSettings: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  };

  const importData = (newItems: MemoryItem[], newCategories: Category[]) => {
    // Merge strategies could vary. Here we append.
    // For categories, if ID exists, we might skip or overwrite?
    // Let's assume we just append missing ones or merge carefully.
    // Actually, simple append for now, relying on UUIDs to be likely unique if generated elsewhere,
    // or if the user is importing from a different export.
    // If IDs collide, we probably want to keep the existing one or overwrite?
    // Let's just spread them in.

    setCategories((prev) => {
      const combined = [...prev, ...newCategories];
      // remove duplicates by ID just in case
      const unique = Array.from(
        new Map(combined.map((c) => [c.id, c])).values()
      );
      return unique;
    });

    setItems((prev) => {
      const combined = [...prev, ...newItems];
      // remove duplicates by ID
      const unique = Array.from(
        new Map(combined.map((i) => [i.id, i])).values()
      );
      return unique;
    });
  };

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center text-slate-500">
        Loading...
      </div>
    );
  }

  return (
    <StoreContext.Provider
      value={{
        items,
        categories,
        settings,
        addItem,
        updateItem,
        deleteItem,
        addCategory,
        deleteCategory,
        updateStats,
        updateSettings,
        importData,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error("useStore must be used within a StoreProvider");
  }
  return context;
};
