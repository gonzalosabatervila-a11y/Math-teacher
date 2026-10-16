import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { Dialog } from './Dialog';

function Fixture({ onClose = vi.fn() }: { onClose?: () => void }) {
  const [open, setOpen] = useState(false);
  return <>
    <button onClick={() => setOpen(true)}>Abrir</button>
    <Dialog open={open} title="Resumen" onClose={() => { onClose(); setOpen(false); }}>
      <button>Primero</button>
      <button>Segundo</button>
    </Dialog>
  </>;
}

describe('Dialog', () => {
  it('labels the dialog, traps focus, closes with Escape, and restores trigger focus', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<Fixture onClose={onClose} />);

    const trigger = screen.getByRole('button', { name: 'Abrir' });
    await user.click(trigger);
    expect(screen.getByRole('dialog', { name: 'Resumen' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Primero' })).toHaveFocus();
    await user.tab({ shift: true });
    expect(screen.getByRole('button', { name: 'Segundo' })).toHaveFocus();
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledOnce();
    expect(trigger).toHaveFocus();
  });
});
