import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { AppShell } from './AppShell';

describe('AppShell', () => {
  it('exposes one heading, a skip link and primary navigation', () => {
    const navigate = vi.fn();
    render(<AppShell mode="home" onNavigate={navigate}><p>Contenido</p></AppShell>);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Profesor de Matemáticas');
    expect(screen.getByRole('link', { name: /saltar al contenido/i })).toHaveAttribute('href', '#main-content');
    fireEvent.click(screen.getAllByRole('button', { name: 'Historial' })[0]);
    expect(navigate).toHaveBeenCalledWith('history');
  });
});
