import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { MemoryItem, AppSettings, Category } from "../types";
import { generateUUID } from "../utils/uuid";
import { dbService, STORES } from "../utils/db";

interface StoreContextType {
  items: MemoryItem[];
  categories: Category[];
  settings: AppSettings;
  loading: boolean;
  addItem: (
    item: Omit<MemoryItem, "id" | "stats" | "createdAt">
  ) => Promise<void>;
  updateItem: (id: string, updates: Partial<MemoryItem>) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  addCategory: (name: string) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  updateStats: (id: string, isCorrect: boolean) => void;
  updateSettings: (newSettings: Partial<AppSettings>) => void;
  importData: (
    newItems: MemoryItem[],
    newCategories: Category[]
  ) => Promise<void>;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

const SETTINGS_ID = "app_settings";

const DEFAULT_SETTINGS: AppSettings = {
  maxQuestionsPerSession: 10,
};

// Seed data based on user request context, mostly empty or basic
const SEED_DATA: MemoryItem[] = [
  {
    id: "seed-1",
    key: "Cat",
    pairs: ["Kucing", "Hewan berkaki empat"],
    isActive: true,
    stats: { correct: 0, incorrect: 0 },
    createdAt: Date.now(),
  },
  {
    id: "seed-2",
    key: "Photosynthesis",
    pairs: [
      "The process by which green plants use sunlight to synthesize foods.",
    ],
    isActive: true,
    stats: { correct: 0, incorrect: 0 },
    createdAt: Date.now(),
  },
  {
    id: "seed-3",
    key: "Hello",
    pairs: ["Halo", "Hai", "Sapaan"],
    isActive: true,
    stats: { correct: 0, incorrect: 0 },
    createdAt: Date.now(),
  },
  {
    id: "seed-4",
    key: "Run",
    pairs: ["Lari", "Berlari"],
    isActive: true,
    stats: { correct: 0, incorrect: 0 },
    createdAt: Date.now(),
  },
  {
    id: "seed-5",
    key: "Gravity",
    pairs: ["The force that attracts a body toward the center of the earth."],
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

  // Initial Load & Migration
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [dbItems, dbCategories, dbSettings] = await Promise.all([
          dbService.getAll<MemoryItem>(STORES.ITEMS),
          dbService.getAll<Category>(STORES.CATEGORIES),
          dbService.get<{ key: string } & AppSettings>(
            STORES.SETTINGS,
            SETTINGS_ID
          ),
        ]);

        // Check if DB is empty to trigger seed
        if (dbItems.length === 0 && dbCategories.length === 0) {
          // Seed data if truly fresh
          await dbService.bulkPut(STORES.ITEMS, SEED_DATA);
          setItems(SEED_DATA);
        } else {
          setItems(dbItems);
          setCategories(dbCategories);
        }

        if (dbSettings) {
          // exclude 'key' from settings object
          const { key, ...rest } = dbSettings;
          setSettings(rest as AppSettings);
        }
      } catch (err) {
        console.error("Failed to load or migrate data:", err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Sync helpers - we update local state immediately for UI responsiveness,
  // and async update DB in background.

  const addItem = async (
    newItemData: Omit<MemoryItem, "id" | "stats" | "createdAt">
  ) => {
    const newItem: MemoryItem = {
      ...newItemData,
      id: generateUUID(),
      stats: { correct: 0, incorrect: 0 },
      createdAt: Date.now(),
    };
    setItems((prev) => [newItem, ...prev]);
    await dbService.put(STORES.ITEMS, newItem);
  };

  const updateItem = async (id: string, updates: Partial<MemoryItem>) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const updated = { ...item, ...updates };
          // Fire and forget DB update (or catch error)
          dbService.put(STORES.ITEMS, updated).catch(console.error);
          return updated;
        }
        return item;
      })
    );
  };

  const deleteItem = async (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
    await dbService.delete(STORES.ITEMS, id);
  };

  const addCategory = async (name: string) => {
    if (!name.trim()) return;
    const newCategory: Category = {
      id: generateUUID(),
      name: name.trim(),
    };
    setCategories((prev) => [...prev, newCategory]);
    await dbService.put(STORES.CATEGORIES, newCategory);
  };

  const deleteCategory = async (id: string) => {
    // Remove items locally
    setItems((prev) => prev.filter((item) => item.categoryId !== id));
    setCategories((prev) => prev.filter((c) => c.id !== id));

    // Remove from DB
    await dbService.delete(STORES.CATEGORIES, id);
    // Cascade delete in DB
    const allItems = await dbService.getAll<MemoryItem>(STORES.ITEMS);
    const itemsToDelete = allItems.filter((i) => i.categoryId === id);
    for (const item of itemsToDelete) {
      await dbService.delete(STORES.ITEMS, item.id);
    }
  };

  const updateStats = (id: string, isCorrect: boolean) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const updated = {
            ...item,
            stats: {
              correct: isCorrect ? item.stats.correct + 1 : item.stats.correct,
              incorrect: isCorrect
                ? item.stats.incorrect
                : item.stats.incorrect + 1,
            },
          };
          dbService.put(STORES.ITEMS, updated).catch(console.error);
          return updated;
        }
        return item;
      })
    );
  };

  const updateSettings = (newSettings: Partial<AppSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      dbService
        .put(STORES.SETTINGS, { key: SETTINGS_ID, ...updated })
        .catch(console.error);
      return updated;
    });
  };

  const importData = async (newItems: any[], newCategories: Category[]) => {
    // Migration logic for imported data
    const migratedItems: MemoryItem[] = newItems.map((item) => {
      const pairs = item.pairs || item.meanings || [];
      if (item.description && pairs.length === 0) {
        pairs.push(item.description);
      }
      return {
        id: item.id || generateUUID(),
        key: item.key || item.term || "Unknown",
        pairs: pairs,
        imageUrl: item.imageUrl,
        isActive: item.isActive ?? true,
        categoryId: item.categoryId,
        stats: item.stats || { correct: 0, incorrect: 0 },
        createdAt: item.createdAt || Date.now(),
      };
    });

    // Update DB first
    await dbService.bulkPut(STORES.CATEGORIES, newCategories);
    await dbService.bulkPut(STORES.ITEMS, migratedItems);

    // Update State
    setCategories((prev) => {
      const combined = [...prev, ...newCategories];
      const unique = Array.from(
        new Map(combined.map((c) => [c.id, c])).values()
      );
      return unique;
    });

    setItems((prev) => {
      const combined = [...prev, ...migratedItems];
      const unique = Array.from(
        new Map(combined.map((i) => [i.id, i])).values()
      );
      return unique;
    });
  };

  if (loading) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center text-slate-500 gap-4">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="font-semibold animate-pulse">Initializing Database...</p>
      </div>
    );
  }

  return (
    <StoreContext.Provider
      value={{
        items,
        categories,
        settings,
        loading,
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
