// @vitest-environment jsdom
import { describe, expect, it, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { NaviDock } from './navi-dock';
import type { WizardConversationView } from './use-wizard-conversation';

function view(over: Partial<WizardConversationView> = {}): WizardConversationView {
  return {
    active: true,
    endedMidway: false,
    status: 'ready',
    turns: [],
    choices: [],
    pending: false,
    minimized: false,
    setMinimized: vi.fn(),
    panelOpen: false,
    setPanelOpen: vi.fn(),
    fresh: true,
    greeting: 'oi',
    send: vi.fn(),
    pickChoice: vi.fn(),
    retry: vi.fn(),
    ...over,
  };
}

afterEach(cleanup);

describe('NaviDock', () => {
  it('mostra a última mensagem clara e a penúltima desfocada', () => {
    const v = view({
      turns: [
        { role: 'assistant', content: 'primeira' },
        { role: 'user', content: 'resp' },
        { role: 'assistant', content: 'última' },
      ],
    });
    render(<NaviDock conv={v} />);
    expect(screen.getByText('última')).toBeTruthy();
    expect(screen.getByText('resp').className).toMatch(/blur/);
  });

  it('chip simples chama pickChoice', () => {
    const v = view({ choices: [{ label: 'Eletricista' }] });
    render(<NaviDock conv={v} />);
    fireEvent.click(screen.getByRole('button', { name: 'Eletricista' }));
    expect(v.pickChoice).toHaveBeenCalledWith({ label: 'Eletricista' });
  });

  it('chips multi acumulam e só enviam no botão Enviar', () => {
    const v = view({
      choices: [
        { label: 'Instalações', multi: true },
        { label: 'Reparos', multi: true },
      ],
    });
    render(<NaviDock conv={v} />);
    fireEvent.click(screen.getByRole('button', { name: /Instalações/ }));
    fireEvent.click(screen.getByRole('button', { name: /Reparos/ }));
    expect(v.send).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: /Enviar 2/ }));
    expect(v.send).toHaveBeenCalledWith('Instalações, Reparos');
  });

  it('enviar vazio com opções → mensagem em vermelho', () => {
    const v = view({ choices: [{ label: 'Sim' }] });
    render(<NaviDock conv={v} />);
    fireEvent.click(screen.getByRole('button', { name: 'Enviar mensagem' }));
    expect(screen.getByRole('alert').textContent).toMatch(/toque numa opção/i);
    expect(v.send).not.toHaveBeenCalled();
  });

  it('minimizar e ver conversa', () => {
    const v = view();
    render(<NaviDock conv={v} />);
    fireEvent.click(screen.getByRole('button', { name: /minimizar/i }));
    expect(v.setMinimized).toHaveBeenCalledWith(true);
    fireEvent.click(screen.getByRole('button', { name: /ver conversa/i }));
    expect(v.setPanelOpen).toHaveBeenCalledWith(true);
  });

  it('degraded mostra tentar de novo', () => {
    const v = view({ status: 'degraded' });
    render(<NaviDock conv={v} />);
    fireEvent.click(screen.getByRole('button', { name: /tentar de novo/i }));
    expect(v.retry).toHaveBeenCalled();
  });
});
