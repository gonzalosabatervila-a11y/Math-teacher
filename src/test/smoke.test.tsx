import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import App from '../App';

describe('Math Teacher application', () => {
  it('renders the classroom heading', () => {
    render(<App />);

    expect(
      screen.getByRole('heading', { name: 'Profesor de Matemáticas Preuniversitarias' })
    ).toBeInTheDocument();
  });
});
