import type { QuizOption } from '@/types/quiz';

export function opts(a: string, b: string, c: string, d: string): QuizOption[] {
  return [
    { id: 'a', textHebrew: a },
    { id: 'b', textHebrew: b },
    { id: 'c', textHebrew: c },
    { id: 'd', textHebrew: d },
  ];
}
