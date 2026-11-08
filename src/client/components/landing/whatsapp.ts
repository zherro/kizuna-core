/**
 * Link `wa.me` com mensagem pronta. `number` aceita qualquer formato ("(65) 99999-0000",
 * "+55 65 99999-0000"); só os dígitos entram. Sem número, devolve `https://wa.me/?text=…`
 * (o WhatsApp abre a escolha de contato), em vez de um link quebrado.
 */
export function whatsappLink(number: string | null | undefined, message: string): string {
  const digits = (number ?? '').replace(/\D/g, '');
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
