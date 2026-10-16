import { describe, expect, it } from 'vitest';

import { SYLLABUS } from './syllabus';

describe('syllabus content boundaries', () => {
  it('covers weeks 0 through 13 once and in order', () => {
    expect(SYLLABUS.map(({ week }) => week)).toEqual(Array.from({ length: 14 }, (_, index) => index));
  });

  it('provides goals and labels curricular and extension content', () => {
    for (const item of SYLLABUS) {
      expect(item.learningGoals.length).toBeGreaterThan(0);
      expect(item.curricularTopics.length).toBeGreaterThan(0);
      expect(item.extensionTopics).toBeDefined();
      expect(item.financialDisclaimer.toLowerCase()).toContain('conceptual');
      expect(item.financialDisclaimer.toLowerCase()).toContain('asesoramiento');
    }
  });

  it('states important hypotheses for inverse functions and L’Hôpital', () => {
    const inverses = SYLLABUS.find(({ week }) => week === 4)!;
    expect(inverses.hypothesisNotes.join(' ').toLowerCase()).toMatch(/inyectiv|dominio/);

    const limits = SYLLABUS.find(({ week }) => week === 6)!;
    expect(limits.hypothesisNotes.join(' ').toLowerCase()).toMatch(/derivab/);
    expect(limits.hypothesisNotes.join(' ')).toMatch(/0\/0|∞\/∞/);
  });

  it('presents lognormal pricing as a model assumption, not a market fact', () => {
    const probability = SYLLABUS.find(({ week }) => week === 12)!;
    expect(probability.hypothesisNotes.join(' ').toLowerCase()).toMatch(/supuesto|modelo/);
    expect(probability.hypothesisNotes.join(' ').toLowerCase()).toMatch(/no garantiza/);
  });
});
