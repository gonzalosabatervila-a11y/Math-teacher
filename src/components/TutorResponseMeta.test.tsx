import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { TutorResponseMeta } from './TutorResponseMeta';

describe('TutorResponseMeta', () => {
  it('renders Spanish mode labels, checks and uncertainty accessibly', () => {
    render(<TutorResponseMeta mode="verification" checks={['Comprueba el dominio']} uncertainty="La imagen es parcial" />);
    expect(screen.getByText('Verificación')).toBeInTheDocument();
    expect(screen.getByText('Comprueba el dominio')).toBeInTheDocument();
    expect(screen.getByRole('note')).toHaveTextContent('La imagen es parcial');
  });
});
