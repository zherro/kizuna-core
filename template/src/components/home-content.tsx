'use client';

import { useEffect, useState } from 'react';
import { useAppPreferences } from '@kizuna/core/client/providers/app-preferences-provider';
import { HomeHero } from './home/home-hero';
import { CategoryRail } from './home/category-rail';
import { NearbyGrid } from './home/nearby-grid';
import { HowItWorks } from './home/how-it-works';
import { JoinCta } from './home/join-cta';
import {
  getHomeInkStyle,
  HOME_INK_FIXED_LEVEL,
  HOME_INK_LEVELS,
  HOME_INK_STORAGE_KEY,
  HOME_INK_TONE_PICKER_ENABLED,
  type HomeInkLevel,
} from './home/home-ink-config';
import { HomeInkTonePicker } from './home/home-ink-tone-picker';

export function HomeContent() {
  const { messages } = useAppPreferences();
  const t = messages.home;

  const [inkLevel, setInkLevel] = useState<HomeInkLevel>(HOME_INK_FIXED_LEVEL);

  useEffect(() => {
    if (!HOME_INK_TONE_PICKER_ENABLED) return;
    try {
      const saved = Number(localStorage.getItem(HOME_INK_STORAGE_KEY));
      if (HOME_INK_LEVELS.includes(saved as HomeInkLevel)) {
        queueMicrotask(() => setInkLevel(saved as HomeInkLevel));
      }
    } catch {
      // localStorage unavailable — keep the fixed default.
    }
  }, []);

  function handleInkLevelChange(level: HomeInkLevel) {
    setInkLevel(level);
    try {
      localStorage.setItem(HOME_INK_STORAGE_KEY, String(level));
    } catch {
      // ignore — the picker still works for this render, just won't persist.
    }
  }

  return (
    <main
      className="bg-background"
      data-home-ink-level={inkLevel}
      style={getHomeInkStyle(inkLevel)}
    >
      <HomeHero t={t} />
      <CategoryRail t={t} />
      <NearbyGrid t={t} />
      <HowItWorks t={t} />
      <JoinCta t={t} />
      {HOME_INK_TONE_PICKER_ENABLED ? (
        <HomeInkTonePicker level={inkLevel} onChange={handleInkLevelChange} />
      ) : null}
    </main>
  );
}
