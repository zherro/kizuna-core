/** Número do chamado mostrado ao usuário (o `id` do banco, com zeros à esquerda): `#000042`. */
export const formatTicketNumber = (id: string | number): string =>
  `#${String(id).padStart(6, '0')}`;

/** Link do detalhe no painel — exige login; o proxy devolve o usuário aqui depois de entrar. */
export const ticketPath = (id: string | number): string => `/painel/chamados/${id}`;
