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
};
export declare function AddressForm({ value, onChange, features: featureOverrides, disabled, className, }: AddressFormProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=address-google-form.d.ts.map