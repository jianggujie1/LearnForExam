import { CourseSet, AISettings, QuizQuestion } from '../types';
import { DEFAULT_AI_SETTINGS } from '../services/aiService';

const STORAGE_KEY_COURSES = 'learn_for_exam_courses';
const STORAGE_KEY_SETTINGS = 'learn_for_exam_settings';
const STORAGE_KEY_ACTIVE_COURSE = 'learn_for_exam_active_id';
const STORAGE_KEY_ERRORS = 'learn_for_exam_errors';

export function loadSavedCourses(): CourseSet[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_COURSES);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Failed to load courses', e);
    return [];
  }
}

export function saveCourses(courses: CourseSet[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_COURSES, JSON.stringify(courses));
  } catch (e) {
    console.error('Failed to save courses', e);
  }
}

export function loadSettings(): AISettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SETTINGS);
    return raw ? { ...DEFAULT_AI_SETTINGS, ...JSON.parse(raw) } : DEFAULT_AI_SETTINGS;
  } catch (e) {
    return DEFAULT_AI_SETTINGS;
  }
}

export function saveSettings(settings: AISettings): void {
  localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
}

export function loadActiveCourseId(): string | null {
  return localStorage.getItem(STORAGE_KEY_ACTIVE_COURSE);
}

export function saveActiveCourseId(id: string | null): void {
  if (id) {
    localStorage.setItem(STORAGE_KEY_ACTIVE_COURSE, id);
  } else {
    localStorage.removeItem(STORAGE_KEY_ACTIVE_COURSE);
  }
}

export function loadSavedErrors(): QuizQuestion[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ERRORS);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Failed to load error questions', e);
    return [];
  }
}

export function saveErrors(errors: QuizQuestion[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_ERRORS, JSON.stringify(errors));
  } catch (e) {
    console.error('Failed to save error questions', e);
  }
}

const STORAGE_KEY_THEME_MODE = 'learn_for_exam_theme_mode';

export type ThemeMode = 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';

export function getSystemTheme(): ResolvedTheme {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'dark';
}

export function loadThemeMode(): ThemeMode {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_THEME_MODE) || localStorage.getItem('learn_for_exam_theme');
    if (saved === 'system' || saved === 'light' || saved === 'dark') {
      return saved;
    }
  } catch (e) {
    // fallback
  }
  return 'system';
}

export function saveThemeMode(mode: ThemeMode): void {
  try {
    localStorage.setItem(STORAGE_KEY_THEME_MODE, mode);
  } catch (e) {
    console.error('Failed to save theme mode', e);
  }
}

const STORAGE_KEY_SIDEBAR_WIDTH = 'learn_for_exam_sidebar_width';
const STORAGE_KEY_SIDEBAR_COLLAPSED = 'learn_for_exam_sidebar_collapsed';
const STORAGE_KEY_SPLIT_NOTE_WIDTH = 'learn_for_exam_split_note_width';

export const DEFAULT_SIDEBAR_WIDTH = 256;
export const MIN_SIDEBAR_WIDTH = 200;
export const MAX_SIDEBAR_WIDTH = 380;
export const COLLAPSED_SIDEBAR_WIDTH = 68;

export const DEFAULT_SPLIT_NOTE_WIDTH = 380;
export const MIN_SPLIT_NOTE_WIDTH = 300;
export const MAX_SPLIT_NOTE_WIDTH = 600;

export function loadSidebarWidth(): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SIDEBAR_WIDTH);
    if (raw) {
      const parsed = parseInt(raw, 10);
      if (!isNaN(parsed) && parsed >= MIN_SIDEBAR_WIDTH && parsed <= MAX_SIDEBAR_WIDTH) {
        return parsed;
      }
    }
  } catch (e) {
    // fallback to default
  }
  return DEFAULT_SIDEBAR_WIDTH;
}

export function saveSidebarWidth(width: number): void {
  try {
    localStorage.setItem(STORAGE_KEY_SIDEBAR_WIDTH, String(Math.round(width)));
  } catch (e) {
    console.error('Failed to save sidebar width', e);
  }
}

export function loadSidebarCollapsed(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SIDEBAR_COLLAPSED);
    return raw === 'true';
  } catch (e) {
    return false;
  }
}

export function saveSidebarCollapsed(collapsed: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY_SIDEBAR_COLLAPSED, String(collapsed));
  } catch (e) {
    console.error('Failed to save sidebar collapsed state', e);
  }
}

export function loadSplitNoteWidth(): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SPLIT_NOTE_WIDTH);
    if (raw) {
      const parsed = parseInt(raw, 10);
      if (!isNaN(parsed) && parsed >= MIN_SPLIT_NOTE_WIDTH && parsed <= MAX_SPLIT_NOTE_WIDTH) {
        return parsed;
      }
    }
  } catch (e) {
    // fallback
  }
  return DEFAULT_SPLIT_NOTE_WIDTH;
}

export function saveSplitNoteWidth(width: number): void {
  try {
    localStorage.setItem(STORAGE_KEY_SPLIT_NOTE_WIDTH, String(Math.round(width)));
  } catch (e) {
    console.error('Failed to save split note width', e);
  }
}
