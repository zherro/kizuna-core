export interface UserLocation {
    stateCode: string;
    stateName: string;
    cityId: number;
    cityName: string;
    source: 'manual' | 'gps' | 'ip';
}
export type DetectionStatus = 'idle' | 'detecting' | 'found' | 'prompt' | 'manual';
export declare function getStoredLocation(): UserLocation | null;
export declare function getStoredCityId(): string;
export declare function useUserLocation(): {
    location: UserLocation | null;
    setLocation: (loc: UserLocation) => void;
    clearLocation: () => void;
    detectLocation: () => Promise<void>;
    status: DetectionStatus;
};
//# sourceMappingURL=use-user-location.d.ts.map