import { cn } from '../../../lib/utils';

type DividerProps = {
  /** Largura em porcentagem (1–100). Default: 100 */
  width?: number;
  /** Margem vertical (py). Default: 2 (0.5rem) */
  my?: number;
  /** Padding horizontal (px). Default: 0 */
  px?: number;
  /** Oculta a linha, mantendo apenas o espaçamento. Default: false */
  invisible?: boolean;
  className?: string;
};

export function Divider({
  width = 100,
  my = 2,
  px = 0,
  invisible = false,
  className,
}: DividerProps) {
  return (
    <div
      className={cn('flex justify-center', className)}
      style={{
        paddingTop: `${my * 0.25}rem`,
        paddingBottom: `${my * 0.25}rem`,
        paddingLeft: px ? `${px * 0.25}rem` : undefined,
        paddingRight: px ? `${px * 0.25}rem` : undefined,
      }}
    >
      <hr
        className={cn('border-t', invisible ? 'border-none' : 'border-border')}
        style={{ width: `${Math.min(100, Math.max(1, width))}%` }}
      />
    </div>
  );
}
