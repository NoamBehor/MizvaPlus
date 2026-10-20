import type { QuizQuestion } from '@/types/quiz';
import { EASY_QUESTIONS } from './easy';
import { MEDIUM_QUESTIONS } from './medium';
import { HARD_QUESTIONS } from './hard';
import { VERY_HARD_QUESTIONS } from './veryHard';

export { opts } from './helpers';
export { EASY_QUESTIONS } from './easy';
export { MEDIUM_QUESTIONS } from './medium';
export { HARD_QUESTIONS } from './hard';
export { VERY_HARD_QUESTIONS } from './veryHard';

export const QUIZ_QUESTION_BANK: QuizQuestion[] = [
  ...EASY_QUESTIONS,
  ...MEDIUM_QUESTIONS,
  ...HARD_QUESTIONS,
  ...VERY_HARD_QUESTIONS,
];
