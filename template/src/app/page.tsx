// EXEMPLO — home pública. A cara é parametrizada por `kizuna.config.json`
// (chave "home"), não por env — evita rebuild de Docker com --build-arg
// para cada toggle novo.
import { HomeContent } from '@/components/home-content';
import cfg from '@/../kizuna.config.json';
import { HOME_INK_LEVELS, type HomeInkLevel } from '@/components/home/home-ink-config';
import { CategoryRails, type CategoryRailConfig } from '@/components/home/category-rails';
import type { ServiceDetailConfig } from '@kizuna/core/client/components/services/detail';

const home = cfg.home as typeof cfg.home & {
  inkPicker?: boolean;
  inkLevel?: number;
  categoriesOnlyWithListings?: boolean;
  categoryRails?: CategoryRailConfig[];
};
const categoryRails = (home?.categoryRails ?? []).filter((rail) => rail?.slug);
const serviceDetailConfig = (cfg as { serviceDetail?: ServiceDetailConfig }).serviceDetail ?? null;
const inkLevel = HOME_INK_LEVELS.includes(home?.inkLevel as HomeInkLevel)
  ? (home.inkLevel as HomeInkLevel)
  : undefined;

export default function Home() {
  return (
    <HomeContent
      showHero={cfg.home?.showHero !== false}
      categoriesVariant={cfg.home?.categoriesVariant === 'compact' ? 'compact' : 'classic'}
      categoriesOnlyWithListings={home?.categoriesOnlyWithListings === true}
      showDiscover={cfg.home?.showDiscover === true}
      inkPicker={home?.inkPicker !== false}
      inkLevel={inkLevel}
      categoryRails={
        categoryRails.length > 0 ? (
          <CategoryRails rails={categoryRails} detailConfig={serviceDetailConfig} />
        ) : null
      }
    />
  );
}
