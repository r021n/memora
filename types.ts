export interface Stats {
  correct: number;
  incorrect: number;
}

export interface Category {
  id: string;
  name: string;
}

export interface MemoryItem {
  id: string;
  term: string; // The main word or the term being defined
  meanings: string[]; // List of meanings/definitions
  imageUrl?: string; // Optional image URL
  isActive: boolean;
  categoryId?: string;
  stats: Stats;
  createdAt: number;
}

export interface AppSettings {
  maxQuestionsPerSession: number;
}

export enum QuestionType {
  MULTIPLE_CHOICE = "MULTIPLE_CHOICE",
  MATCHING = "MATCHING",
}

export interface MatchingPair {
  id: string;
  leftContent: string; // Hidden initially
  rightContent: string; // Visible
  item: MemoryItem; // Keep reference
}

export interface QuestionData {
  type: QuestionType;
  // Common
  item?: MemoryItem; // For Multiple Choice (main item)

  // Multiple Choice Specific
  questionText?: string;
  correctAnswerText?: string;
  distractors?: string[];

  // Matching Specific
  pairs?: MatchingPair[];
}
