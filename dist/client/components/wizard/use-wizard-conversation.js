'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { applyAssistPatch } from './apply-assist-patch';
const ADVANCE = '__advance__';
/**
 * Dona do fio da Naví conversacional. Trata UM passo por vez: anexa turnos, chama o adapter,
 * aplica o patch (só campos vazios/intocados). **Nunca avança sozinha** — quando a Naví julga o
 * passo pronto (`advance: 'ask'`) ela só oferece a tag **"Pode seguir"**; o avanço acontece por
 * ela OU pelo botão "Continuar"/"Avançar" do rodapé (habilitado por `canContinue`). Sempre que o
 * passo muda pra frente, a Naví abre a 1ª pergunta do novo (`confirm-advance`).
 */
export function useWizardConversation(opts) {
    const { adapter, steps, currentIndex, ctx, goContinue, submitting, canContinue, isLastStep } = opts;
    const [turns, setTurns] = useState([]);
    const [choices, setChoices] = useState([]);
    const [pending, setPending] = useState(false);
    const [minimized, setMinimized] = useState(false);
    const [panelOpen, setPanelOpen] = useState(false);
    const turnsRef = useRef([]);
    turnsRef.current = turns;
    const ctxRef = useRef(ctx);
    ctxRef.current = ctx;
    const canContinueRef = useRef(canContinue);
    canContinueRef.current = canContinue;
    const isLastStepRef = useRef(isLastStep);
    isLastStepRef.current = isLastStep;
    const prevIndexRef = useRef(currentIndex);
    /** true enquanto um `confirm-advance` está sendo disparado (evita duplo turno) */
    const confirmingRef = useRef(false);
    /** sempre o `currentIndex` mais recente — o loop de confirm-advance relê isto ao terminar */
    const latestIndexRef = useRef(currentIndex);
    latestIndexRef.current = currentIndex;
    const status = adapter?.status ?? 'unavailable';
    const active = Boolean(adapter) && status !== 'unavailable';
    const stepKeyAt = useCallback((i) => steps[i]?.key ?? '', [steps]);
    const converseTurn = useCallback(async (userText, intent, stepKey) => {
        if (!adapter)
            return;
        const history = turnsRef.current;
        if (intent === 'reply') {
            setTurns((t) => [...t, { role: 'user', content: userText }]);
        }
        setPending(true);
        try {
            const res = await adapter.converse({
                userText,
                turns: history,
                state: ctxRef.current.state,
                stepKey,
                intent,
            });
            setTurns((t) => [...t, { role: 'assistant', content: res.message }]);
            const base = res.choices ?? [];
            // Naví diz que o passo está pronto → oferece "Pode seguir" (não avança sozinha).
            setChoices(res.advance === 'ask' && !isLastStepRef.current
                ? [...base, { label: 'Pode seguir', value: ADVANCE, advance: true }]
                : base);
            const c = ctxRef.current;
            const filtered = applyAssistPatch(res.patch, c.state, c.touched);
            if (Object.keys(filtered).length > 0)
                c.patch(filtered);
        }
        catch {
            // o adapter já reportou a degradação; sem turno do assistente
            setChoices([]);
        }
        finally {
            setPending(false);
        }
    }, [adapter]);
    const send = useCallback((userText) => converseTurn(userText, 'reply', stepKeyAt(currentIndex)), [converseTurn, stepKeyAt, currentIndex]);
    const pickChoice = useCallback((choice) => {
        if ((choice.value ?? choice.label) === ADVANCE) {
            void goContinue();
            return;
        }
        void send(choice.value ?? choice.label);
    }, [goContinue, send]);
    // Dispara (e, se o passo mudar de novo enquanto a resposta ainda não voltou, RE-dispara pro
    // índice mais recente ao terminar) — sem isto, um avanço rápido (auto-reveal com vários passos
    // já válidos, ex. Naví minimizada) deixava o turno de confirm-advance de um passo intermediário
    // "preso": o efeito abaixo pulava esses índices por causa do `confirmingRef` e o dock ficava
    // mostrando a fala de um passo antigo (ex. ainda falando de título já em "categoria").
    const runConfirmAdvance = useCallback(async () => {
        confirmingRef.current = true;
        try {
            let index = latestIndexRef.current;
            for (;;) {
                const key = stepKeyAt(index);
                if (!key)
                    break;
                await converseTurn('', 'confirm-advance', key);
                if (latestIndexRef.current === index)
                    break;
                index = latestIndexRef.current;
            }
        }
        finally {
            confirmingRef.current = false;
        }
    }, [converseTurn, stepKeyAt]);
    // Passo avançou (pela tag "Pode seguir" OU pelo botão do rodapé) → a Naví abre a 1ª pergunta
    // do passo novo. Só pra frente; `goBack` / jump pra trás não dispara.
    useEffect(() => {
        const prev = prevIndexRef.current;
        prevIndexRef.current = currentIndex;
        if (!active || submitting)
            return;
        if (currentIndex <= prev)
            return;
        // Só "acompanha" o avanço se a pessoa já está conversando — se ela está só clicando
        // "Avançar" no rodapé sem falar com a Naví, a Naví não se intromete.
        if (turnsRef.current.length === 0)
            return;
        // já tem um confirm-advance em voo — ele mesmo relê `latestIndexRef` ao terminar.
        if (confirmingRef.current)
            return;
        void runConfirmAdvance();
    }, [currentIndex, active, submitting, runConfirmAdvance]);
    return useMemo(() => ({
        active,
        endedMidway: Boolean(adapter) && status === 'unavailable' && turns.length > 0,
        status,
        turns,
        choices,
        pending,
        minimized,
        setMinimized,
        panelOpen,
        setPanelOpen,
        fresh: turns.length === 0,
        greeting: adapter?.greeting ?? '',
        send,
        pickChoice,
        retry: adapter?.retry,
    }), [active, status, turns, choices, pending, minimized, panelOpen, adapter, send, pickChoice]);
}
//# sourceMappingURL=use-wizard-conversation.js.map