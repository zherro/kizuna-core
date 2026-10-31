export declare function dayKey(iso: string): string;
export declare function dayLabel(iso: string, now?: Date): string;
/** Quebra a lista (já ordenada ASC) em grupos por dia. */
export declare function groupByDay<T extends {
    createdAt: string;
}>(items: T[]): Array<{
    key: string;
    label: string;
    items: T[];
}>;
//# sourceMappingURL=day-label.d.ts.map