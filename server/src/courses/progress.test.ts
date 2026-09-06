import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { percentComplete, scoreQuiz, slugify } from './progress';

describe('course progress', () => {
  it('computes completion percent', () => {
    assert.equal(percentComplete(2, 4), 50);
    assert.equal(percentComplete(0, 0), 0);
  });

  it('scores mixed quiz types', () => {
    const result = scoreQuiz(
      [
        { id: 'a', type: 'MC', prompt: '', choices: ['SUM'], correct: 'SUM' },
        { id: 'b', type: 'TF', prompt: '', correct: false },
      ],
      { a: 'SUM', b: false },
    );
    assert.equal(result.score, 100);
    assert.equal(result.passed, true);
  });

  it('builds a slug', () => {
    assert.match(slugify('Excel Basics!'), /excel-basics-/);
  });
});
