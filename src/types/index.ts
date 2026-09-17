export interface NoteSource {
  id: string;
  title: string;
  rawText: string;
  createdAt: number;
}

export interface Flashcard {
  id: string;
  topicId: string;
  front: string; // Question or Concept (supports LaTeX $...$)
  back: string;  // Answer, explanation or formula
  quoteSource?: string; // Verbatim snippet from note
  mastery: 'unseen' | 'learning' | 'mastered';
}

export type QuestionType = 'single_choice' | 'cloze';

export interface QuizQuestion {
  id: string;
  topicId: string;
  type: QuestionType;
  prompt: string; // Question body
  options?: string[]; // 4 options for single_choice
  correctAnswer: string | number; // index for choice, or target word for cloze
  clozeTemplate?: string; // e.g. "The formula for force is {blank}."
  explanation: string;
  quoteSource?: string;
  userAnswer?: string | number;
  isCorrect?: boolean;
}

export interface TopicCluster {
  id: string;
  title: string;
  summary: string;
  order: number;
  flashcards: Flashcard[];
  quizzes: QuizQuestion[];
}

export interface CourseSet {
  id: string;
  title: string;
  rawNote: string;
  createdAt: number;
  topics: TopicCluster[];
}

export interface AISettings {
  provider: 'deepseek' | 'openai' | 'custom';
  apiKey: string;
  baseUrl: string;
  model: string;
}
