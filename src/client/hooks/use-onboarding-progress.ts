'use client';

import { useCallback, useState } from 'react';

export type OnboardingProgressStatus = 'pending' | 'in_progress' | 'completed' | 'skipped';

type OnboardingProgressItem = {
  id: string;
  userId: string;
  stepId: string;
  status: OnboardingProgressStatus;
  completedAt: string | null;
};

type ListResponse<TItem> = {
  items?: TItem[];
};

export function useOnboardingProgress(userId: string | null) {
  const [progress, setProgress] = useState<Record<string, OnboardingProgressItem>>({});
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!userId) return;

    setLoading(true);
    try {
      const query = new URLSearchParams({
        page: '1',
        pageSize: '100',
        orderBy: 'created_at',
        orderDirection: 'asc',
        'filter.user_id': userId,
      });

      const response = await fetch(`/api/resources/onboarding_progress?${query.toString()}`, {
        cache: 'no-store',
      });

      const data =
        ((await response
          .json()
          .catch(() => null)) as ListResponse<OnboardingProgressItem> | null) ?? {};
      if (!response.ok) {
        setProgress({});
        return;
      }

      const items = Array.isArray(data.items) ? data.items : [];
      const indexed = items.reduce(
        (acc, item) => {
          acc[item.stepId] = item;
          return acc;
        },
        {} as Record<string, OnboardingProgressItem>
      );
      setProgress(indexed);
    } catch {
      setProgress({});
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const updateStep = useCallback(
    async (stepId: string, status: OnboardingProgressStatus) => {
      if (!userId) return false;

      try {
        const payload = {
          user_id: userId,
          step_id: stepId,
          status,
          completedAt: status === 'completed' ? new Date().toISOString() : null,
        };

        const response = await fetch('/api/onboarding/progress', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          return false;
        }

        await load();
        return true;
      } catch {
        return false;
      }
    },
    [userId, load]
  );

  return {
    progress,
    loading,
    load,
    updateStep,
  };
}
