import React, { useState, useEffect } from 'react';
import { CourseSet, AISettings, QuizQuestion, Flashcard } from './types';
import { 
  loadSavedCourses, 
  saveCourses, 
  loadSettings, 
  saveSettings,
  loadActiveCourseId,
  saveActiveCourseId
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
  GraduationCap, 
  Settings as SettingsIcon, 
  Layers, 
  AlertOctagon, 
  PlusCircle, 
  ArrowLeft,
  Trash2,
  BookOpen
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
  const [errorQuestions, setErrorQuestions] = useState<QuizQuestion[]>([]);
  
  // Split Screen Note viewer state
  const [isSplitNoteOpen, setIsSplitNoteOpen] = useState(false);
  const [highlightQuote, setHighlightQuote] = useState<string>('');

  // Load initialized state
  useEffect(() => {
    const saved = loadSavedCourses();
    setCourses(saved);
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

  const handleLocateQuote = (quote: string) => {
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

  const handleRecordAnswer = (questionId: string, _answer: string | number, isCorrect: boolean) => {
    if (!isCorrect && activeCourse) {
      for (const topic of activeCourse.topics) {
        const q = topic.quizzes.find((item) => item.id === questionId);
        if (q && !errorQuestions.some((e) => e.id === questionId)) {
          setErrorQuestions((prev) => [q, ...prev]);
        }
      }
    }
  };

  const handleClearError = (questionId: string) => {
    setErrorQuestions((prev) => prev.filter((q) => q.id !== questionId));
  };

  const handleDeleteCourse = (courseId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('确定要删除此复习专题吗？')) {
      const updated = courses.filter((c) => c.id !== courseId);
      setCourses(updated);
      saveCourses(updated);
      if (activeCourseId === courseId) {
        const next = updated[0]?.id || null;
        setActiveCourseId(next);
        saveActiveCourseId(next);
        if (!next) setCurrentView('ingest');
      }
    }
  };

  const currentTopic = activeCourse?.topics.find((t) => t.id === selectedTopicId) || activeCourse?.topics[0];

  return (
    <div className="flex h-screen w-screen bg-slate-950 text-slate-100 overflow-hidden select-none font-sans">
      {/* macOS Sidebar */}
      <aside className="w-64 border-r border-slate-800/80 bg-slate-900/40 backdrop-blur-2xl flex flex-col justify-between p-4 shrink-0">
        <div>
          {/* App Header */}
          <div className="flex items-center gap-2.5 px-2 py-3 mb-4">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-black text-sm tracking-tight text-white leading-none">LearnForExam</h1>
              <span className="text-[10px] text-indigo-400 font-semibold tracking-wider uppercase">期末速通</span>
            </div>
          </div>

          {/* Action: New Note */}
          <button
            type="button"
            onClick={() => {
              setCurrentView('ingest');
            }}
            className="w-full mb-4 py-2.5 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20 transition-all cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" /> 导入新笔记
          </button>

          {/* Navigation Links */}
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
              考点通关地图
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
                考前错题本
              </div>
              {errorQuestions.length > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300">
                  {errorQuestions.length}
                </span>
              )}
            </button>
          </div>

          {/* Course History List */}
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
                  className={`group flex items-center justify-between px-3 py-2 rounded-xl text-xs cursor-pointer transition-all ${
                    activeCourseId === course.id
                      ? 'bg-slate-800 text-slate-100 font-medium'
                      : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                  }`}
                >
                  <span className="truncate">{course.title}</span>
                  <button
                    type="button"
                    onClick={(e) => handleDeleteCourse(course.id, e)}
                    className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-rose-400 p-1 rounded transition-opacity"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Bottom Settings & Split Toggle */}
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

          <button
            type="button"
            onClick={() => setIsSettingsOpen(true)}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 transition-colors"
          >
            <SettingsIcon className="w-4 h-4" />
            AI 模型与 Key 设置
          </button>
        </div>
      </aside>

      {/* Main Content Workspace */}
      <main className="flex-1 flex flex-col h-full overflow-y-auto bg-slate-950 p-6 md:p-10 relative">
        {/* Top return back header when reviewing cards or quiz */}
        {(currentView === 'flashcards' || currentView === 'quiz') && (
          <div className="mb-6 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setCurrentView('roadmap')}
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-slate-200 py-1.5 px-3 rounded-lg hover:bg-slate-900 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" /> 返回考点地图
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
          />
        )}

        {currentView === 'flashcards' && currentTopic && (
          <FlashcardReview
            cards={currentTopic.flashcards}
            onUpdateCardMastery={handleUpdateCardMastery}
            onLocateQuote={handleLocateQuote}
            onFinish={() => setCurrentView('roadmap')}
          />
        )}

        {currentView === 'quiz' && currentTopic && (
          <QuizSession
            questions={currentTopic.quizzes}
            onRecordAnswer={handleRecordAnswer}
            onLocateQuote={handleLocateQuote}
            onFinish={() => setCurrentView('roadmap')}
          />
        )}

        {currentView === 'errors' && (
          <ErrorNotebook
            errors={errorQuestions}
            onClearError={handleClearError}
          />
        )}
      </main>

      {/* Right Side: Split-screen Note Viewer */}
      {activeCourse && (
        <NoteSplitViewer
          rawNote={activeCourse.rawNote}
          highlightQuote={highlightQuote}
          isOpen={isSplitNoteOpen}
          onToggle={() => setIsSplitNoteOpen(!isSplitNoteOpen)}
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
    </div>
  );
}

export default App;
