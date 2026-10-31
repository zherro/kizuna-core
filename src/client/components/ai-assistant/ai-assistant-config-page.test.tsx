// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { AiAssistantConfigPage } from './ai-assistant-config-page';

afterEach(cleanup);

describe('AiAssistantConfigPage', () => {
  it('renderiza select de provedor e um toggle por contexto', () => {
    render(<AiAssistantConfigPage contexts={['search', 'service-wizard']} />);
    expect(screen.getByLabelText(/prov/i)).toBeDefined();
    expect(screen.getByText('search')).toBeDefined();
    expect(screen.getByText('service-wizard')).toBeDefined();
  });

  it('opções openai/claude aparecem desabilitadas', () => {
    render(<AiAssistantConfigPage contexts={[]} />);
    const openai = screen.getByRole('option', { name: /openai/i }) as HTMLOptionElement;
    const claude = screen.getByRole('option', { name: /claude/i }) as HTMLOptionElement;
    expect(openai.disabled).toBe(true);
    expect(claude.disabled).toBe(true);
  });

  it('mostra aviso quando statusConfigured é false', () => {
    render(<AiAssistantConfigPage contexts={[]} statusConfigured={false} />);
    expect(screen.getByRole('alert')).toBeDefined();
  });
});
