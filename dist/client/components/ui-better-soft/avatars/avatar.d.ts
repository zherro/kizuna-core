import { type AccessorySpec } from './accessories';
export type AvatarCharacter = 'girl' | 'boy' | 'technician' | 'old-man' | 'old-lady' | 'dog' | 'cat';
export interface MascotAvatarProps {
    character?: AvatarCharacter;
    /** Largura em px, altura se adapta pela viewBox. */
    width?: number;
    className?: string;
    /**
     * Complemento(s) opcionais renderizados junto do personagem. Aceita:
     * - uma chave (ex: "clipboard")
     * - um objeto { key, x, y, scale, color }
     * - um no React solto
     * - ou um array combinando qualquer um dos acima.
     */
    accessories?: AccessorySpec | AccessorySpec[];
    /** Alternativa livre a `accessories` — renderizado no mesmo espaco. */
    children?: React.ReactNode;
}
export declare function MascotAvatar({ character, width, className, accessories, children, }: Readonly<MascotAvatarProps>): import("react/jsx-runtime").JSX.Element;
export * from './accessories';
//# sourceMappingURL=avatar.d.ts.map