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
