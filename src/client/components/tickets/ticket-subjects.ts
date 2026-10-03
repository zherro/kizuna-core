/** Assuntos comuns do formulário de chamado/contato. "Outros" abre um campo livre. */
export const OTHER_SUBJECT = 'Outros';

export const TICKET_SUBJECTS = [
  'Dúvida sobre a plataforma',
  'Problema ao usar o site',
  'Problema com meu anúncio',
  'Denunciar anúncio ou conteúdo',
  'Conta e acesso',
  'Sugestão ou elogio',
  'Parceria e divulgação',
  OTHER_SUBJECT,
] as const;

export const TICKET_SUBJECT_OPTIONS = TICKET_SUBJECTS.map((subject) => ({
  value: subject,
  label: subject,
}));
