type ApiErrorRule = {
  test: (normalizedMessage: string) => boolean;
  message: string;
};

const apiErrorRules: ApiErrorRule[] = [
  {
    test: (text) =>
      text.includes('duplicate key value violates unique constraint') && text.includes('slug'),
    message: 'Ja existe um registro com mesmo slug. Use outro nome.',
  },
  {
    test: (text) => text.includes('duplicate key value violates unique constraint'),
    message: 'Ja existe um registro com os mesmos dados unicos.',
  },
];

/**
 * Maps technical API/database messages to user-friendly pt-BR messages.
 * Falls back to the original message when no rule matches.
 */
export function translateApiErrorMessage(rawMessage: string | undefined, fallbackMessage: string) {
  const message = (rawMessage ?? '').trim();
  if (!message) return fallbackMessage;

  const normalizedMessage = message.toLowerCase();
  const matchedRule = apiErrorRules.find((rule) => rule.test(normalizedMessage));
  if (matchedRule) return matchedRule.message;

  return message;
}
