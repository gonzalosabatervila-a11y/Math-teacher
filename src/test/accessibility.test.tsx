import axe from 'axe-core';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import App from '../App';

async function expectNoSeriousAxeViolations(container: HTMLElement) {
  const results = await axe.run(container, { resultTypes: ['violations'] });
  const serious = results.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact ?? ''));
  expect(serious.map(({ id, nodes }) => ({ id, targets: nodes.map((node) => node.target) }))).toEqual([]);
}

describe('classroom accessibility', () => {
  it('covers the Inicio landmarks and primary action', async () => {
    const { container } = render(<App />);

    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /empezar sesión/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /saltar al contenido/i })).toHaveAttribute('href', '#main-content');

    await expectNoSeriousAxeViolations(container);
  }, 15_000);

  it('covers Sesión and its mobile Paper/Teacher tabs', async () => {
    const { container } = render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /empezar sesión/i }));

    expect(screen.getByText('Sesión activa')).toBeInTheDocument();
    const paperTab = screen.getByRole('tab', { name: 'Papel' });
    const tutorTab = screen.getByRole('tab', { name: 'Profesor' });
    expect(paperTab).toHaveAttribute('aria-selected', 'true');
    fireEvent.keyDown(paperTab, { key: 'ArrowRight' });
    expect(tutorTab).toHaveAttribute('aria-selected', 'true');

    await expectNoSeriousAxeViolations(container);
  }, 15_000);

  it('covers the postmortem dialog', async () => {
    const { container } = render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /empezar sesión/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Finalizar y guardar' }));

    expect(screen.getByRole('dialog', { name: /postmortem y resumen de estado/i })).toBeInTheDocument();
    await expectNoSeriousAxeViolations(container);
  }, 15_000);

  it('covers Historial and backup controls', async () => {
    const { container } = render(<App />);
    fireEvent.click(screen.getAllByRole('button', { name: 'Historial' })[0]);

    expect(screen.getByRole('heading', { name: 'Historial y copia de seguridad' })).toBeInTheDocument();
    expect(screen.getByLabelText('Importar copia')).toHaveAttribute('type', 'file');

    await expectNoSeriousAxeViolations(container);
  }, 15_000);
});
