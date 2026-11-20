import { createElement, forwardRef } from 'react';
import {
  Activity, Armchair, Baby, BedDouble, Beer, Bike, Binoculars, Bird, Blocks, BookOpen, Brain,
  Briefcase, Brush, Bug, Building2, Calculator, CalendarDays, Camera, Car, Church, Clapperboard,
  Clock, CloudSun, Code, Coffee, Compass, Disc3, Dog, Drama, Droplets, Dumbbell, FileText, Film,
  Fish, Flower2, Footprints, Frame, Gem, Globe, Goal, GraduationCap, Hammer, HandHeart, Headset,
  Heart, HeartPulse, HelpCircle, Home, Hotel, House, IceCreamCone, Info, Landmark, Languages,
  Laptop, LayoutPanelTop, Laugh, Leaf, Library, Lightbulb, Map as MapIcon, MapPin, MapPinned,
  Martini, Megaphone, Monitor, Moon, Mountain, MountainSnow, Music, Music2, Newspaper, PaintRoller,
  Palette, PartyPopper, PawPrint, PenLine, PersonStanding, Presentation, Route, Sailboat, Sandwich,
  Scale, Scissors, Shirt, ShoppingBag, ShoppingCart, Smartphone, Sparkles, Speaker, SprayCan,
  Sprout, Stethoscope, Store, Sun, Tags, Tent, ThumbsUp, Ticket, Trees, Trophy, Truck, Umbrella,
  User, Users, Utensils, UtensilsCrossed, Vote, Waves, Wifi, Wind, Wrench, Zap,
  type LucideIcon,
  type LucideProps,
} from 'lucide-react';
import { LazyLucideIcon } from './lucide-icon-lazy';

/**
 * Icons rendered synchronously (and server-side) by name. This list is the union of every icon
 * stored in categories / categories_group of the Bora (kizuna-starter) and Alô Serviço
 * (foco-total) databases and seeds, plus the names used in kizuna.config.json (reactions,
 * service location) and the components' own defaults.
 *
 * Every name here must exist in the OLDEST lucide-react among the consumer projects (Alô is on
 * 1.16) — a missing named export breaks that project's build. Names that are not here still
 * work: they load on demand through `lucide-react/dynamic` (see `LazyLucideIcon`), so an admin
 * typing a new icon never breaks the page; adding it here only removes the async load.
 */
const KNOWN_ICONS: Record<string, LucideIcon> = {
  Activity, Armchair, Baby, BedDouble, Beer, Bike, Binoculars, Bird, Blocks, BookOpen, Brain,
  Briefcase, Brush, Bug, Building2, Calculator, CalendarDays, Camera, Car, Church, Clapperboard,
  Clock, CloudSun, Code, Coffee, Compass, Disc3, Dog, Drama, Droplets, Dumbbell, FileText, Film,
  Fish, Flower2, Footprints, Frame, Gem, Globe, Goal, GraduationCap, Hammer, HandHeart, Headset,
  Heart, HeartPulse, HelpCircle, Home, Hotel, House, IceCreamCone, Info, Landmark, Languages,
  Laptop, LayoutPanelTop, Laugh, Leaf, Library, Lightbulb, Map: MapIcon, MapPin, MapPinned,
  Martini, Megaphone, Monitor, Moon, Mountain, MountainSnow, Music, Music2, Newspaper, PaintRoller,
  Palette, PartyPopper, PawPrint, PenLine, PersonStanding, Presentation, Route, Sailboat, Sandwich,
  Scale, Scissors, Shirt, ShoppingBag, ShoppingCart, Smartphone, Sparkles, Speaker, SprayCan,
  Sprout, Stethoscope, Store, Sun, Tags, Tent, ThumbsUp, Ticket, Trees, Trophy, Truck, Umbrella,
  User, Users, Utensils, UtensilsCrossed, Vote, Waves, Wifi, Wind, Wrench, Zap,
};

/** Looks like a lucide export name ("Building2", "MapPin") or kebab name ("map-pin"). */
const ICON_NAME = /^(?:[A-Z][A-Za-z0-9]*|[a-z][a-z0-9]*(?:-[a-z0-9]+)*)$/;

/** Accepts the other spellings lucide-react exports: `LucideHome`, `HomeIcon`. */
function normalizeIconName(raw: string): string {
  let name = raw.trim();
  if (/^Lucide[A-Z]/.test(name)) name = name.slice('Lucide'.length);
  if (/[a-z0-9]Icon$/.test(name)) name = name.slice(0, -'Icon'.length);
  return name;
}

const lazyCache = new Map<LucideIcon | null, Map<string, LucideIcon>>();

/** Component bound to `name`, loaded on demand; renders `fallback` if lucide has no such icon. */
function lazyIcon(name: string, fallback: LucideIcon | null): LucideIcon {
  let byName = lazyCache.get(fallback);
  if (!byName) {
    byName = new Map();
    lazyCache.set(fallback, byName);
  }
  let icon = byName.get(name);
  if (!icon) {
    const Fallback = fallback;
    icon = forwardRef<SVGSVGElement, LucideProps>(function LazyNamedIcon(props, ref) {
      return createElement(LazyLucideIcon, {
        ...props,
        ...(ref ? { ref } : null),
        name,
        // An element, not a component: this may render in a Server Component and functions
        // cannot cross into the client component.
        fallback: Fallback ? createElement(Fallback, props) : null,
      });
    }) as LucideIcon;
    icon.displayName = `LazyLucideIcon(${name})`;
    byName.set(name, icon);
  }
  return icon;
}

/**
 * Resolves an icon persisted in the database (lucide-react export name, e.g. "Home") into its
 * component. Used for admin-editable icons on categories/categories_group, since the name is
 * free text typed by an admin.
 *
 * Known names (`KNOWN_ICONS`) resolve to the real component synchronously. Any other plausible
 * name resolves to a component that loads the icon on demand and renders `fallback` (or
 * nothing) when lucide has no icon by that name. Empty or malformed names return `fallback`
 * (or `null`). Never imports the whole lucide-react package.
 */
export function resolveLucideIcon(name: string | null | undefined): LucideIcon | null;
export function resolveLucideIcon(name: string | null | undefined, fallback: LucideIcon): LucideIcon;
export function resolveLucideIcon(
  name: string | null | undefined,
  fallback: LucideIcon | null = null,
): LucideIcon | null {
  if (!name) return fallback;
  const normalized = normalizeIconName(name);
  if (!normalized || !ICON_NAME.test(normalized)) return fallback;
  const known = Object.prototype.hasOwnProperty.call(KNOWN_ICONS, normalized)
    ? KNOWN_ICONS[normalized]
    : undefined;
  return known ?? lazyIcon(normalized, fallback);
}
