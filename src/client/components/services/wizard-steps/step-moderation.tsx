'use client';

import { DynamicStepForm } from '../../dynamic-step-form';
import { useAppPreferences } from '../../../providers/app-preferences-provider';
import type { WizardMessages } from '@/i18n/messages';
import type { ResourceScreenField } from '../../../../types';
import type { WizardStepProps } from '../../wizard/types';
import type { ServiceWizardState } from '../service-type';

function buildFields(t: WizardMessages['moderation']): ResourceScreenField[] {
  const reasons = t.reasons;
  return [
    {
      name: 'decision',
      label: t.decision,
      type: 'select',
      options: [
        { value: 'approved', label: t.approve },
        { value: 'rejected', label: t.reject },
        { value: 'escalated', label: t.escalate },
      ],
    },
    {
      name: 'rejectionReason',
      label: t.reasonLabel,
      type: 'select',
      // Matches the ad_reviews / service_moderations rejection CHECK constraint.
      options: (Object.keys(reasons) as Array<keyof typeof reasons>).map((value) => ({
        value,
        label: reasons[value],
      })),
      required: false,
    },
    {
      name: 'decisionNote',
      label: t.noteLabel,
      type: 'textarea',
      placeholder: t.notePlaceholder,
      required: false,
      maxLength: 1000,
    },
  ];
}

/**
 * Passo só de `mode === 'review'` (o engine decide `mode`; o gate de permissão fica na página).
 * Config-driven via `DynamicStepForm`. O `persist` do registry chama `moderateService(...)`.
 * "Motivo da rejeicao" sempre renderiza (o engine não tem campo condicional); só vai pro RPC
 * quando `decision === 'rejected'`.
 */
export function StepModeration({ state, patch }: WizardStepProps<ServiceWizardState>) {
  const { messages } = useAppPreferences();
  const t = messages.wizard.moderation;
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-foreground">{t.title}</h2>
        <p className="text-sm text-muted-foreground">{t.subtitle}</p>
      </div>

      <DynamicStepForm
        fields={buildFields(t)}
        values={{
          decision: state.decision,
          rejectionReason: state.rejectionReason,
          decisionNote: state.decisionNote,
        }}
        onChange={(name, value) => {
          if (name === 'decision') patch({ decision: String(value) });
          if (name === 'rejectionReason') patch({ rejectionReason: String(value) });
          if (name === 'decisionNote') patch({ decisionNote: String(value) });
        }}
      />
    </div>
  );
}
