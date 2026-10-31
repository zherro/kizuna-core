/** `stripHtml` lives in the core text helper — re-exported here for the step components. */
export { stripHtml } from '../../../lib/helper/text.helper';
export const SERVICE_WIZARD_INITIAL_STATE = {
    title: '',
    groupId: '',
    categoryId: '',
    subcategoryIds: [],
    description: '',
    serviceLocation: '',
    startingPrice: 0,
    priceUnit: 'quote',
    imageIds: [],
    decision: '',
    rejectionReason: '',
    decisionNote: '',
    dynamicFormValid: true,
};
/** Enum display labels moved to `./service-labels`; re-exported for back-compat. */
export { SERVICE_STATUS_LABEL, SERVICE_LOCATION_LABEL, PRICE_UNIT_LABEL, } from './service-labels';
/** Curated subset of `price_unit` shown in the service wizard — the SAME list for every group and
 * category. O enum no banco continua com o conjunto completo; aqui ficam só as opções do nicho de
 * eventos, com rótulo/《ajuda》na linguagem do nicho. */
export const SERVICE_PRICE_UNIT_OPTIONS = [
    { value: 'day', label: 'Por diária', hint: 'Locação por dia — espaço, mesas, tenda, som' },
    {
        value: 'service',
        label: 'Por apresentação / evento',
        hint: 'Cachê fechado do show ou do serviço',
    },
    { value: 'hour', label: 'Por hora', hint: 'Ex.: 2h de show, hora de DJ' },
    { value: 'unit', label: 'Por pessoa / unidade', hint: 'Ex.: buffet por convidado' },
    { value: 'quote', label: 'Sob orçamento', hint: 'Você combina o valor no chat' },
];
/** Unidade de preço pré-selecionada conforme a categoria escolhida. É só um empurrão de UX — o
 * usuário sempre pode trocar. Cai em 'quote' pra qualquer slug novo. */
export function defaultPriceUnitForCategory(categorySlug) {
    switch (categorySlug) {
        case 'espacos-para-festas':
        case 'mesas-cadeiras-e-estrutura':
        case 'som-e-iluminacao':
            return 'day';
        case 'buffet-e-alimentacao':
            return 'unit';
        case 'musica-e-animacao':
            return 'service';
        default:
            return 'quote';
    }
}
/** `extras`/`ServiceRecord` helpers moved to `./service-helpers`; re-exported for back-compat. */
export { fileUrl, coverImage, formatServicePrice } from './service-helpers';
//# sourceMappingURL=service-type.js.map