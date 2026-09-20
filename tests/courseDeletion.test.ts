const store: Record<string, string> = {};
const mockLocalStorage = {
  getItem: (key: string) => store[key] ?? null,
  setItem: (key: string, value: string) => {
    store[key] = value;
  },
  removeItem: (key: string) => {
    delete store[key];
  },
  clear: () => {
    for (const key of Object.keys(store)) {
      delete store[key];
    }
  },
};
globalThis.localStorage = mockLocalStorage as unknown as Storage;

import { describe, it, expect, beforeEach } from 'bun:test';
import { CourseSet, QuizQuestion } from '../src/types';
import {
  loadSavedCourses,
  saveCourses,
  loadActiveCourseId,
  saveActiveCourseId,
  loadSavedErrors,
  saveErrors,
} from '../src/services/storageService';

describe('Course and Note Deletion Logic', () => {
  const mockCourses: CourseSet[] = [
    {
      id: 'course-1',
      title: '高等数学期末核心',
      rawNote: '极限与连续笔记内容',
      createdAt: 1700000000000,
      topics: [
        {
          id: 'topic-1',
          title: '极限与连续',
          summary: '第一重要极限',
          order: 1,
          flashcards: [
            {
              id: 'fc-1',
              topicId: 'topic-1',
              front: 'lim sin(x)/x',
              back: '1',
              mastery: 'learning',
            },
          ],
          quizzes: [
            {
              id: 'quiz-1',
              topicId: 'topic-1',
              type: 'single_choice',
              prompt: 'lim(x->0) sin(x)/x 的值是多少？',
              options: ['0', '1', '不存在', '无穷大'],
              correctAnswer: 1,
              explanation: '第一重要极限',
            },
          ],
        },
      ],
    },
    {
      id: 'course-2',
      title: '经典力学考点',
      rawNote: '牛顿第二定律笔记内容',
      createdAt: 1700000001000,
      topics: [
        {
          id: 'topic-2',
          title: '牛顿定律',
          summary: 'F = ma',
          order: 1,
          flashcards: [],
          quizzes: [
            {
              id: 'quiz-2',
              topicId: 'topic-2',
              type: 'single_choice',
              prompt: '牛顿第二定律公式是？',
              options: ['F=ma', 'E=mc^2', 'P=UI', 'v=gt'],
              correctAnswer: 0,
              explanation: 'F=ma',
            },
          ],
        },
      ],
    },
  ];

  beforeEach(() => {
    localStorage.clear();
  });

  it('deletes a course and persists updated list to storage', () => {
    saveCourses(mockCourses);
    expect(loadSavedCourses().length).toBe(2);

    const targetId = 'course-1';
    const updated = mockCourses.filter((c) => c.id !== targetId);
    saveCourses(updated);

    const loaded = loadSavedCourses();
    expect(loaded.length).toBe(1);
    expect(loaded[0].id).toBe('course-2');
    expect(loaded[0].title).toBe('经典力学考点');
  });

  it('switches active course to next available course when active course is deleted', () => {
    saveCourses(mockCourses);
    saveActiveCourseId('course-1');

    const targetId = 'course-1';
    const updated = mockCourses.filter((c) => c.id !== targetId);
    saveCourses(updated);

    const nextActiveId = updated[0]?.id || null;
    saveActiveCourseId(nextActiveId);

    expect(loadActiveCourseId()).toBe('course-2');
  });

  it('sets active course to null when the last remaining course is deleted', () => {
    const singleCourse = [mockCourses[0]];
    saveCourses(singleCourse);
    saveActiveCourseId('course-1');

    const targetId = 'course-1';
    const updated = singleCourse.filter((c) => c.id !== targetId);
    saveCourses(updated);

    const nextActiveId = updated[0]?.id || null;
    saveActiveCourseId(nextActiveId);

    expect(loadActiveCourseId()).toBeNull();
    expect(loadSavedCourses().length).toBe(0);
  });

  it('persists error questions and cleans up errors associated with deleted course', () => {
    const mockErrors: QuizQuestion[] = [
      {
        id: 'quiz-1',
        topicId: 'topic-1',
        type: 'single_choice',
        prompt: 'lim(x->0) sin(x)/x 的值是多少？',
        correctAnswer: 1,
        explanation: '第一重要极限',
      },
      {
        id: 'quiz-2',
        topicId: 'topic-2',
        type: 'single_choice',
        prompt: '牛顿第二定律公式是？',
        correctAnswer: 0,
        explanation: 'F=ma',
      },
    ];

    saveErrors(mockErrors);
    expect(loadSavedErrors().length).toBe(2);

    const courseToDelete = mockCourses[0];
    const topicIds = new Set(courseToDelete.topics.map((t) => t.id));
    const quizIds = new Set(courseToDelete.topics.flatMap((t) => t.quizzes.map((q) => q.id)));

    const cleanedErrors = loadSavedErrors().filter(
      (q) => !quizIds.has(q.id) && !(q.topicId && topicIds.has(q.topicId))
    );
    saveErrors(cleanedErrors);

    const reloaded = loadSavedErrors();
    expect(reloaded.length).toBe(1);
    expect(reloaded[0].id).toBe('quiz-2');
  });
});
