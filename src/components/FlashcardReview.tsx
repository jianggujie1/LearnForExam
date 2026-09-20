import React, { useState } from 'react';
import { Flashcard } from '../types';
import { FormattedMathText } from './FormattedMathText';
import { RotateCw, CheckCircle2, HelpCircle, XCircle, Quote } from 'lucide-react';

interface FlashcardReviewProps {
  cards: Flashcard[];
  onUpdateCardMastery: (cardId: string, mastery: Flashcard['mastery']) => void;
  onFinish?: () => void;
  onLocateQuote?: (quote: string, topicId?: string, courseId?: string) => void;
}

export const FlashcardReview: React.FC<FlashcardReviewProps> = ({
  cards,
  onUpdateCardMastery,
  onFinish,
  onLocateQuote,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  if (cards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-slate-400 bg-slate-900/50 rounded-2xl border border-slate-800">
        <p className="text-lg">当前模块暂无闪卡</p>
      </div>
    );
  }

  const currentCard = cards[currentIndex];
  const progressPercent = Math.round(((currentIndex + 1) / cards.length) * 100);

  const handleNext = (mastery: Flashcard['mastery']) => {
    onUpdateCardMastery(currentCard.id, mastery);
    setIsFlipped(false);
    if (currentIndex < cards.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else if (onFinish) {
      onFinish();
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col items-center">
      {/* Progress Bar */}
      <div className="w-full flex items-center justify-between mb-4 text-xs font-medium text-slate-400">
        <span>闪卡复习 ({currentIndex + 1} / {cards.length})</span>
        <span>{progressPercent}% 完成</span>
      </div>
      <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden mb-6">
        <div 
          className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* 3D Flip Card Container */}
      <div 
        className="w-full h-80 perspective-1000 cursor-pointer select-none mb-6"
        onClick={() => setIsFlipped(!isFlipped)}
      >
        <div 
          className={`relative w-full h-full duration-500 transform-style-preserve-3d transition-transform rounded-2xl border border-slate-800 shadow-2xl ${
            isFlipped ? 'rotate-y-180' : ''
          }`}
        >
          {/* Front Face */}
          <div className="absolute inset-0 w-full h-full backface-hidden bg-slate-900/90 backdrop-blur-xl p-8 rounded-2xl flex flex-col justify-between border border-slate-700/50 hover:border-indigo-500/50 transition-colors">
            <div className="flex items-center justify-between text-xs font-semibold text-indigo-400 uppercase tracking-wider">
              <span>考点概念 / 题目</span>
              <span className="flex items-center gap-1 text-slate-400">
                <RotateCw className="w-3.5 h-3.5" /> 点击翻转看解析
              </span>
            </div>
            <div className="my-auto text-lg md:text-xl font-medium text-slate-100 text-center leading-relaxed">
              <FormattedMathText content={currentCard.front} />
            </div>
            <div className="text-center text-xs text-slate-500">
              [正面] 尝试在脑中回忆核心定义与公式
            </div>
          </div>

          {/* Back Face */}
          <div className="absolute inset-0 w-full h-full backface-hidden rotate-y-180 bg-slate-900/95 backdrop-blur-xl p-8 rounded-2xl flex flex-col justify-between border border-purple-500/40">
            <div className="flex items-center justify-between text-xs font-semibold text-purple-400 uppercase tracking-wider">
              <span>解析 & 答案</span>
              <span className="flex items-center gap-1 text-slate-400">
                <RotateCw className="w-3.5 h-3.5" /> 点击翻回正面
              </span>
            </div>
            <div className="my-auto text-base md:text-lg text-slate-200 leading-relaxed max-h-44 overflow-y-auto pr-2">
              <FormattedMathText content={currentCard.back} />
            </div>
            
            {/* Quote source preview & Split-locate */}
            {currentCard.quoteSource && (
              <div className="pt-2 border-t border-slate-800 text-left flex items-center justify-between">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onLocateQuote?.(currentCard.quoteSource || '', currentCard.topicId, currentCard.courseId);
                  }}
                  className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-medium py-1 px-2 rounded hover:bg-indigo-500/10 transition-colors"
                >
                  <Quote className="w-3 h-3" />
                  <span>在右侧分栏高亮原笔记出处 ➔</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Action Rating Buttons */}
      <div className="w-full flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => handleNext('learning')}
          className="flex-1 max-w-[140px] flex items-center justify-center gap-2 py-3 px-4 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-xl font-medium transition-all"
        >
          <XCircle className="w-4 h-4" /> 没记住
        </button>
        <button
          type="button"
          onClick={() => handleNext('learning')}
          className="flex-1 max-w-[140px] flex items-center justify-center gap-2 py-3 px-4 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-xl font-medium transition-all"
        >
          <HelpCircle className="w-4 h-4" /> 模糊
        </button>
        <button
          type="button"
          onClick={() => handleNext('mastered')}
          className="flex-1 max-w-[140px] flex items-center justify-center gap-2 py-3 px-4 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl font-medium transition-all"
        >
          <CheckCircle2 className="w-4 h-4" /> 牢记
        </button>
      </div>
    </div>
  );
};
