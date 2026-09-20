import { describe, it, expect } from 'bun:test';
import { CourseSet, QuizQuestion } from '../src/types';
import {
  computeQuoteInDocScore,
  findCourseAndTopicForQuestion,
  findCourseForQuote,
} from '../src/utils/courseMatcher';

describe('courseMatcher and note source location', () => {
  const mockCourses: CourseSet[] = [
    {
      id: 'course-math',
      title: '高等数学复习',
      rawNote: '# 高等数学\n重要极限：$\\lim_{x \\to 0} \\frac{\\sin x}{x} = 1$。泰勒公式与洛必达法则。',
      createdAt: 1700000000000,
      topics: [
        {
          id: 'topic-1',
          title: '极限与连续',
          summary: '微积分极限计算',
          order: 1,
          flashcards: [],
          quizzes: [
            {
              id: 'qz-1',
              topicId: 'topic-1',
              type: 'single_choice',
              prompt: '求重要极限 $\\lim_{x \\to 0} \\frac{\\sin x}{x}$ 的值？',
              options: ['0', '1', 'e', '不存在'],
              correctAnswer: 1,
              explanation: '第一重要极限值为 1。',
              quoteSource: '重要极限：$\\lim_{x \\to 0} \\frac{\\sin x}{x} = 1$',
            },
          ],
        },
      ],
    },
    {
      id: 'course-network',
      title: '计算机网络复习',
      rawNote: '# 计算机网络\nTCP 是面向连接的可靠传输协议。TCP 建立连接需要进行三次握手。滑动窗口用于流量控制。',
      createdAt: 1700001000000,
      topics: [
        {
          id: 'topic-1', // Colliding generic topic ID
          title: '传输层',
          summary: 'TCP与UDP协议',
          order: 1,
          flashcards: [],
          quizzes: [
            {
              id: 'qz-1', // Colliding generic quiz ID
              topicId: 'topic-1',
              type: 'single_choice',
              prompt: 'TCP 协议建立连接时需要进行几次握手？',
              options: ['一次', '两次', '三次', '四次'],
              correctAnswer: 2,
              explanation: 'TCP 建立连接采用三次握手机制。',
              quoteSource: 'TCP 建立连接需要进行三次握手',
            },
          ],
        },
      ],
    },
  ];

  it('correctly associates error question with the right course despite generic topic-1 / qz-1 IDs', () => {
    const errorFromNetwork: QuizQuestion = {
      id: 'qz-1',
      topicId: 'topic-1',
      type: 'single_choice',
      prompt: 'TCP 协议建立连接时需要进行几次握手？',
      options: ['一次', '两次', '三次', '四次'],
      correctAnswer: 2,
      explanation: 'TCP 建立连接采用三次握手机制。',
      quoteSource: 'TCP 建立连接需要进行三次握手',
    };

    const { course, topic } = findCourseAndTopicForQuestion(errorFromNetwork, mockCourses);
    expect(course?.id).toBe('course-network');
    expect(course?.title).toBe('计算机网络复习');
    expect(topic?.title).toBe('传输层');
  });

  it('correctly associates error question when courseId is already explicitly provided', () => {
    const errorWithCourseId: QuizQuestion = {
      id: 'qz-custom',
      topicId: 'topic-custom',
      courseId: 'course-network',
      type: 'single_choice',
      prompt: 'TCP 协议建立连接时需要进行几次握手？',
      correctAnswer: 2,
      explanation: 'TCP 建立连接采用三次握手机制。',
    };

    const { course, topic } = findCourseAndTopicForQuestion(errorWithCourseId, mockCourses);
    expect(course?.id).toBe('course-network');
    expect(topic?.id).toBe('topic-1');
  });

  it('findCourseForQuote accurately finds the note containing the quote, ignoring incorrect preferred course', () => {
    // If course-math was mistakenly passed, but the quote is from network note:
    const target = findCourseForQuote(
      'TCP 建立连接需要进行三次握手',
      mockCourses,
      'course-math'
    );
    expect(target?.id).toBe('course-network');
  });

  it('findCourseForQuote preserves preferred course when it legitimately contains the quote', () => {
    const target = findCourseForQuote(
      'TCP 建立连接需要进行三次握手',
      mockCourses,
      'course-network'
    );
    expect(target?.id).toBe('course-network');
  });

  it('computeQuoteInDocScore gives high score for matching quote and near 0 for irrelevant doc', () => {
    const docNetwork = mockCourses[1].rawNote;
    const docMath = mockCourses[0].rawNote;
    const quote = 'TCP 建立连接需要进行三次握手';

    const networkScore = computeQuoteInDocScore(docNetwork, quote);
    const mathScore = computeQuoteInDocScore(docMath, quote);

    expect(networkScore).toBeGreaterThanOrEqual(0.9);
    expect(mathScore).toBeLessThan(0.2);
  });

  it('auto-repairs existing unlinked errors on mount to the correct course', () => {
    const legacyErrors: QuizQuestion[] = [
      {
        id: 'qz-1',
        topicId: 'topic-1',
        type: 'single_choice',
        prompt: 'TCP 协议建立连接时需要进行几次握手？',
        correctAnswer: 2,
        explanation: 'TCP 建立连接采用三次握手机制。',
        quoteSource: 'TCP 建立连接需要进行三次握手',
      },
      {
        id: 'qz-1',
        topicId: 'topic-1',
        type: 'single_choice',
        prompt: '求重要极限 $\\lim_{x \\to 0} \\frac{\\sin x}{x}$ 的值？',
        correctAnswer: 1,
        explanation: '第一重要极限值为 1。',
        quoteSource: '重要极限：$\\lim_{x \\to 0} \\frac{\\sin x}{x} = 1$',
      },
    ];

    const repaired = legacyErrors.map((err) => {
      const { course, topic } = findCourseAndTopicForQuestion(err, mockCourses);
      return {
        ...err,
        courseId: course?.id,
        topicId: topic?.id || err.topicId,
      };
    });

    expect(repaired[0].courseId).toBe('course-network');
    expect(repaired[1].courseId).toBe('course-math');
  });
});
