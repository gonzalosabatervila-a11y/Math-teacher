import axe from 'axe-core';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import App from '../App';

describe('classroom accessibility', () => {
  it('exposes landmarks, named primary controls, and no serious Axe violations', async () => {
    const { container } = render(<App />);

    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /empezar sesión/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /saltar al contenido/i })).toHaveAttribute('href', '#main-content');

    const results = await axe.run(container, { resultTypes: ['violations'] });
    const serious = results.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact ?? ''));
    expect(serious.map(({ id, nodes }) => ({ id, targets: nodes.map((node) => node.target) }))).toEqual([]);
  });
});
