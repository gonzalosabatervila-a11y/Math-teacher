import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ResponsiveWorkspaceTabs } from './ResponsiveWorkspaceTabs';

describe('ResponsiveWorkspaceTabs', () => {
  it('supports arrow keys and keeps both panels mounted while switching', () => {
    render(<ResponsiveWorkspaceTabs paper={<input aria-label="nota papel" defaultValue="conservar" />} tutor={<input aria-label="nota profesor" defaultValue="respuesta" />} />);
    const paper = screen.getByRole('tab', { name: 'Papel' });
    const tutor = screen.getByRole('tab', { name: 'Profesor' });
    expect(paper).toHaveAttribute('aria-selected', 'true');
    fireEvent.keyDown(paper, { key: 'ArrowRight' });
    expect(tutor).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByLabelText('nota papel')).toHaveValue('conservar');
    expect(screen.getByLabelText('nota profesor')).toHaveValue('respuesta');
  });
});
