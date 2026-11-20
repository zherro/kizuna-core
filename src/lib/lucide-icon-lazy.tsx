'use client';

import { forwardRef, lazy, Suspense, useMemo, type ReactNode } from 'react';
import type { LucideProps } from 'lucide-react';

type LazyLucideIconProps = LucideProps & {
  /** lucide export name ("MapPin") or kebab name ("map-pin"). */
  name: string;
  /** Rendered when lucide has no icon by that name. */
  fallback?: ReactNode;
};

type ResolvedProps = Omit<LazyLucideIconProps, 'ref'> & { svgRef?: React.Ref<SVGSVGElement> };

/** "building-2" → "Building2", "grid-2x2" → "Grid2x2" (same rule lucide uses for export names). */
function toPascalCase(kebab: string): string {
  const camel = kebab.replace(/[-_\s]+(\w)/g, (_, c: string) => c.toUpperCase());
  return camel.charAt(0).toUpperCase() + camel.slice(1);
}

/**
 * Empty `<svg>` with the icon's box. Uses attributes (not inline style) for the default 24px so
 * a sizing class such as `h-4 w-4` wins exactly as it does on a real lucide icon.
 */
function IconBox({ className, size, width, height, style }: Pick<LucideProps, 'className' | 'size' | 'width' | 'height' | 'style'>) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      width={width ?? size ?? 24}
      height={height ?? size ?? 24}
      style={style}
    />
  );
}

/**
 * The on-demand path: `lucide-react/dynamic` (name list + one chunk per icon) is only fetched the
 * first time a name outside `KNOWN_ICONS` is rendered, so it never weighs on pages whose icons
 * are all known.
 */
const Resolved = lazy(async () => {
  const { DynamicIcon, iconNames } = await import('lucide-react/dynamic');
  const kebabByName = new Map<string, string>();
  for (const kebab of iconNames) {
    kebabByName.set(kebab, kebab);
    if (!kebabByName.has(toPascalCase(kebab))) kebabByName.set(toPascalCase(kebab), kebab);
  }

  function ResolvedLucideIcon({ name, fallback, svgRef, ...props }: ResolvedProps) {
    const kebab = kebabByName.get(name);
    const { className, size, width, height, style } = props;
    // Same box as the icon while its chunk loads, so nothing shifts when it appears.
    const Placeholder = useMemo(
      () =>
        function IconPlaceholder() {
          return <IconBox className={className} size={size} width={width} height={height} style={style} />;
        },
      [className, size, width, height, style],
    );
    if (!kebab) return <>{fallback ?? null}</>;
    return (
      <DynamicIcon
        {...props}
        ref={svgRef}
        name={kebab as Parameters<typeof DynamicIcon>[0]['name']}
        fallback={Placeholder}
      />
    );
  }

  return { default: ResolvedLucideIcon };
});

/** Lucide icon resolved by name at runtime. Use through `resolveLucideIcon`, not directly. */
export const LazyLucideIcon = forwardRef<SVGSVGElement, LazyLucideIconProps>(function LazyLucideIcon(
  { name, fallback, ...props },
  ref,
) {
  const { className, size, width, height, style } = props;
  return (
    <Suspense
      fallback={<IconBox className={className} size={size} width={width} height={height} style={style} />}
    >
      <Resolved {...props} svgRef={ref} name={name} fallback={fallback} />
    </Suspense>
  );
});
