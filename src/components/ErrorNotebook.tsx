import React from 'react';
import { QuizQuestion, CourseSet } from '../types';
import { FormattedMathText } from './FormattedMathText';
import { AlertOctagon, CheckCircle2, Quote, BookOpen } from 'lucide-react';

interface ErrorNotebookProps {
  errors: QuizQuestion[];
  courses?: CourseSet[];
  onClearError: (questionId: string) => void;
  onLocateQuote?: (quote: string, topicId?: string, courseId?: string) => void;
}

export const ErrorNotebook: React.FC<ErrorNotebookProps> = ({
  errors,
  courses = [],
  onClearError,
  onLocateQuote,
}) => {
  if (errors.length === 0) {
    return (
      <div className="w-full max-w-3xl mx-auto flex flex-col items-center justify-center p-16 text-center bg-slate-900/50 rounded-2xl border border-slate-800">
        <CheckCircle2 className="w-12 h-12 text-emerald-400 mb-4" />
        <h3 className="text-lg font-bold text-slate-200 mb-1">太棒了！暂无做错的题目</h3>
        <p className="text-sm text-slate-400 max-w-sm">
          所有自测做错的题目都会自动沉淀到这里，考前 15 分钟直接刷一遍错题即可通关。
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <AlertOctagon className="w-5 h-5 text-rose-400" />
            考前错题高频收敛池 ({errors.length} 题)
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            考前重点攻坚薄弱环节，弄懂后可点击“已攻克”移出错题本。
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {errors.map((q, idx) => {
          let relatedCourse = courses.find((c) =>
            c.topics.some((t) => t.quizzes.some((quiz) => quiz.id === q.id) || (q.topicId && t.id === q.topicId))
          );
          let relatedTopic = relatedCourse?.topics.find((t) =>
            t.quizzes.some((quiz) => quiz.id === q.id) || (q.topicId && t.id === q.topicId)
          );

          if (!relatedCourse && q.quoteSource) {
            relatedCourse = courses.find((c) => c.rawNote.includes(q.quoteSource!));
            relatedTopic = relatedCourse?.topics[0];
          }
          return (
            <div
              key={q.id}
              className="bg-slate-900/90 border border-rose-500/20 rounded-2xl p-6 shadow-lg relative overflow-hidden"
            >
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
                    错题 #{idx + 1} · {q.type === 'single_choice' ? '单选题' : '挖空题'}
                  </span>
                  {relatedCourse && (
                    <span
                      className="px-2 py-0.5 text-[11px] font-medium rounded-md bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 flex items-center gap-1 max-w-[280px] truncate"
                      title={`${relatedCourse.title} · ${relatedTopic?.title || ''}`}
                    >
                      <BookOpen className="w-3 h-3 text-indigo-400 shrink-0" />
                      <span className="truncate">{relatedCourse.title}</span>
                      {relatedTopic && <span className="text-indigo-400/80 truncate">/ {relatedTopic.title}</span>}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => onClearError(q.id)}
                  className="flex items-center gap-1 text-xs text-slate-400 hover:text-emerald-400 transition-colors cursor-pointer shrink-0"
                  title="已搞懂并移出错题本"
                >
                  <CheckCircle2 className="w-4 h-4 text-slate-500 hover:text-emerald-400" />
                  标记已掌握
                </button>
              </div>

            <div className="text-base font-medium text-slate-100 mb-4 leading-relaxed">
              <FormattedMathText content={q.prompt} />
            </div>

            {q.type === 'single_choice' && q.options && (
              <div className="space-y-2 mb-4">
                {q.options.map((opt, oIdx) => (
                  <div
                    key={oIdx}
                    className={`p-3 rounded-xl border text-sm flex items-center gap-3 ${
                      oIdx === q.correctAnswer
                        ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300 font-medium'
                        : 'border-slate-800 bg-slate-950/40 text-slate-400'
                    }`}
                  >
                    <span className="w-6 h-6 rounded-md bg-slate-800 flex items-center justify-center text-xs">
                      {String.fromCharCode(65 + oIdx)}
                    </span>
                    <FormattedMathText content={opt} />
                    {oIdx === q.correctAnswer && <span className="ml-auto text-xs text-emerald-400 font-semibold">(正确答案)</span>}
                  </div>
                ))}
              </div>
            )}

            {q.type === 'cloze' && (
              <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl mb-4 text-sm text-slate-300">
                <span>标准填空答案：</span>
                <strong className="text-emerald-400 ml-1">{String(q.correctAnswer)}</strong>
              </div>
            )}

            <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80 text-sm text-slate-300 space-y-2">
              <div className="font-semibold text-indigo-400">【解析】</div>
              <FormattedMathText content={q.explanation} />
            </div>

              {q.quoteSource && (
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={() => onLocateQuote?.(q.quoteSource || '', q.topicId, relatedCourse?.id)}
                    className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-medium py-1 px-2 rounded hover:bg-indigo-500/10 transition-colors cursor-pointer"
                  >
                    <Quote className="w-3.5 h-3.5" />
                    <span>在右侧分栏高亮原笔记出处 ➔</span>
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
