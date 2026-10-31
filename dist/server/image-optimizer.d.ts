type OptimizeImageOptions = {
    input: Buffer;
    mimeType?: string | null;
    strict?: boolean;
};
type OptimizeImageResult = {
    buffer: Buffer;
    optimized: boolean;
    reason?: 'missing-api-key' | 'unsupported-format' | 'tinify-error';
};
export declare function optimizeImageBuffer(options: OptimizeImageOptions): Promise<OptimizeImageResult>;
export {};
//# sourceMappingURL=image-optimizer.d.ts.map