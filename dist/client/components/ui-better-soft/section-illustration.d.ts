import { type AvatarCharacter, type AccessorySpec } from './avatars/avatar';
export type IllustrationScene = {
    message: string;
    character: AvatarCharacter;
    accessories?: AccessorySpec[];
};
/**
 * Cenas conhecidas por chave, para reuso rapido em paginas do painel
 * (`<SectionIllustration sceneKey="meus-servicos" />`). Novas paginas podem
 * tanto registrar uma cena aqui quanto passar `scene` diretamente.
 */
export declare const PANEL_ILLUSTRATION_SCENES: {
    'meus-servicos': {
        message: string;
        character: "dog";
        accessories: ({
            key: "wrench";
            x: number;
            y: number;
            scale?: undefined;
        } | {
            key: "sparkle";
            x: number;
            y: number;
            scale: number;
        })[];
    };
    'meus-servicos-grupo': {
        message: string;
        character: "technician";
        accessories: {
            key: "magnifier";
            x: number;
            y: number;
        }[];
    };
    'meus-servicos-categoria': {
        message: string;
        character: "technician";
        accessories: {
            key: "clipboard";
            x: number;
            y: number;
        }[];
    };
    'meus-servicos-subcategoria': {
        message: string;
        character: "technician";
        accessories: {
            key: "checklist";
            x: number;
            y: number;
        }[];
    };
    'meus-servicos-titulo': {
        message: string;
        character: "technician";
        accessories: {
            key: "sparkle";
            x: number;
            y: number;
            scale: number;
        }[];
    };
    'meus-servicos-revisao': {
        message: string;
        character: "dog";
        accessories: {
            key: "star";
            x: number;
            y: number;
        }[];
    };
};
export type PanelIllustrationKey = keyof typeof PANEL_ILLUSTRATION_SCENES;
type SectionIllustrationProps = {
    scene?: IllustrationScene;
    sceneKey?: PanelIllustrationKey;
    className?: string;
};
/**
 * Balao de mensagem + mascote animado, usado no topo de paginas do painel
 * para dar contexto/boas-vindas. Generico: aceita uma cena inline (`scene`)
 * ou uma chave registrada em `PANEL_ILLUSTRATION_SCENES` (`sceneKey`).
 */
export declare function SectionIllustration({ scene, sceneKey, className, }: Readonly<SectionIllustrationProps>): import("react/jsx-runtime").JSX.Element | null;
export {};
//# sourceMappingURL=section-illustration.d.ts.map