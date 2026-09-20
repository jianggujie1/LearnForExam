import React, { useState, useEffect } from 'react';
import { CourseSet, AISettings, QuizQuestion, Flashcard } from './types';
import { 
  loadSavedCourses, 
  saveCourses, 
  loadSettings, 
  saveSettings,
  loadActiveCourseId,
  saveActiveCourseId,
  loadSavedErrors,
  saveErrors,
  loadThemeMode,
  saveThemeMode,
  getSystemTheme,
  ThemeMode,
  ResolvedTheme,
  loadSidebarWidth,
  saveSidebarWidth,
  loadSidebarCollapsed,
  saveSidebarCollapsed,
  loadSplitNoteWidth,
  saveSplitNoteWidth,
  MIN_SIDEBAR_WIDTH,
  MAX_SIDEBAR_WIDTH,
  COLLAPSED_SIDEBAR_WIDTH,
  MIN_SPLIT_NOTE_WIDTH,
  MAX_SPLIT_NOTE_WIDTH,
} from './services/storageService';
import { generateCourseSetFromNote } from './services/aiService';
import { NoteIngestion } from './components/NoteIngestion';
import { TopicRoadmap } from './components/TopicRoadmap';
import { FlashcardReview } from './components/FlashcardReview';
import { QuizSession } from './components/QuizSession';
import { ErrorNotebook } from './components/ErrorNotebook';
import { SettingsModal } from './components/SettingsModal';
import { NoteSplitViewer } from './components/NoteSplitViewer';
import {
  findCourseAndTopicForQuestion,
  findCourseForQuote,
  computeQuoteInDocScore
} from './utils/courseMatcher';
import { DeleteConfirmModal } from './components/DeleteConfirmModal';
import { 
  GraduationCap, 
  Settings as SettingsIcon, 
  Layers, 
  AlertOctagon, 
  Sparkles, 
  ArrowRight,
  ArrowLeft,
  Trash2,
  BookOpen,
  Sun,
  Moon,
  Laptop,
  PanelLeftClose,
  PanelLeft
} from 'lucide-react';
import './App.css';

type MainView = 'ingest' | 'roadmap' | 'flashcards' | 'quiz' | 'errors';

export function App() {
  const [courses, setCourses] = useState<CourseSet[]>([]);
  const [activeCourseId, setActiveCourseId] = useState<string | null>(null);
  const [settings, setSettings] = useState<AISettings>(loadSettings());
  const [currentView, setCurrentView] = useState<MainView>('ingest');
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [errorQuestions, setErrorQuestions] = useState<QuizQuestion[]>(() => loadSavedErrors());
  
  // Split Screen Note viewer state
  const [isSplitNoteOpen, setIsSplitNoteOpen] = useState(false);
  const [highlightQuote, setHighlightQuote] = useState<string>('');
  const [courseToDelete, setCourseToDelete] = useState<CourseSet | null>(null);
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => loadThemeMode());
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(() => getSystemTheme());


  // Sidebar & Split Note layout dimensions & collapse state
  const [sidebarWidth, setSidebarWidth] = useState<number>(() => loadSidebarWidth());
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => loadSidebarCollapsed());
  const [splitNoteWidth, setSplitNoteWidth] = useState<number>(() => loadSplitNoteWidth());

  const handleToggleSidebarCollapse = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      saveSidebarCollapsed(next);
      return next;
    });
  };

  const handleSidebarResizePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const currentX = moveEvent.clientX;
      if (isSidebarCollapsed) {
        if (currentX > 110) {
          setIsSidebarCollapsed(false);
          saveSidebarCollapsed(false);
          const newW = Math.max(MIN_SIDEBAR_WIDTH, Math.min(MAX_SIDEBAR_WIDTH, currentX));
          setSidebarWidth(newW);
          saveSidebarWidth(newW);
        }
        return;
      }

      if (currentX < 140) {
        setIsSidebarCollapsed(true);
        saveSidebarCollapsed(true);
        return;
      }

      const maxAllowedWidth = Math.min(
        MAX_SIDEBAR_WIDTH,
        Math.max(MIN_SIDEBAR_WIDTH, window.innerWidth - (isSplitNoteOpen ? splitNoteWidth : 0) - 380)
      );
      const newWidth = Math.max(MIN_SIDEBAR_WIDTH, Math.min(maxAllowedWidth, currentX));
      setSidebarWidth(newWidth);
      saveSidebarWidth(newWidth);
    };

    const handlePointerUp = () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };
  // Real-time listener for OS system theme changes
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleMediaChange = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? 'dark' : 'light');
    };
    mediaQuery.addEventListener('change', handleMediaChange);
    return () => mediaQuery.removeEventListener('change', handleMediaChange);
  }, []);

  const resolvedTheme: ResolvedTheme = themeMode === 'system' ? systemTheme : themeMode;

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', resolvedTheme);
    if (resolvedTheme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
    }
    saveThemeMode(themeMode);
  }, [resolvedTheme, themeMode]);
  // Load initialized state
  useEffect(() => {
    const saved = loadSavedCourses();
    setCourses(saved);
    const savedErrors = loadSavedErrors();
    let hasRepaired = false;
    const repairedErrors = savedErrors.map((err) => {
      const { course, topic } = findCourseAndTopicForQuestion(err, saved);
      if (course && (err.courseId !== course.id || !err.courseId)) {
        hasRepaired = true;
        return {
          ...err,
          courseId: course.id,
          topicId: topic?.id || err.topicId,
        };
      }
      return err;
    });
    if (hasRepaired) {
      saveErrors(repairedErrors);
    }
    setErrorQuestions(repairedErrors);
    const lastActive = loadActiveCourseId();
    if (lastActive && saved.some((c) => c.id === lastActive)) {
      setActiveCourseId(lastActive);
      setCurrentView('roadmap');
    } else if (saved.length > 0) {
      setActiveCourseId(saved[0].id);
      setCurrentView('roadmap');
    }
  }, []);

  const activeCourse = courses.find((c) => c.id === activeCourseId) || null;

  // Handle AI Generation
  const handleGenerate = async (title: string, noteText: string, onStreamChunk?: (chunk: string) => void) => {
    setIsLoading(true);
    try {
      const newCourse = await generateCourseSetFromNote(noteText, title, settings, onStreamChunk);
      const updated = [newCourse, ...courses];
      setCourses(updated);
      saveCourses(updated);
      setActiveCourseId(newCourse.id);
      saveActiveCourseId(newCourse.id);
      setCurrentView('roadmap');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '请检查网络或 API Key';
      alert(`生成失败: ${message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectTopic = (topicId: string, mode: 'flashcards' | 'quiz') => {
    setSelectedTopicId(topicId);
    setCurrentView(mode);
  };

  const handleLocateQuote = (quote: string, topicId?: string, courseId?: string) => {
    let targetCourse: CourseSet | undefined;
    if (courseId) {
      targetCourse = courses.find((c) => c.id === courseId);
      if (targetCourse && quote && quote.trim()) {
        const clean = quote.trim();
        const score = computeQuoteInDocScore(targetCourse.rawNote, clean);
        if (score < 0.25) {
          const betterCourse = findCourseForQuote(clean, courses, courseId);
          if (betterCourse) {
            targetCourse = betterCourse;
          }
        }
      }
    }

    if (!targetCourse && quote) {
      targetCourse = findCourseForQuote(quote, courses, activeCourseId);
    }

    if (!targetCourse && topicId) {
      targetCourse = courses.find((c) => c.topics.some((t) => t.id === topicId));
    }

    if (!targetCourse) {
      targetCourse = activeCourse || courses[0];
    }

    if (targetCourse && targetCourse.id !== activeCourseId) {
      setActiveCourseId(targetCourse.id);
      saveActiveCourseId(targetCourse.id);
    }

    setHighlightQuote(quote);
    setIsSplitNoteOpen(true);
  };

  const handleUpdateCardMastery = (cardId: string, mastery: Flashcard['mastery']) => {
    if (!activeCourse) return;
    const updated = courses.map((c) => {
      if (c.id !== activeCourse.id) return c;
      return {
        ...c,
        topics: c.topics.map((t) => ({
          ...t,
          flashcards: t.flashcards.map((f) => f.id === cardId ? { ...f, mastery } : f),
        })),
      };
    });
    setCourses(updated);
    saveCourses(updated);
  };

  const handleRecordAnswer = (
    questionOrId: QuizQuestion | string,
    answer: string | number,
    isCorrect: boolean
  ) => {
    if (isCorrect) return;

    let targetQuestion: QuizQuestion | undefined;
    let targetCourseId = activeCourse?.id;
    let targetTopicId = currentTopic?.id;

    if (typeof questionOrId === 'object' && questionOrId !== null) {
      targetQuestion = questionOrId;
      if (questionOrId.courseId) {
        targetCourseId = questionOrId.courseId;
      }
      if (questionOrId.topicId) {
        targetTopicId = questionOrId.topicId;
      }
    } else {
      const qId = questionOrId;
      if (activeCourse) {
        for (const topic of activeCourse.topics) {
          const found = topic.quizzes.find((item) => item.id === qId);
          if (found) {
            targetQuestion = found;
            targetCourseId = activeCourse.id;
            targetTopicId = topic.id;
            break;
          }
        }
      }
      if (!targetQuestion) {
        for (const course of courses) {
          for (const topic of course.topics) {
            const found = topic.quizzes.find((item) => item.id === qId);
            if (found) {
              targetQuestion = found;
              targetCourseId = course.id;
              targetTopicId = topic.id;
              break;
            }
          }
          if (targetQuestion) break;
        }
      }
    }

    if (!targetQuestion) return;

    const resolvedCourseId = targetCourseId || activeCourse?.id;
    const resolvedTopicId = targetTopicId || targetQuestion.topicId;

    setErrorQuestions((prev) => {
      if (
        prev.some(
          (e) =>
            (e.courseId === resolvedCourseId && e.id === targetQuestion!.id) ||
            (resolvedCourseId && e.courseId === resolvedCourseId && e.prompt === targetQuestion!.prompt) ||
            (e.prompt.trim() === targetQuestion!.prompt.trim())
        )
      ) {
        return prev;
      }
      const updatedQuestion: QuizQuestion = {
        ...targetQuestion!,
        courseId: resolvedCourseId,
        topicId: resolvedTopicId,
        userAnswer: answer,
        isCorrect: false,
      };
      const updated = [updatedQuestion, ...prev];
      saveErrors(updated);
      return updated;
    });
  };

  const handleClearError = (questionId: string) => {
    setErrorQuestions((prev) => {
      const updated = prev.filter((q) => q.id !== questionId);
      saveErrors(updated);
      return updated;
    });
  };

  const handleRequestDeleteCourse = (course: CourseSet, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setCourseToDelete(course);
  };

  const handleConfirmDelete = () => {
    if (!courseToDelete) return;
    const targetId = courseToDelete.id;
    const updated = courses.filter((c) => c.id !== targetId);
    setCourses(updated);
    saveCourses(updated);

    // Clean up associated error questions accurately without false-matching other courses
    setErrorQuestions((prev) => {
      const cleaned = prev.filter((q) => {
        if (q.courseId) {
          return q.courseId !== targetId;
        }
        const { course } = findCourseAndTopicForQuestion(q, courses);
        return course?.id !== targetId;
      });
      saveErrors(cleaned);
      return cleaned;
    });

    if (activeCourseId === targetId) {
      const next = updated[0]?.id || null;
      setActiveCourseId(next);
      saveActiveCourseId(next);
      if (!next) {
        setCurrentView('ingest');
        setIsSplitNoteOpen(false);
      }
    }
    setCourseToDelete(null);
  };

  const currentTopic = activeCourse?.topics.find((t) => t.id === selectedTopicId) || activeCourse?.topics[0];

  return (
    <div className="flex h-screen w-screen bg-slate-950 text-slate-100 overflow-hidden select-none font-sans">
      {/* macOS Sidebar */}
      {/* macOS Sidebar */}
      <aside
        style={{ width: isSidebarCollapsed ? `${COLLAPSED_SIDEBAR_WIDTH}px` : `${sidebarWidth}px` }}
        className={`border-r border-slate-800/80 bg-slate-900/40 backdrop-blur-2xl flex flex-col justify-between shrink-0 relative z-20 transition-[width] duration-150 ${
          isSidebarCollapsed ? 'p-2 items-center' : 'p-4'
        }`}
      >
        {/* Sidebar Resizer Handle */}
        <div
          onPointerDown={handleSidebarResizePointerDown}
          className="absolute right-0 top-0 bottom-0 w-2 translate-x-1/2 cursor-col-resize z-40 group flex items-center justify-center select-none"
          title="拖动调整侧边栏宽度"
        >
          <div className="w-1 h-full group-hover:bg-indigo-500/80 group-active:bg-indigo-500 transition-colors" />
        </div>

        <div>
          {/* App Header */}
          {isSidebarCollapsed ? (
            <div className="flex flex-col items-center gap-2 py-2 mb-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                <GraduationCap className="w-5 h-5 text-white" />
              </div>
              <button
                type="button"
                onClick={handleToggleSidebarCollapse}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-colors"
                title="展开侧边栏"
                aria-label="展开侧边栏"
              >
                <PanelLeft className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between px-2 py-3 mb-4">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/30 shrink-0">
                  <GraduationCap className="w-5 h-5 text-white" />
                </div>
                <div className="min-w-0">
                  <h1 className="font-black text-sm tracking-tight text-white leading-none truncate">LearnForExam</h1>
                  <span className="text-[10px] text-indigo-400 font-semibold tracking-wider uppercase">期末速通</span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleToggleSidebarCollapse}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-colors shrink-0"
                title="收起侧边栏"
                aria-label="收起侧边栏"
              >
                <PanelLeftClose className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Action: New Course / Note Ingestion Entry */}
          {isSidebarCollapsed ? (
            <button
              type="button"
              onClick={() => setCurrentView('ingest')}
              title="新建复习科目：录入笔记，由 AI 智能生成复习大纲"
              aria-label="新建复习科目"
              className={`w-10 h-10 mb-4 rounded-xl flex items-center justify-center border transition-all duration-200 cursor-pointer group relative overflow-hidden ${
                currentView === 'ingest'
                  ? 'bg-gradient-to-tr from-indigo-600 to-violet-600 text-white border-indigo-400 shadow-md shadow-indigo-500/40'
                  : 'bg-slate-900/80 hover:bg-slate-800 border-slate-800 text-indigo-400 hover:text-white'
              }`}
            >
              <Sparkles className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setCurrentView('ingest')}
              title="新建复习科目：录入笔记，由 AI 智能生成复习大纲"
              aria-label="新建复习科目"
              className={`w-full mb-4 p-2.5 rounded-2xl border text-left transition-all duration-200 cursor-pointer group relative overflow-hidden ${
                currentView === 'ingest'
                  ? 'bg-gradient-to-br from-indigo-950/70 via-indigo-900/40 to-slate-900/80 border-indigo-500/60 shadow-lg shadow-indigo-950/60 ring-1 ring-indigo-500/40'
                  : 'bg-slate-900/60 hover:bg-slate-800/60 border-slate-800/90 hover:border-indigo-500/40 hover:shadow-md hover:shadow-indigo-500/10'
              }`}
            >
              <div
                className={`absolute -right-4 -bottom-4 w-20 h-20 rounded-full blur-xl pointer-events-none transition-opacity duration-300 ${
                  currentView === 'ingest' ? 'bg-indigo-600/20 opacity-100' : 'bg-indigo-500/10 opacity-0 group-hover:opacity-100'
                }`}
              />
              <div className="flex items-center gap-2.5 relative z-10">
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-all duration-200 ${
                    currentView === 'ingest'
                      ? 'bg-gradient-to-tr from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-500/40'
                      : 'bg-indigo-500/15 text-indigo-400 group-hover:bg-gradient-to-tr group-hover:from-indigo-600 group-hover:to-violet-600 group-hover:text-white group-hover:shadow-md group-hover:shadow-indigo-500/30'
                  }`}
                >
                  <Sparkles className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-bold leading-tight tracking-tight ${
                        currentView === 'ingest' ? 'text-white' : 'text-slate-200 group-hover:text-white'
                      }`}
                    >
                      新建复习科目
                    </span>
                    <ArrowRight
                      className={`w-3.5 h-3.5 transition-all ${
                        currentView === 'ingest'
                          ? 'text-indigo-400'
                          : 'text-slate-500 group-hover:text-indigo-400 group-hover:translate-x-0.5'
                      }`}
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 group-hover:text-slate-300 truncate mt-0.5">
                    录入笔记 · AI 生成大纲
                  </p>
                </div>
              </div>
            </button>
          )}

          {/* Navigation Links */}
          {isSidebarCollapsed ? (
            <div className="space-y-2 mb-4 flex flex-col items-center">
              <button
                type="button"
                disabled={!activeCourse}
                onClick={() => setCurrentView('roadmap')}
                title="复习大纲"
                aria-label="复习大纲"
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                  currentView === 'roadmap'
                    ? 'bg-indigo-500/20 text-indigo-300 font-semibold'
                    : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 disabled:opacity-40'
                }`}
              >
                <Layers className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setCurrentView('errors')}
                title={`错题集${errorQuestions.length > 0 ? ` (${errorQuestions.length})` : ''}`}
                aria-label="错题集"
                className={`w-10 h-10 rounded-xl flex items-center justify-center relative transition-colors ${
                  currentView === 'errors'
                    ? 'bg-rose-500/20 text-rose-300 font-semibold'
                    : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                }`}
              >
                <AlertOctagon className="w-4 h-4 text-rose-400" />
                {errorQuestions.length > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full text-[9px] font-bold bg-rose-500 text-white flex items-center justify-center shadow">
                    {errorQuestions.length}
                  </span>
                )}
              </button>
            </div>
          ) : (
            <div className="space-y-1 mb-6">
              <button
                type="button"
                disabled={!activeCourse}
                onClick={() => setCurrentView('roadmap')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                  currentView === 'roadmap'
                    ? 'bg-indigo-500/15 text-indigo-300 font-semibold'
                    : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 disabled:opacity-40'
                }`}
              >
                <Layers className="w-4 h-4" />
                复习大纲
              </button>
              <button
                type="button"
                onClick={() => setCurrentView('errors')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                  currentView === 'errors'
                    ? 'bg-rose-500/15 text-rose-300 font-semibold'
                    : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <AlertOctagon className="w-4 h-4 text-rose-400" />
                  错题集
                </div>
                {errorQuestions.length > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300">
                    {errorQuestions.length}
                  </span>
                )}
              </button>
            </div>
          )}

          {/* Course History List */}
          {isSidebarCollapsed ? (
            <div className="space-y-1.5 max-h-48 overflow-y-auto flex flex-col items-center py-1">
              {courses.map((course) => {
                const initial = course.title.trim().slice(0, 1) || '科';
                return (
                  <button
                    key={course.id}
                    type="button"
                    onClick={() => {
                      setActiveCourseId(course.id);
                      saveActiveCourseId(course.id);
                      setCurrentView('roadmap');
                    }}
                    title={`切换科目：${course.title}`}
                    aria-label={`切换科目：${course.title}`}
                    className={`course-nav-item w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold transition-all border ${
                      activeCourseId === course.id
                        ? 'active bg-indigo-600 text-white shadow-md border-indigo-500'
                        : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white border-slate-700/60'
                    }`}
                  >
                    {initial}
                  </button>
                );
              })}
            </div>
          ) : (
            <>
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider px-2 mb-2">
                已整理的复习科目
              </div>
              <div className="space-y-1 max-h-56 overflow-y-auto pr-1">
                {courses.length === 0 ? (
                  <div className="text-xs text-slate-600 px-2 py-1">暂无科目</div>
                ) : (
                  courses.map((course) => (
                    <div
                      key={course.id}
                      onClick={() => {
                        setActiveCourseId(course.id);
                        saveActiveCourseId(course.id);
                        setCurrentView('roadmap');
                      }}
                      className={`course-nav-row group flex items-center justify-between px-3 py-2 rounded-xl text-xs cursor-pointer transition-all ${
                        activeCourseId === course.id
                          ? 'active bg-slate-800 text-slate-100 font-medium'
                          : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                      }`}
                    >
                      <span className="truncate">{course.title}</span>
                      <button
                        type="button"
                        onClick={(e) => handleRequestDeleteCourse(course, e)}
                        className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 p-1.5 rounded-lg transition-all"
                        title={`删除「${course.title}」`}
                        aria-label={`删除「${course.title}」`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>

        {/* Bottom Settings & Split Toggle */}
        {isSidebarCollapsed ? (
          <div className="pt-3 border-t border-slate-800/80 flex flex-col items-center space-y-2">
            {activeCourse && (
              <button
                type="button"
                onClick={() => setIsSplitNoteOpen(!isSplitNoteOpen)}
                title={isSplitNoteOpen ? '收起原笔记分栏' : '打开原笔记分栏对照'}
                aria-label="切换原笔记分栏"
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                  isSplitNoteOpen
                    ? 'bg-indigo-500/20 text-indigo-300 font-semibold'
                    : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                }`}
              >
                <BookOpen className="w-4 h-4 text-indigo-400" />
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                const nextMode: ThemeMode =
                  themeMode === 'system' ? 'light' : themeMode === 'light' ? 'dark' : 'system';
                setThemeMode(nextMode);
                saveThemeMode(nextMode);
              }}
              title={`当前外观：${
                themeMode === 'system'
                  ? `系统 (${systemTheme === 'dark' ? '深色' : '浅色'})`
                  : themeMode === 'light'
                  ? '浅色'
                  : '深色'
              }（点击循环切换）`}
              aria-label="切换外观主题"
              className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 transition-colors"
            >
              {themeMode === 'system' ? (
                <Laptop className="w-4 h-4" />
              ) : themeMode === 'light' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-indigo-400" />
              )}
            </button>
            <button
              type="button"
              onClick={() => setIsSettingsOpen(true)}
              title="AI 模型与 Key 设置"
              aria-label="AI 模型与 Key 设置"
              className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 transition-colors cursor-pointer"
            >
              <SettingsIcon className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="pt-3 border-t border-slate-800/80 space-y-1">
            {activeCourse && (
              <button
                type="button"
                onClick={() => setIsSplitNoteOpen(!isSplitNoteOpen)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs transition-colors ${
                  isSplitNoteOpen
                    ? 'bg-indigo-500/20 text-indigo-300 font-semibold'
                    : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                }`}
              >
                <BookOpen className="w-4 h-4 text-indigo-400" />
                {isSplitNoteOpen ? '收起原笔记分栏' : '打开原笔记分栏对照'}
              </button>
            )}

            {/* Theme Mode 3-Way Segmented Switcher */}
            <div className="pt-1">
              <div className="bg-slate-900/90 border border-slate-800/90 rounded-xl p-0.5 flex items-center gap-0.5 text-[11px]">
                <button
                  type="button"
                  onClick={() => setThemeMode('system')}
                  className={`flex-1 py-1.5 px-1 rounded-lg flex items-center justify-center gap-1 font-medium transition-all cursor-pointer ${
                    themeMode === 'system'
                      ? 'bg-indigo-600 text-white shadow-sm font-semibold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                  }`}
                  title={`跟随系统外观 (当前系统为${systemTheme === 'dark' ? '深色' : '浅色'})`}
                  aria-label="跟随系统外观"
                >
                  <Laptop className="w-3.5 h-3.5 shrink-0" />
                  <span className="whitespace-nowrap">系统</span>
                </button>
                <button
                  type="button"
                  onClick={() => setThemeMode('light')}
                  className={`flex-1 py-1.5 px-1 rounded-lg flex items-center justify-center gap-1 font-medium transition-all cursor-pointer ${
                    themeMode === 'light'
                      ? 'bg-indigo-600 text-white shadow-sm font-semibold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                  }`}
                  title="始终浅色模式"
                  aria-label="始终浅色模式"
                >
                  <Sun className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                  <span className="whitespace-nowrap">浅色</span>
                </button>
                <button
                  type="button"
                  onClick={() => setThemeMode('dark')}
                  className={`flex-1 py-1.5 px-1 rounded-lg flex items-center justify-center gap-1 font-medium transition-all cursor-pointer ${
                    themeMode === 'dark'
                      ? 'bg-indigo-600 text-white shadow-sm font-semibold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                  }`}
                  title="始终深色模式"
                  aria-label="始终深色模式"
                >
                  <Moon className="w-3.5 h-3.5 shrink-0 text-indigo-400" />
                  <span className="whitespace-nowrap">深色</span>
                </button>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsSettingsOpen(true)}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 transition-colors cursor-pointer"
            >
              <SettingsIcon className="w-4 h-4" />
              AI 模型与 Key 设置
            </button>
          </div>
        )}
      </aside>

      {/* Main Content Workspace */}
      <main
        className={`flex-1 flex flex-col h-full overflow-y-auto overflow-x-hidden bg-slate-950 relative min-w-0 transition-all duration-200 ${
          isSplitNoteOpen ? 'p-4 md:p-6' : 'p-6 md:p-10'
        }`}
      >
        {/* Top return back header when reviewing cards or quiz */}
        {(currentView === 'flashcards' || currentView === 'quiz') && (
          <div className="mb-6 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setCurrentView('roadmap')}
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-slate-200 py-1.5 px-3 rounded-lg hover:bg-slate-900 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" /> 返回复习大纲
            </button>
            <span className="text-xs text-indigo-400 font-semibold">
              当前主题: {currentTopic?.title}
            </span>
          </div>
        )}

        {/* View Router */}
        {currentView === 'ingest' && (
          <NoteIngestion onGenerate={handleGenerate} isLoading={isLoading} />
        )}

        {currentView === 'roadmap' && activeCourse && (
          <TopicRoadmap
            topics={activeCourse.topics}
            activeTopicId={selectedTopicId}
            onSelectTopic={handleSelectTopic}
            onDeleteCourse={() => handleRequestDeleteCourse(activeCourse)}
            courseTitle={activeCourse.title}
            isSplitOpen={isSplitNoteOpen}
          />
        )}
        {currentView === 'flashcards' && currentTopic && (
          <FlashcardReview
            cards={currentTopic.flashcards}
            onUpdateCardMastery={handleUpdateCardMastery}
            onLocateQuote={(quote, topicId, courseId) => handleLocateQuote(quote, topicId, courseId || activeCourse?.id)}
            onFinish={() => setCurrentView('roadmap')}
          />
        )}

        {currentView === 'quiz' && currentTopic && (
          <QuizSession
            questions={currentTopic.quizzes}
            onRecordAnswer={handleRecordAnswer}
            onLocateQuote={(quote, topicId, courseId) => handleLocateQuote(quote, topicId, courseId || activeCourse?.id)}
            onFinish={() => setCurrentView('roadmap')}
          />
        )}

        {currentView === 'errors' && (
          <ErrorNotebook
            errors={errorQuestions}
            courses={courses}
            onClearError={handleClearError}
            onLocateQuote={handleLocateQuote}
          />
        )}
      </main>

      {/* Right Side: Split-screen Note Viewer */}
      {activeCourse && (
        <NoteSplitViewer
          key={activeCourse.id}
          rawNote={activeCourse.rawNote}
          courseTitle={activeCourse.title}
          highlightQuote={highlightQuote}
          isOpen={isSplitNoteOpen}
          onToggle={() => setIsSplitNoteOpen(!isSplitNoteOpen)}
          onDelete={() => handleRequestDeleteCourse(activeCourse)}
          width={splitNoteWidth}
          onWidthChange={(w) => {
            const currentSidebarW = isSidebarCollapsed ? COLLAPSED_SIDEBAR_WIDTH : sidebarWidth;
            const maxAllowedSplit = Math.min(
              MAX_SPLIT_NOTE_WIDTH,
              Math.max(MIN_SPLIT_NOTE_WIDTH, window.innerWidth - currentSidebarW - 380)
            );
            const clampedW = Math.max(MIN_SPLIT_NOTE_WIDTH, Math.min(maxAllowedSplit, w));
            setSplitNoteWidth(clampedW);
            saveSplitNoteWidth(clampedW);
          }}
          minWidth={MIN_SPLIT_NOTE_WIDTH}
          maxWidth={Math.min(
            MAX_SPLIT_NOTE_WIDTH,
            Math.max(MIN_SPLIT_NOTE_WIDTH, window.innerWidth - (isSidebarCollapsed ? COLLAPSED_SIDEBAR_WIDTH : sidebarWidth) - 380)
          )}
        />
      )}

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSave={(newSettings) => {
          setSettings(newSettings);
          saveSettings(newSettings);
        }}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={Boolean(courseToDelete)}
        courseTitle={courseToDelete?.title || ''}
        onClose={() => setCourseToDelete(null)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}

export default App;
