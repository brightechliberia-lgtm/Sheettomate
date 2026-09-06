export function percentComplete(completedLessons: number, totalLessons: number): number {
  if (totalLessons <= 0) return 0;
  return Math.min(100, Math.round((completedLessons / totalLessons) * 100));
}

export type QuizQuestion = {
  id: string;
  type: 'MC' | 'TF';
  prompt: string;
  choices?: string[];
  correct: string | boolean;
};

export function scoreQuiz(
  questions: QuizQuestion[],
  answers: Record<string, string | boolean>,
): { score: number; passed: boolean; passingScore: number } {
  if (!questions.length) return { score: 0, passed: false, passingScore: 70 };
  let correct = 0;
  for (const q of questions) {
    const given = answers[q.id];
    if (q.type === 'TF') {
      const expected = q.correct === true || q.correct === 'true' || q.correct === 'True';
      const actual = given === true || given === 'true' || given === 'True';
      if (expected === actual) correct += 1;
    } else if (String(given).trim() === String(q.correct).trim()) {
      correct += 1;
    }
  }
  const score = Math.round((correct / questions.length) * 100);
  return { score, passed: score >= 70, passingScore: 70 };
}

export function slugify(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
  return `${base || 'course'}-${Date.now().toString(36)}`;
}

export function detectVideoProvider(url?: string | null): string | null {
  if (!url) return null;
  if (/youtube\.com|youtu\.be/i.test(url)) return 'YOUTUBE';
  if (/vimeo\.com/i.test(url)) return 'VIMEO';
  if (/mux\.com|stream\.mux/i.test(url) || /^[a-zA-Z0-9]{20,}$/.test(url)) return 'MUX';
  return 'EXTERNAL';
}

export function embedUrl(url?: string | null): string | null {
  if (!url) return null;
  const yt = url.match(/(?:v=|youtu\.be\/)([A-Za-z0-9_-]{6,})/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  const vimeo = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
  if (/mux/i.test(url) || /^[a-zA-Z0-9]{20,}$/.test(url)) {
    const id = url.includes('/') ? url.split('/').pop()! : url;
    return `https://stream.mux.com/${id}.m3u8`;
  }
  return url;
}
