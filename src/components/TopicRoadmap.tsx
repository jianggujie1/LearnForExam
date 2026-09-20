import React from 'react';
import { TopicCluster } from '../types';
import { Layers, Sparkles, BookOpen, CheckCircle, Trash2 } from 'lucide-react';

interface TopicRoadmapProps {
  topics: TopicCluster[];
  activeTopicId: string | null;
  onSelectTopic: (topicId: string, mode: 'flashcards' | 'quiz') => void;
  onDeleteCourse?: () => void;
  courseTitle?: string;
  isSplitOpen?: boolean;
}

export const TopicRoadmap: React.FC<TopicRoadmapProps> = ({
  topics,
  onSelectTopic,
  onDeleteCourse,
  isSplitOpen = false,
}) => {
  if (topics.length === 0) {
    return (
      <div className="text-center py-16 text-slate-500">
        <p>暂无聚类考点，请先导入并生成复习资料。</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 roadmap-container">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
        <div className="min-w-0">
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <Layers className="w-5 h-5 text-indigo-400 shrink-0" />
            <span className="truncate">核心考点聚合与复习大纲</span>
          </h2>
          <p className="text-sm text-slate-400 mt-1 leading-relaxed">
            笔记已自动聚合为 {topics.length} 个考点模块，建议先过闪卡建立记忆，再通过客观题自测巩固。
          </p>
        </div>
        {onDeleteCourse && (
          <button
            type="button"
            onClick={onDeleteCourse}
            className="text-xs text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-slate-800 hover:border-rose-500/30 px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shrink-0 self-start sm:self-auto"
            title="删除此笔记专题"
          >
            <Trash2 className="w-3.5 h-3.5 shrink-0" />
            <span className="whitespace-nowrap">删除此笔记</span>
          </button>
        )}
      </div>

      <div className="roadmap-grid">
        {topics.map((topic, index) => {
          const masteredCards = topic.flashcards.filter((c) => c.mastery === 'mastered').length;
          const flashcardProgress = topic.flashcards.length > 0 
            ? Math.round((masteredCards / topic.flashcards.length) * 100) 
            : 0;

          return (
            <div
              key={topic.id}
              className={`bg-slate-900/80 border border-slate-800/80 hover:border-indigo-500/40 rounded-2xl flex flex-col justify-between transition-all group ${
                isSplitOpen ? 'p-5' : 'p-6'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
                  <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shrink-0">
                    模块 {index + 1}
                  </span>
                  <span className="text-xs text-slate-400 flex items-center gap-1 shrink-0 whitespace-nowrap">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>闪卡掌握度: {flashcardProgress}%</span>
                  </span>
                </div>

                <h3 className="text-lg font-bold text-slate-100 group-hover:text-indigo-300 transition-colors mb-2">
                  {topic.title}
                </h3>
                <p className="text-sm text-slate-400 line-clamp-2 mb-4 leading-relaxed">
                  {topic.summary}
                </p>
              </div>

              <div className="space-y-3 pt-4 border-t border-slate-800/60">
                {/* Stats */}
                <div className="flex items-center justify-between text-xs text-slate-400 gap-2">
                  <span className="whitespace-nowrap">闪卡: {topic.flashcards.length} 张</span>
                  <span className="whitespace-nowrap">客观题: {topic.quizzes.length} 题</span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => onSelectTopic(topic.id, 'flashcards')}
                    className="flex-1 min-w-[100px] py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <BookOpen className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    <span className="whitespace-nowrap">背闪卡 ({topic.flashcards.length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onSelectTopic(topic.id, 'quiz')}
                    className="flex-1 min-w-[100px] py-2.5 px-3 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    <span className="whitespace-nowrap">刷自测题 ({topic.quizzes.length})</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
