export type StorageFileRecord = {
    id: string;
    uid?: string;
    originalName: string;
    storagePath: string;
    publicUrl: string | null;
    mimeType: string | null;
    sizeBytes: number;
    width: number | null;
    height: number | null;
    purpose: string;
    active: boolean;
    createdAt: string | null;
    updatedAt: string | null;
};
export type UploadFileInput = {
    file: File;
    purpose: string;
    optimizeImages: boolean;
    maxFileSizeBytes: number;
};
export type StorageService = {
    listFiles: (args: {
        authHeader: string;
        ids?: string[];
        purpose?: string;
        active?: boolean;
        limit?: number;
    }) => Promise<StorageFileRecord[]>;
    uploadFiles: (args: {
        authHeader: string;
        files: UploadFileInput[];
    }) => Promise<{
        uploaded: StorageFileRecord[];
        errors: Array<{
            fileName: string;
            message: string;
        }>;
    }>;
    deleteFile: (args: {
        authHeader: string;
        id: string;
    }) => Promise<boolean>;
    getFileContent: (args: {
        authHeader: string;
        id: string;
        activeOnly?: boolean;
    }) => Promise<{
        mimeType: string;
        originalName: string;
        content: Buffer;
    } | null>;
};
export declare function getStorageService(): StorageService;
//# sourceMappingURL=storage-service.d.ts.map