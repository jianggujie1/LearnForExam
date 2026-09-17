import React, { useState } from 'react';
import { QuizQuestion } from '../types';
import { FormattedMathText } from './FormattedMathText';
import { CheckCircle2, XCircle, Quote, ArrowRight } from 'lucide-react';
import confetti from 'canvas-confetti';

interface QuizSessionProps {
  questions: QuizQuestion[];
  onFinish?: (score: number, total: number) => void;
  onRecordAnswer?: (questionId: string, answer: string | number, isCorrect: boolean) => void;
  onLocateQuote?: (quote: string) => void;
}

export const QuizSession: React.FC<QuizSessionProps> = ({
  questions,
  onFinish,
  onRecordAnswer,
  onLocateQuote,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [clozeInput, setClozeInput] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [score, setScore] = useState(0);

  if (questions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-slate-400 bg-slate-900/50 rounded-2xl border border-slate-800">
        <p className="text-lg">当前模块暂无自测题</p>
      </div>
    );
  }

  const currentQ = questions[currentIndex];
  const progressPercent = Math.round(((currentIndex + 1) / questions.length) * 100);

  const handleSubmitChoice = (optionIdx: number) => {
    if (isSubmitted) return;
    setSelectedOption(optionIdx);
    setIsSubmitted(true);
    const correct = optionIdx === currentQ.correctAnswer;
    if (correct) {
      setScore(score + 1);
      confetti({ particleCount: 40, spread: 60, origin: { y: 0.8 } });
    }
    onRecordAnswer?.(currentQ.id, optionIdx, correct);
  };

  const handleSubmitCloze = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitted || !clozeInput.trim()) return;
    setIsSubmitted(true);
    const correct = clozeInput.trim().toLowerCase() === String(currentQ.correctAnswer).trim().toLowerCase();
    if (correct) {
      setScore(score + 1);
      confetti({ particleCount: 40, spread: 60, origin: { y: 0.8 } });
    }
    onRecordAnswer?.(currentQ.id, clozeInput.trim(), correct);
  };

  const handleNext = () => {
    setIsSubmitted(false);
    setSelectedOption(null);
    setClozeInput('');

    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else if (onFinish) {
      onFinish(score, questions.length);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col">
      {/* Progress & Score */}
      <div className="flex items-center justify-between mb-4 text-xs font-medium text-slate-400">
        <span>自测试卷 ({currentIndex + 1} / {questions.length})</span>
        <span>当前得分: <strong className="text-emerald-400 font-semibold">{score}</strong> / {questions.length}</span>
      </div>
      <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden mb-6">
        <div 
          className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-300"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Question Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 md:p-8 shadow-xl mb-6">
        <div className="flex items-center gap-2 mb-4">
          <span className="px-2.5 py-1 text-xs font-semibold rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            {currentQ.type === 'single_choice' ? '单项选择题' : '挖空填空题'}
          </span>
        </div>

        {/* Prompt */}
        <div className="text-lg font-medium text-slate-100 mb-6 leading-relaxed">
          <FormattedMathText content={currentQ.prompt} />
        </div>

        {/* Question Type: Single Choice */}
        {currentQ.type === 'single_choice' && currentQ.options && (
          <div className="flex flex-col gap-3">
            {currentQ.options.map((opt, idx) => {
              const isSelected = selectedOption === idx;
              const isCorrectOpt = idx === currentQ.correctAnswer;
              let btnStyle = "border-slate-800 bg-slate-950/50 hover:border-slate-700 text-slate-200";

              if (isSubmitted) {
                if (isCorrectOpt) {
                  btnStyle = "border-emerald-500 bg-emerald-500/10 text-emerald-300";
                } else if (isSelected && !isCorrectOpt) {
                  btnStyle = "border-rose-500 bg-rose-500/10 text-rose-300";
                } else {
                  btnStyle = "opacity-50 border-slate-800 bg-slate-950/20 text-slate-500";
                }
              }

              return (
                <button
                  key={idx}
                  type="button"
                  disabled={isSubmitted}
                  onClick={() => handleSubmitChoice(idx)}
                  className={`w-full text-left p-4 rounded-xl border flex items-center justify-between transition-all ${btnStyle}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-lg bg-slate-800/80 border border-slate-700/60 flex items-center justify-center text-xs font-semibold text-slate-300">
                      {String.fromCharCode(65 + idx)}
                    </span>
                    <FormattedMathText content={opt} />
                  </div>
                  {isSubmitted && isCorrectOpt && <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />}
                  {isSubmitted && isSelected && !isCorrectOpt && <XCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />}
                </button>
              );
            })}
          </div>
        )}

        {/* Question Type: Cloze */}
        {currentQ.type === 'cloze' && (
          <form onSubmit={handleSubmitCloze} className="flex flex-col gap-4">
            {currentQ.clozeTemplate && (
              <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800/80 text-base leading-relaxed text-slate-200">
                <FormattedMathText 
                  content={currentQ.clozeTemplate.replace('{blank}', ' [ __________ ] ')} 
                />
              </div>
            )}
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={clozeInput}
                disabled={isSubmitted}
                onChange={(e) => setClozeInput(e.target.value)}
                placeholder="请输入所填内容..."
                className="flex-1 px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
              {!isSubmitted && (
                <button
                  type="submit"
                  disabled={!clozeInput.trim()}
                  className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl transition-all"
                >
                  确认答案
                </button>
              )}
            </div>
            {isSubmitted && (
              <div className="text-sm font-medium">
                {clozeInput.trim().toLowerCase() === String(currentQ.correctAnswer).trim().toLowerCase() ? (
                  <span className="text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" /> 回答完全正确！
                  </span>
                ) : (
                  <span className="text-rose-400 flex items-center gap-1.5">
                    <XCircle className="w-4 h-4" /> 回答有误，标准答案是：<strong className="text-white underline">{String(currentQ.correctAnswer)}</strong>
                  </span>
                )}
              </div>
            )}
          </form>
        )}

        {/* Explanation & Grounding Quote */}
        {isSubmitted && (
          <div className="mt-6 pt-6 border-t border-slate-800 space-y-3">
            <div className="text-sm text-slate-300 bg-slate-950/60 p-4 rounded-xl border border-slate-800/60">
              <span className="font-semibold text-indigo-400 block mb-1">【解析与考点分析】</span>
              <FormattedMathText content={currentQ.explanation} />
            </div>

            {currentQ.quoteSource && (
              <div>
                <button
                  type="button"
                  onClick={() => onLocateQuote?.(currentQ.quoteSource || '')}
                  className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-medium py-1 px-2 rounded hover:bg-indigo-500/10 transition-colors cursor-pointer"
                >
                  <Quote className="w-3.5 h-3.5" />
                  <span>在右侧分栏高亮原笔记出处 ➔</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Next Button */}
      {isSubmitted && (
        <button
          type="button"
          onClick={handleNext}
          className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20 transition-all cursor-pointer"
        >
          {currentIndex < questions.length - 1 ? '下一题' : '完成本次自测'} <ArrowRight className="w-5 h-5" />
        </button>
      )}
    </div>
  );
};
