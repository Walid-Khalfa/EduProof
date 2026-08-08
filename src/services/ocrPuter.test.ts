import { describe, expect, it } from 'vitest';
import { computeVerificationScore } from './ocrPuter';

describe('computeVerificationScore', () => {
  it('returns 0 for missing confidences', () => {
    expect(computeVerificationScore({})).toBe(0);
  });

  it('averages the four field confidences into a 0-100 score', () => {
    expect(computeVerificationScore({
      student_name: 0.9,
      course_name: 0.8,
      institution: 0.7,
      issue_date: 0.6,
    })).toBe(75);
  });

  it('rounds to the nearest integer', () => {
    expect(computeVerificationScore({
      student_name: 0.5,
      course_name: 0.5,
      institution: 0.5,
      issue_date: 0.5,
    })).toBe(50);
  });

  it('ignores extra keys', () => {
    expect(computeVerificationScore({
      student_name: 1,
      course_name: 1,
      institution: 1,
      issue_date: 1,
      extra: 0,
    })).toBe(100);
  });
});
