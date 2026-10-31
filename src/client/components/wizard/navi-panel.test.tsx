// @vitest-environment jsdom
import { describe, expect, it, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { NaviPanel } from './navi-panel';
import type { WizardConversationView } from './use-wizard-conversation';

const base: WizardConversationView = {
  active: true,
  endedMidway: false,
  status: 'ready',
  turns: [],
  choices: [],
  pending: false,
  minimized: false,
  setMinimized: vi.fn(),
  panelOpen: true,
  setPanelOpen: vi.fn(),
  fresh: true,
  greeting: 'Oi! Me conta o que você faz.',
  send: vi.fn(),
  pickChoice: vi.fn(),
};

afterEach(cleanup);

describe('NaviPanel', () => {
  it('fechado → null', () => {
    const { container } = render(<NaviPanel conv={{ ...base, panelOpen: false }} />);
    expect(container.firstChild).toBeNull();
  });

  it('fio vazio → mostra a saudação', () => {
    render(<NaviPanel conv={base} />);
    expect(screen.getByText(/Me conta o que você faz/)).toBeTruthy();
  });

  it('fio começado → sem saudação, mostra os turnos', () => {
    render(
      <NaviPanel
        conv={{
          ...base,
          fresh: false,
          turns: [
            { role: 'assistant', content: 'e aí?' },
            { role: 'user', content: 'sou pintor' },
          ],
        }}
      />
    );
    expect(screen.queryByText(/Me conta o que você faz/)).toBeNull();
    expect(screen.getByText('sou pintor')).toBeTruthy();
  });
});
