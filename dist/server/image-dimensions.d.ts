/**
 * Leitura das dimensões (largura × altura) de uma imagem direto do cabeçalho do arquivo.
 *
 * Puro, síncrono, zero dependência — parseia só os bytes iniciais de PNG / JPEG / GIF / WebP.
 * Serve pro fluxo de upload gravar `files.width` / `files.height` sem carregar `sharp`.
 * Formato desconhecido ou cabeçalho truncado → `null` (o upload nunca quebra por causa disso).
 */
export type ImageDimensions = {
    width: number;
    height: number;
};
/**
 * Tenta ler as dimensões de `buffer`. `mimeType` só reordena as tentativas — o parse real
 * decide pela assinatura de bytes, então um mime errado não engana o resultado.
 */
export declare function readImageDimensions(buffer: Buffer, mimeType?: string | null): ImageDimensions | null;
//# sourceMappingURL=image-dimensions.d.ts.map