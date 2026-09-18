export type AddressValue = {
    postalCode: string;
    street: string;
    number: string;
    complement: string;
    neighborhood: string;
    city: string;
    state: string;
    country: string;
    latitude: number | null;
    longitude: number | null;
    placeId: string | null;
    formattedAddress: string | null;
};
export type AddressFeatureFlags = {
    /**
     * Exibe o botão "Pesquisar localização".
     */
    search: boolean;
    /**
     * Permite pesquisar endereço dentro do drawer.
     */
    modalSearch: boolean;
    /**
     * Exibe opção para selecionar localização.
     *
     * Reservado para implementação de seleção por mapa/GPS.
     */
    locationSelection: boolean;
    /**
     * Exibe mini mapa.
     *
     * IMPORTANTE:
     * O mapa real pode gerar custo e precisa de uma estratégia
     * própria de carregamento.
     */
    map: boolean;
};
type AddressFormProps = {
    value?: Partial<AddressValue>;
    onChange?: (value: AddressValue) => void;
    features?: Partial<AddressFeatureFlags>;
    disabled?: boolean;
    className?: string;
    /**
     * `'compact'` shows only the CEP field inline; once it resolves (or the user picks a result
     * from search), the rest collapses into a one-line summary + "Editar" button that opens the
     * full field set in an overlay. Cuts how much of the step the address takes up. Defaults to
     * `'full'` (every field inline, current behaviour).
     */
    layout?: 'full' | 'compact';
    /** Label for the search trigger. Defaults to "Pesquisar localização". */
    searchLabel?: string;
};
export declare function AddressForm({ value, onChange, features: featureOverrides, disabled, className, layout, searchLabel, }: AddressFormProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=address-google-form.d.ts.map