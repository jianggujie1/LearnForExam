import { CourseSet, TopicCluster, QuizQuestion } from '../types';
import { normalizeForComparison } from '../components/NoteSplitViewer';

/**
 * Calculates the proportion of a quote's character bigrams that appear in a document.
 * Returns 1.0 for substring matches, or a ratio in [0, 1] representing character n-gram containment.
 */
export function computeQuoteInDocScore(doc: string, quote: string): number {
  const normDoc = normalizeForComparison(doc || '');
  const normQuote = normalizeForComparison(quote || '');
  if (!normDoc || !normQuote) return 0;
  if (normDoc.includes(normQuote)) return 1.0;

  const quoteBigrams = new Set<string>();
  for (let i = 0; i < normQuote.length - 1; i++) {
    quoteBigrams.add(normQuote.slice(i, i + 2));
  }
  if (quoteBigrams.size === 0) {
    return normDoc.includes(normQuote) ? 1.0 : 0;
  }

  let matched = 0;
  for (const bg of quoteBigrams) {
    if (normDoc.includes(bg)) {
      matched++;
    }
  }
  return matched / quoteBigrams.size;
}

/**
 * Accurately finds the corresponding CourseSet and TopicCluster for a given QuizQuestion.
 * Solves the collision issue where multiple courses share generic IDs like "topic-1" or "qz-1".
 */
export function findCourseAndTopicForQuestion(
  q: QuizQuestion,
  courses: CourseSet[]
): { course?: CourseSet; topic?: TopicCluster } {
  if (!courses || courses.length === 0) return {};

  // 1. If explicit courseId exists, verify it and locate the topic
  if (q.courseId) {
    const course = courses.find((c) => c.id === q.courseId);
    if (course) {
      const topic =
        course.topics.find((t) =>
          t.quizzes.some(
            (quiz) =>
              quiz.prompt.trim() === q.prompt.trim() ||
              (quiz.id === q.id && quiz.prompt.trim() === q.prompt.trim())
          )
        ) ||
        course.topics.find((t) => q.topicId && t.id === q.topicId) ||
        course.topics[0];
      return { course, topic };
    }
  }

  // 2. Exact match by quiz prompt (question text is unique to subject and content)
  const cleanPrompt = q.prompt?.trim();
  if (cleanPrompt) {
    for (const course of courses) {
      for (const topic of course.topics) {
        const matchedQuiz = topic.quizzes.find(
          (quiz) =>
            quiz.prompt.trim() === cleanPrompt ||
            (quiz.id === q.id && quiz.prompt.trim() === cleanPrompt)
        );
        if (matchedQuiz) {
          return { course, topic };
        }
      }
    }
  }

  // 3. Match by quoteSource against each course's rawNote
  const cleanQuote = q.quoteSource?.trim();
  if (cleanQuote) {
    // 3a. Exact raw substring
    const exactCourse = courses.find((c) => c.rawNote.includes(cleanQuote));
    if (exactCourse) {
      const topic =
        exactCourse.topics.find((t) =>
          t.quizzes.some(
            (quiz) =>
              cleanPrompt &&
              (quiz.prompt.trim() === cleanPrompt || quiz.id === q.id)
          )
        ) || exactCourse.topics[0];
      return { course: exactCourse, topic };
    }

    // 3b. Normalized substring
    const normQuote = normalizeForComparison(cleanQuote);
    if (normQuote.length >= 4) {
      const normCourse = courses.find((c) =>
        normalizeForComparison(c.rawNote).includes(normQuote)
      );
      if (normCourse) {
        const topic =
          normCourse.topics.find((t) =>
            t.quizzes.some(
              (quiz) =>
                cleanPrompt &&
                (quiz.prompt.trim() === cleanPrompt || quiz.id === q.id)
            )
          ) || normCourse.topics[0];
        return { course: normCourse, topic };
      }
    }

    // 3c. Bigram containment score
    let bestScore = 0;
    let bestCourse: CourseSet | undefined;
    for (const c of courses) {
      const score = computeQuoteInDocScore(c.rawNote, cleanQuote);
      if (score > bestScore) {
        bestScore = score;
        bestCourse = c;
      }
    }
    if (bestCourse && bestScore >= 0.4) {
      const topic =
        bestCourse.topics.find((t) =>
          t.quizzes.some(
            (quiz) =>
              cleanPrompt &&
              (quiz.prompt.trim() === cleanPrompt || quiz.id === q.id)
          )
        ) || bestCourse.topics[0];
      return { course: bestCourse, topic };
    }
  }

  // 4. Unique quiz ID match (only when exactly ONE course contains this quiz ID)
  if (q.id) {
    const candidateCourses = courses.filter((c) =>
      c.topics.some((t) => t.quizzes.some((quiz) => quiz.id === q.id))
    );
    if (candidateCourses.length === 1) {
      const course = candidateCourses[0];
      const topic =
        course.topics.find((t) =>
          t.quizzes.some((quiz) => quiz.id === q.id)
        ) || course.topics[0];
      return { course, topic };
    }
  }

  // 5. Fallback: prompt text contained in rawNote
  if (cleanPrompt) {
    const normPrompt = normalizeForComparison(cleanPrompt);
    if (normPrompt.length >= 6) {
      for (const course of courses) {
        if (normalizeForComparison(course.rawNote).includes(normPrompt)) {
          return { course, topic: course.topics[0] };
        }
      }
    }
  }

  return {};
}

/**
 * Finds the correct course set corresponding to a quote when locating note origin.
 * If a preferredCourseId is given, checks if that course actually contains the quote.
 * If not, finds the course whose raw note genuinely contains the quote.
 */
export function findCourseForQuote(
  quote: string,
  courses: CourseSet[],
  preferredCourseId?: string | null
): CourseSet | undefined {
  if (!courses || courses.length === 0) return undefined;
  const cleanQuote = (quote || '').trim();

  // If quote is empty, fallback to preferred course or first course
  if (!cleanQuote) {
    if (preferredCourseId) {
      return courses.find((c) => c.id === preferredCourseId) || courses[0];
    }
    return courses[0];
  }

  const normQuote = normalizeForComparison(cleanQuote);

  // 1. If preferredCourseId is provided, verify whether it genuinely contains the quote
  if (preferredCourseId) {
    const prefCourse = courses.find((c) => c.id === preferredCourseId);
    if (prefCourse) {
      if (prefCourse.rawNote.includes(cleanQuote)) return prefCourse;
      if (
        normQuote.length >= 4 &&
        normalizeForComparison(prefCourse.rawNote).includes(normQuote)
      ) {
        return prefCourse;
      }
      if (computeQuoteInDocScore(prefCourse.rawNote, cleanQuote) >= 0.45) {
        return prefCourse;
      }
    }
  }

  // 2. Exact substring match in any course
  const exactCourse = courses.find((c) => c.rawNote.includes(cleanQuote));
  if (exactCourse) return exactCourse;

  // 3. Normalized match in any course
  if (normQuote.length >= 4) {
    const normCourse = courses.find((c) =>
      normalizeForComparison(c.rawNote).includes(normQuote)
    );
    if (normCourse) return normCourse;
  }

  // 4. Best bigram containment in any course
  let bestScore = 0;
  let bestCourse: CourseSet | undefined;
  for (const c of courses) {
    const score = computeQuoteInDocScore(c.rawNote, cleanQuote);
    if (score > bestScore) {
      bestScore = score;
      bestCourse = c;
    }
  }
  if (bestCourse && bestScore >= 0.35) {
    return bestCourse;
  }

  // 5. Fallback: if preferred course exists return it, otherwise first course
  if (preferredCourseId) {
    const pref = courses.find((c) => c.id === preferredCourseId);
    if (pref) return pref;
  }
  return courses[0];
}
