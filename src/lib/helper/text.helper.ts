const textWrap = (texto: string, limite: number) => {
  if (texto == null || texto.length <= limite) {
    return texto;
  }

  const trecho = texto.substring(0, limite);
  const ultimoEspaco = trecho.lastIndexOf(' ');

  if (ultimoEspaco > limite * 0.4) {
    return trecho.substring(0, ultimoEspaco) + '...';
  }

  return trecho + '...';
};

export { textWrap };
