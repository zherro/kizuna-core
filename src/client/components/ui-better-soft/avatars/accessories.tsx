import * as React from 'react';

/**
 * Acessorios reutilizaveis que se encaixam dentro de qualquer <Avatar />.
 *
 * Todos sao renderizados no mesmo espaco de coordenadas do personagem
 * (origem no centro do corpo, translate(80 60) ja aplicado pelo Avatar).
 * Cada acessorio aceita posicao (x, y), escala e cor opcional, para que
 * de pra empilhar/combinar varios no mesmo personagem sem colisao.
 */

const PRIMARY = 'var(--primary)';
const BG = 'var(--background)';

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

function A({ x = 0, y = 0, scale = 1, children }: AccessoryProps & { children: React.ReactNode }) {
  return <g transform={`translate(${x} ${y}) scale(${scale})`}>{children}</g>;
}

/* ============ Acessorios individuais ============ */

export function Clipboard(props: AccessoryProps) {
  const c = props.color ?? PRIMARY;
  return (
    <A {...props}>
      <rect x="-13" y="-16" width="26" height="32" rx="3" fill={BG} stroke={c} strokeWidth="2" />
      <rect x="-9" y="-10" width="18" height="3" rx="1.5" fill={c} />
      <rect x="-9" y="-3" width="14" height="3" rx="1.5" fill={c} opacity="0.6" />
      <rect x="-9" y="4" width="16" height="3" rx="1.5" fill={c} opacity="0.6" />
      <rect x="-5" y="-19" width="10" height="5" rx="1.5" fill={c} />
    </A>
  );
}

export function Phone(props: AccessoryProps) {
  const c = props.color ?? PRIMARY;
  return (
    <A {...props}>
      <rect x="-10" y="-17" width="20" height="34" rx="4" fill={BG} stroke={c} strokeWidth="2" />
      <rect x="-6" y="-12" width="12" height="3" rx="1.5" fill={c} />
      <rect x="-6" y="-6" width="8" height="3" rx="1.5" fill={c} opacity="0.6" />
      <circle cx="0" cy="12" r="2" fill={c} />
    </A>
  );
}

export function ChatBubble(props: AccessoryProps) {
  const c = props.color ?? PRIMARY;
  return (
    <A {...props}>
      <rect x="-17" y="-10" width="34" height="20" rx="10" fill={c} />
      <circle cx="-7" cy="0" r="2" fill={BG} />
      <circle cx="0" cy="0" r="2" fill={BG} />
      <circle cx="7" cy="0" r="2" fill={BG} />
    </A>
  );
}

export function Envelope(props: AccessoryProps) {
  const c = props.color ?? PRIMARY;
  return (
    <A {...props}>
      <rect x="-15" y="-11" width="30" height="22" rx="3" fill={BG} stroke={c} strokeWidth="2" />
      <path d="M -15 -11 L 0 3 L 15 -11" stroke={c} strokeWidth="2" fill="none" />
    </A>
  );
}

export function EnvelopeCheck(props: AccessoryProps) {
  const c = props.color ?? PRIMARY;
  return (
    <A {...props}>
      <Envelope color={c} />
      <circle cx="13" cy="-13" r="7" fill={c} />
      <path
        d="M 10 -13 L 12 -11 L 16 -15"
        stroke={BG}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </A>
  );
}

export function EnvelopeAlert(props: AccessoryProps) {
  const c = props.color ?? PRIMARY;
  return (
    <A {...props}>
      <Envelope color={c} />
      <circle cx="15" cy="-13" r="7" fill={c} />
      <text x="15" y="-9" textAnchor="middle" fontSize="10" fontWeight="800" fill={BG}>
        !
      </text>
    </A>
  );
}

export function Calendar(props: AccessoryProps) {
  const c = props.color ?? PRIMARY;
  return (
    <A {...props}>
      <rect x="-15" y="-15" width="30" height="30" rx="4" fill={BG} stroke={c} strokeWidth="2" />
      <rect x="-15" y="-15" width="30" height="8" rx="4" fill={c} />
      <circle cx="-7" cy="3" r="2" fill={c} />
      <circle cx="0" cy="3" r="2" fill={c} opacity="0.5" />
      <circle cx="7" cy="3" r="2" fill={c} opacity="0.5" />
      <circle cx="-7" cy="10" r="2" fill={c} opacity="0.5" />
      <circle cx="0" cy="10" r="2" fill={c} />
      <circle cx="7" cy="10" r="2" fill={c} opacity="0.5" />
    </A>
  );
}

export function ProfileCard(props: AccessoryProps) {
  const c = props.color ?? PRIMARY;
  return (
    <A {...props}>
      <rect x="-12" y="-15" width="24" height="30" rx="3" fill={BG} stroke={c} strokeWidth="2" />
      <circle cx="0" cy="-5" r="5" fill={c} opacity="0.4" />
      <rect x="-8" y="3" width="16" height="3" rx="1.5" fill={c} />
      <rect x="-6" y="9" width="12" height="2.5" rx="1.2" fill={c} opacity="0.6" />
    </A>
  );
}

export function Megaphone(props: AccessoryProps) {
  const c = props.color ?? PRIMARY;
  return (
    <A {...props}>
      <path d="M -16 -6 L 4 -16 L 4 8 L -16 -2 Z" fill={c} />
      <rect x="-20" y="-6" width="6" height="8" rx="2" fill={c} opacity="0.7" />
      <path
        d="M 8 -14 L 14 -18 M 8 -4 L 16 -4 M 8 6 L 14 10"
        stroke={c}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </A>
  );
}

export function Heart(props: AccessoryProps) {
  const c = props.color ?? PRIMARY;
  return (
    <A {...props}>
      <path
        d="M 0 14 s -18 -10 -18 -22 c 0 -8 10 -12 18 -2 c 8 -10 18 -6 18 2 c 0 12 -18 22 -18 22 z"
        fill={c}
      />
    </A>
  );
}

export function Magnifier(props: AccessoryProps) {
  const c = props.color ?? PRIMARY;
  return (
    <A {...props}>
      <circle cx="-4" cy="-8" r="12" fill={BG} stroke={c} strokeWidth="3" />
      <path d="M 5 1 L 14 10" stroke={c} strokeWidth="4" strokeLinecap="round" />
      <path
        d="M -8 -8 L -4 -4 L 2 -12"
        stroke={c}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </A>
  );
}

export function Wrench(props: AccessoryProps) {
  const c = props.color ?? PRIMARY;
  return (
    <A {...props}>
      <path
        d="M -16 14 L 0 -2 M 0 -2 a 8 8 0 1 1 -8 -8 l 4 4 l -2 6 l 6 -2 z"
        stroke={c}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </A>
  );
}

export function Checklist(props: AccessoryProps) {
  const c = props.color ?? PRIMARY;
  return (
    <A {...props}>
      <rect x="-15" y="-17" width="30" height="34" rx="3" fill={BG} stroke={c} strokeWidth="2" />
      {[0, 1, 2].map((i) => (
        <g key={i} transform={`translate(-11 ${-11 + i * 9})`}>
          <rect width="6" height="6" rx="1.5" fill={i < 2 ? c : BG} stroke={c} strokeWidth="1.2" />
          {i < 2 && (
            <path
              d="M 1.5 3 L 2.8 4.4 L 4.5 2.2"
              stroke={BG}
              strokeWidth="1.2"
              fill="none"
              strokeLinecap="round"
            />
          )}
          <rect x="10" y="1" width="16" height="4" rx="1.5" fill={c} opacity="0.6" />
        </g>
      ))}
    </A>
  );
}

export function ShoppingBag(props: AccessoryProps) {
  const c = props.color ?? PRIMARY;
  return (
    <A {...props}>
      <path d="M -14 -8 L 14 -8 L 12 18 Q 12 22 8 22 L -8 22 Q -12 22 -12 18 Z" fill={c} />
      <path d="M -8 -8 Q -8 -16 -1 -16 Q 6 -16 6 -8" stroke={c} strokeWidth="2" fill="none" />
      <path d="M -6 4 L 4 4" stroke={BG} strokeWidth="2" strokeLinecap="round" />
    </A>
  );
}

export function Star(props: AccessoryProps) {
  const c = props.color ?? PRIMARY;
  return (
    <A {...props}>
      <path
        d="M 0 -14 L 4 -4 L 15 -3 L 6 4 L 9 15 L 0 9 L -9 15 L -6 4 L -15 -3 L -4 -4 Z"
        fill={c}
      />
    </A>
  );
}

export function Bone(props: AccessoryProps) {
  const c = props.color ?? '#f5deb3';
  return (
    <A {...props}>
      <rect x="-12" y="-3" width="24" height="6" rx="3" fill={c} stroke="#8b6a2e" strokeWidth="1" />
      <circle cx="-12" cy="-4" r="4" fill={c} stroke="#8b6a2e" strokeWidth="1" />
      <circle cx="-12" cy="4" r="4" fill={c} stroke="#8b6a2e" strokeWidth="1" />
      <circle cx="12" cy="-4" r="4" fill={c} stroke="#8b6a2e" strokeWidth="1" />
      <circle cx="12" cy="4" r="4" fill={c} stroke="#8b6a2e" strokeWidth="1" />
    </A>
  );
}

export function Sparkle(props: AccessoryProps) {
  const c = props.color ?? PRIMARY;
  return (
    <A {...props}>
      <path d="M 0 -8 L 2 -2 L 8 0 L 2 2 L 0 8 L -2 2 L -8 0 L -2 -2 Z" fill={c} />
    </A>
  );
}

/* ============ Registro por chave ============ */

export type AccessoryKey =
  | 'clipboard'
  | 'phone'
  | 'chat'
  | 'envelope'
  | 'envelope-check'
  | 'envelope-alert'
  | 'calendar'
  | 'profile-card'
  | 'megaphone'
  | 'heart'
  | 'magnifier'
  | 'wrench'
  | 'checklist'
  | 'shopping-bag'
  | 'star'
  | 'bone'
  | 'sparkle';

const REGISTRY: Record<AccessoryKey, React.ComponentType<AccessoryProps>> = {
  clipboard: Clipboard,
  phone: Phone,
  chat: ChatBubble,
  envelope: Envelope,
  'envelope-check': EnvelopeCheck,
  'envelope-alert': EnvelopeAlert,
  calendar: Calendar,
  'profile-card': ProfileCard,
  megaphone: Megaphone,
  heart: Heart,
  magnifier: Magnifier,
  wrench: Wrench,
  checklist: Checklist,
  'shopping-bag': ShoppingBag,
  star: Star,
  bone: Bone,
  sparkle: Sparkle,
};

export type AccessorySpec =
  | AccessoryKey
  | ({ key: AccessoryKey } & AccessoryProps)
  | React.ReactNode;

/** Renderiza uma lista de acessorios (chaves, specs ou nos React soltos). */
export function Accessories({ items }: { items?: AccessorySpec | AccessorySpec[] }) {
  if (items == null) return null;
  const list = Array.isArray(items) ? items : [items];
  return (
    <>
      {list.map((item, i) => {
        if (item == null || item === false) return null;
        if (typeof item === 'string') {
          const Cmp = REGISTRY[item as AccessoryKey];
          return Cmp ? <Cmp key={i} /> : null;
        }
        if (
          typeof item === 'object' &&
          item !== null &&
          'key' in (item as object) &&
          typeof (item as { key: unknown }).key === 'string' &&
          (REGISTRY as Record<string, unknown>)[(item as { key: string }).key]
        ) {
          const { key, ...rest } = item as { key: AccessoryKey } & AccessoryProps;
          const Cmp = REGISTRY[key];
          return <Cmp key={i} {...rest} />;
        }
        return <React.Fragment key={i}>{item as React.ReactNode}</React.Fragment>;
      })}
    </>
  );
}
