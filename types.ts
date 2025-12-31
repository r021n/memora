export enum ItemType {
  WORD = 'WORD',
  DEFINITION = 'DEFINITION'
}

export interface Stats {
  correct: number;
  incorrect: number;
}

export interface MemoryItem {
  id: string;
  type: ItemType;
  term: string; // The main word or the term being defined
  meanings: string[]; // For Word type: list of meanings
  description?: string; // For Definition type: the long description
  isActive: boolean;
  stats: Stats;
  createdAt: number;
}

export interface AppSettings {
  maxQuestionsPerSession: number;
}

export interface QuestionData {
  item: MemoryItem;
  questionText: string;
  correctAnswerText: string;
  distractors: string[]; // Wrong answers
}