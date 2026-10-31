import * as React from 'react';
export interface AccessoryProps {
    /** Deslocamento horizontal a partir do centro do personagem. */
    x?: number;
    /** Deslocamento vertical a partir do centro do personagem. */
    y?: number;
    /** Escala uniforme, default 1. */
    scale?: number;
    /** Cor principal (default: token --primary). */
    color?: string;
}
export declare function Clipboard(props: AccessoryProps): import("react/jsx-runtime").JSX.Element;
export declare function Phone(props: AccessoryProps): import("react/jsx-runtime").JSX.Element;
export declare function ChatBubble(props: AccessoryProps): import("react/jsx-runtime").JSX.Element;
export declare function Envelope(props: AccessoryProps): import("react/jsx-runtime").JSX.Element;
export declare function EnvelopeCheck(props: AccessoryProps): import("react/jsx-runtime").JSX.Element;
export declare function EnvelopeAlert(props: AccessoryProps): import("react/jsx-runtime").JSX.Element;
export declare function Calendar(props: AccessoryProps): import("react/jsx-runtime").JSX.Element;
export declare function ProfileCard(props: AccessoryProps): import("react/jsx-runtime").JSX.Element;
export declare function Megaphone(props: AccessoryProps): import("react/jsx-runtime").JSX.Element;
export declare function Heart(props: AccessoryProps): import("react/jsx-runtime").JSX.Element;
export declare function Magnifier(props: AccessoryProps): import("react/jsx-runtime").JSX.Element;
export declare function Wrench(props: AccessoryProps): import("react/jsx-runtime").JSX.Element;
export declare function Checklist(props: AccessoryProps): import("react/jsx-runtime").JSX.Element;
export declare function ShoppingBag(props: AccessoryProps): import("react/jsx-runtime").JSX.Element;
export declare function Star(props: AccessoryProps): import("react/jsx-runtime").JSX.Element;
export declare function Bone(props: AccessoryProps): import("react/jsx-runtime").JSX.Element;
export declare function Sparkle(props: AccessoryProps): import("react/jsx-runtime").JSX.Element;
export type AccessoryKey = 'clipboard' | 'phone' | 'chat' | 'envelope' | 'envelope-check' | 'envelope-alert' | 'calendar' | 'profile-card' | 'megaphone' | 'heart' | 'magnifier' | 'wrench' | 'checklist' | 'shopping-bag' | 'star' | 'bone' | 'sparkle';
export type AccessorySpec = AccessoryKey | ({
    key: AccessoryKey;
} & AccessoryProps) | React.ReactNode;
/** Renderiza uma lista de acessorios (chaves, specs ou nos React soltos). */
export declare function Accessories({ items }: {
    items?: AccessorySpec | AccessorySpec[];
}): import("react/jsx-runtime").JSX.Element | null;
//# sourceMappingURL=accessories.d.ts.map