/** Group flat lessons into modules (Alison-style course outline). */
export type OutlineLesson = {
  id: string;
  title: string;
  type: string;
  sortOrder?: number;
  moduleTitle?: string | null;
  durationSec?: number;
};

export type CourseModule = {
  title: string;
  lessons: OutlineLesson[];
  outcomes: OutlineLesson[];
  summary: OutlineLesson[];
  core: OutlineLesson[];
};

export function groupLessonsIntoModules(lessons: OutlineLesson[]): CourseModule[] {
  const sorted = [...lessons].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  const map = new Map<string, OutlineLesson[]>();

  for (const lesson of sorted) {
    const key = lesson.moduleTitle?.trim() || 'Course content';
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(lesson);
  }

  return [...map.entries()].map(([title, items]) => {
    const outcomes = items.filter((l) => /learning outcomes/i.test(l.title));
    const summary = items.filter((l) => /lesson summary|module summary/i.test(l.title));
    const core = items.filter((l) => !outcomes.includes(l) && !summary.includes(l));
    return { title, lessons: items, outcomes, summary, core };
  });
}

export function isOutcomesLesson(title: string) {
  return /learning outcomes/i.test(title);
}
