'use client';
import { useCallback, useState } from 'react';
export function useOnboardingSteps(role = 'advertiser') {
    const [steps, setSteps] = useState([]);
    const [loading, setLoading] = useState(false);
    const load = useCallback(async () => {
        setLoading(true);
        try {
            const query = new URLSearchParams({
                page: '1',
                pageSize: '100',
                orderBy: 'step_order',
                orderDirection: 'asc',
                'filter.role': role,
                'filter.active': 'true',
            });
            const response = await fetch(`/api/resources/onboarding_steps?${query.toString()}`, {
                cache: 'no-store',
            });
            const data = (await response.json().catch(() => null)) ?? {};
            if (!response.ok) {
                setSteps([]);
                return;
            }
            setSteps(Array.isArray(data.items) ? data.items : []);
        }
        catch {
            setSteps([]);
        }
        finally {
            setLoading(false);
        }
    }, [role]);
    return {
        steps,
        loading,
        load,
    };
}
//# sourceMappingURL=use-onboarding-steps.js.map