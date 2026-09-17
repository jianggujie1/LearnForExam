import React from 'react';
import { TopicCluster } from '../types';
import { Layers, Sparkles, BookOpen, CheckCircle } from 'lucide-react';

interface TopicRoadmapProps {
  topics: TopicCluster[];
  activeTopicId: string | null;
  onSelectTopic: (topicId: string, mode: 'flashcards' | 'quiz') => void;
}

export const TopicRoadmap: React.FC<TopicRoadmapProps> = ({
  topics,
  onSelectTopic,
}) => {
  if (topics.length === 0) {
    return (
      <div className="text-center py-16 text-slate-500">
        <p>暂无聚类考点，请先导入并生成复习资料。</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-400" />
            核心考点聚合与通关地图
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            笔记已自动聚合为 {topics.length} 个考点模块，建议先过闪卡建立记忆，再通过客观题自测巩固。
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {topics.map((topic, index) => {
          const masteredCards = topic.flashcards.filter((c) => c.mastery === 'mastered').length;
          const flashcardProgress = topic.flashcards.length > 0 
            ? Math.round((masteredCards / topic.flashcards.length) * 100) 
            : 0;

          return (
            <div
              key={topic.id}
              className="bg-slate-900/80 border border-slate-800/80 hover:border-indigo-500/40 rounded-2xl p-6 flex flex-col justify-between transition-all group"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    模块 {index + 1}
                  </span>
                  <span className="text-xs text-slate-400 flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> 闪卡掌握度: {flashcardProgress}%
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
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>闪卡: {topic.flashcards.length} 张</span>
                  <span>客观题: {topic.quizzes.length} 题</span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onSelectTopic(topic.id, 'flashcards')}
                    className="flex-1 py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
                    背闪卡 ({topic.flashcards.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => onSelectTopic(topic.id, 'quiz')}
                    className="flex-1 py-2.5 px-3 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                    刷自测题 ({topic.quizzes.length})
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
