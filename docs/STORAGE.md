# Storage & Image Optimization

Backed by the `storage` plugin (`plugins/storage/` — `files` table, content inline as `bytea`,
owner-only writes, `SELECT` open to `anon` for active rows). No external object storage yet
(S3/GCS is a future provider swap — the `StorageService` interface is already abstracted).

## `getStorageService()` — `@kizuna/core/server`

```ts
import { getStorageService } from '@kizuna/core/server';
const storage = getStorageService(); // provider from STORAGE_PROVIDER env, default 'postgres'
```

```ts
type StorageService = {
  listFiles(a: { authHeader: string; ids?: string[]; purpose?: string; active?: boolean; limit?: number })
    : Promise<StorageFileRecord[]>;
  uploadFiles(a: { authHeader: string; files: UploadFileInput[] })
    : Promise<{ uploaded: StorageFileRecord[]; errors: { fileName: string; message: string }[] }>;
  deleteFile(a: { authHeader: string; id: string }): Promise<boolean>;   // soft delete (active=false)
  getFileContent(a: { authHeader: string; id: string; activeOnly?: boolean })
    : Promise<{ mimeType: string; originalName: string; content: Buffer } | null>;
};

type UploadFileInput = { file: File; purpose: string; optimizeImages: boolean; maxFileSizeBytes: number };
```

`authHeader` is always explicit — get it with `getAuthHeaderFromCookies()` in the route handler.

### `StorageFileRecord`

`id` (uuid), `uid?`, `originalName`, `storagePath` (`{purpose}/{YYYY}/{MM}/{uuid}-{sanitized}`),
`publicUrl` (nullable), `mimeType`, `sizeBytes`, `width`/`height` (nullable — not populated on
upload today), `purpose`, `active`, `createdAt`/`updatedAt`.

`purpose` is sanitized to one of: `ad_image`, `avatar`, `document`, `banner`, `pdf`, `doc`,
`other` (anything else → `other`).

### Bytea conversion (done inside the service)

```ts
toPgBytea(buf)   // Buffer  → '\\x' + hex
fromPgBytea(str) // '\\x…'  → Buffer  (null on malformed input)
```

## API routes (consuming project owns the files, delegating to the service)

```
GET    /api/storage/files                 list (filter by purpose / ids / active)
POST   /api/storage/files                 upload (multipart/form-data: file, purpose, optimize?)
GET    /api/storage/files/:id/content     stream content with the right Content-Type
DELETE /api/storage/files/:id             soft delete
```

Display in a component: `<img src={`/api/storage/files/${id}/content`} />`.

## Image optimization — `optimizeImageBuffer` (`server/image-optimizer.ts`)

TinyPNG (`tinify`), server-side, applied automatically on upload when `optimizeImages` is set and
the MIME type starts with `image/`.

```ts
const { buffer, optimized, reason } = await optimizeImageBuffer({
  input: Buffer, mimeType: 'image/jpeg' | 'image/png' | 'image/webp', strict: false,
});
// strict:false → returns the original buffer on failure; strict:true → throws
```

Env: `TINYPNG_API_KEY` or `TINIFY_API_KEY`. Non-image files skip optimization.
