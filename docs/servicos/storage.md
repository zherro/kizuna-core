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
  listFiles(a: {
    authHeader: string;
    ids?: string[];
    purpose?: string;
    active?: boolean;
    limit?: number;
  }): Promise<StorageFileRecord[]>;
  uploadFiles(a: {
    authHeader: string;
    files: UploadFileInput[];
  }): Promise<{ uploaded: StorageFileRecord[]; errors: { fileName: string; message: string }[] }>;
  deleteFile(a: { authHeader: string; id: string }): Promise<boolean>; // soft delete (active=false)
  getFileContent(a: {
    authHeader: string;
    id: string;
    activeOnly?: boolean;
  }): Promise<{ mimeType: string; originalName: string; content: Buffer } | null>;
};

type UploadFileInput = {
  file: File;
  purpose: string;
  optimizeImages: boolean;
  maxFileSizeBytes: number;
};
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
toPgBytea(buf); // Buffer  → '\\x' + hex
fromPgBytea(str); // '\\x…'  → Buffer  (null on malformed input)
```

## API routes (consuming project owns the files, delegating to the service)

```
GET    /api/storage/files                 list (filter by purpose / ids / active)
POST   /api/storage/files                 upload (multipart/form-data: file, purpose, optimize?)
GET    /api/storage/files/:id/content     stream content with the right Content-Type
DELETE /api/storage/files/:id             soft delete
```

Display in a component: `<img src={`/api/storage/files/${id}/content`} />`.

## Image optimization — `optimizeImage` (`server/image/`)

sharp (libvips) on the server itself: free, no quota, no network round trip. Applied automatically
on upload when `optimizeImages` is set: fixes EXIF rotation, strips metadata (GPS included),
resizes by preset and converts to WebP. The preset comes from the upload `purpose`:

| `purpose` | Preset | Result |
| --- | --- | --- |
| `avatar` | `avatar` | 512×512 cover, WebP q80 |
| `ad_image` / `service_image` / `listing` | `listing` | up to 1600px, WebP q80 |
| anything else | `default` | up to 2048px, WebP q82 |

```ts
import { optimizeImage } from '@kizuna/core/server/image';
const { buffer, mimeType, width, height, optimized } = await optimizeImage(input, 'image/jpeg', 'listing');
```

Unsupported format or a sharp failure returns the original untouched (`optimized: false`).

### Thumbnails (`files.thumb_content`, migration `storage/0005`)

Each image row also keeps a small version: WebP, aspect ratio kept (never cropped, never
upscaled), sized by the project's **thumbnail preset**. Same `id`, so no reference changes.

Pick the preset in `kizuna.config.json` → `images.thumbPreset` (omitted or unknown = `md`):

| Preset | Longest side | WebP quality | Typical weight (rich photo) | Fits screens up to (card ≈ 274px wide) |
| ------ | ------------ | ------------ | --------------------------- | -------------------------------------- |
| `xl`   | 480 px       | 65           | ~33 kB                      | ~1.75x                                 |
| `lg`   | 400 px       | 60           | ~22 kB                      | ~1.45x                                 |
| `md` (default) | 360 px | 60         | ~18 kB                      | ~1.3x                                  |
| `sm`   | 320 px       | 60           | ~14 kB                      | ~1.15x                                 |
| `xs`   | 280 px       | 60           | ~11 kB                      | 1x                                     |

Smaller = faster cards (the thumbnail is what search, home and carousels download), softer on
high-density screens. The values live in `src/shared/image/thumb-presets.json` — one source read by
the core (`resolveThumbPreset`) **and** by the import scripts (`scripts/lib/thumb-preset.mjs`).
Changing the preset applies to **new** uploads; regenerate the stored ones with the script described
in [Thumbnail mark and regenerating stored images](#thumbnail-mark-and-regenerating-stored-images) or from the
root storage screen below.

**Every upload obeys the preset:** `uploadSingleFilePostgres` always runs the image through sharp and
makes the thumbnail with the project preset (`server/image/config.ts` reads the config), whatever the
client sent in `optimizeImages` — only animated GIFs are left alone. The importers
(`importar-noticias.mjs`, `lugares-para-servicos.mjs`) apply the same preset.

```
/api/public/storage/files/<id>/content             → full image (detail, lightbox, swipe)
/api/public/storage/files/<id>/content?size=thumb  → thumbnail (cards, search, carousels, gallery)
```

No thumbnail stored (image already ≤ the preset's side, not an image, or uploaded before `0005`) → the route
returns the full image. The upload creates both via `optimizeImageWithThumbnail` (the thumbnail is
made from the already-optimized image). Client helpers: `fileUrl(id, 'thumb')` / `thumbUrl(id)`
(`client/components/services/service-helpers.ts`); `StorageFileRecord.hasThumb` says whether one exists.

Rules shared with the browser (no sharp) live in `src/shared/image`: `IMAGE_PRESETS`,
`presetForPurpose`, `resolveThumbPreset` / `THUMB_PRESET_NAMES`, `THUMB_MAX_SIDE` (default preset),
`needsThumbnail`, `LOW_RESOLUTION_MIN_SIDE` (600) and
`isLowResolution` — `ImageGalleryManager` warns after uploading a photo whose shorter side is
below 600px (accepted, just flagged: upscaling would only add bytes, not detail).

**As an API:** `src/app/api/images/optimize/route.ts` →
`export const POST = createImageOptimizeHandler({ maxFileSizeMb: 20 })`. Multipart `{ file, preset? }`,
answers with the optimized WebP bytes (`X-Image-Width`/`X-Image-Height` headers).

Import from `@kizuna/core/server/image` (not `@kizuna/core/server`) so projects that don't handle
images never load sharp.

### Thumbnail mark and regenerating stored images

Every thumbnail is **marked with the measure that made it** (migration `storage/0007`, two nullable
columns on `files`):

| Column | Content |
| ------ | ------- |
| `thumb_spec` | `<side>q<quality>` of the preset used, e.g. `360q60` (`thumbSpec()` in `src/shared/image`, same format in `scripts/lib/thumb-preset.mjs`). `NULL` = unknown ("no mark": made before 0007). |
| `thumb_at`   | When the thumbnail was generated. |

Uploads, the root re-optimization screen, the importers and the script below all write the mark.
Comparing it with the configured preset tells what is **in the measure**, what is **outdated** (the
preset changed) and what has **no mark** — so nothing is reprocessed twice.

**Apply the migration first.** It only adds two nullable columns (instant, idempotent, reversible with
`DROP COLUMN`). Plain SQL for production: `db/extras/atualizar-storage-0007.sql` in the project (run
it in your database client). Until it is applied, the app upload and the root screen keep working
(they retry without the mark), but the script and the importers refuse to run / fail.

`scripts/regerar-miniaturas.mjs` (in the project, not in the core) creates the missing thumbnails and
redoes the outdated or unmarked ones with the project's `images.thumbPreset`. It is safe to **run
repeatedly** (for example after a crawler inserted images): whatever is already in the configured
measure is skipped, and with nothing to do it exits right away without reading any image.

It only touches the `thumb_*` columns (including the mark) and never the original `content`, unless
`--otimizar-original` is given. **It is a simulation by default** and writes nothing without
`--aplicar`. It connects through `DATABASE_URL` and runs from the project root (it uses the files on
your disk, not the deployed app).

| Option | Effect |
| ------ | ------ |
| *(none)* | Simulation. Candidates: active images **without** a thumbnail that are worth having one (not WebP, heavier than `--minimo-kb`, or a side above the preset) and images **with** a thumbnail whose mark differs from the preset (or is missing). Largest first. Already-in-measure images are skipped. |
| `--aplicar` | Writes the thumbnails and the mark (one transaction per image). |
| `--conferir` | Report only (no sharp, nothing written): counts by situation and the 20 largest pending, then how many the default run would process. |
| `--forcar` | Ignores the mark and redoes every image that has, or is worth having, a thumbnail. (`--todas` still works as an alias, with a deprecation notice.) |
| `--limite N` | Only the N largest candidates. For testing; omit it to process all. |
| `--preset xl\|lg\|md\|sm\|xs` | Preset to use. Default: `images.thumbPreset` of `kizuna.config.json`. |
| `--lado PX`, `--qualidade Q` | Override the preset's longest side (200–1600) and WebP quality (30–95). The mark records the measure actually used. |
| `--minimo-kb N` | Weight (kB) above which a WebP without thumbnail is worth one. Default 60. |
| `--otimizar-original` | Optional: also re-encodes the original as WebP (1600px, q80) **when it gets at least 10% smaller**. Changes `content`; use with care. |

Every run (simulation, `--aplicar` and `--conferir`) ends with a **Resumo** block over the active
images: total, in the measure, outdated, no mark, without thumbnail (worth having / not needed), how many
this run processed, and the line `Total de imagens otimizadas: N de M` (optimized = in the measure
plus the small, light WebP images that don't need a thumbnail). Exit code 0 on success, 1 if any
image failed.

Recommended order — check first, simulate, test on a few, then apply:

```powershell
# PowerShell (Windows), from the project root
cd X:\workspace\kizuna-starter
$env:DATABASE_URL = "postgres://USER:PASSWORD@HOST:5432/DATABASE"

node scripts/regerar-miniaturas.mjs --conferir                     # 1. where things stand
node scripts/regerar-miniaturas.mjs                                # 2. simulation of what would run
node scripts/regerar-miniaturas.mjs --aplicar --limite 5           # 3. write only the 5 largest, check /busca
node scripts/regerar-miniaturas.mjs --aplicar                      # 4. write the rest (run again anytime)
```

```bash
# bash / Git Bash
DATABASE_URL="postgres://USER:PASSWORD@HOST:5432/DATABASE" node scripts/regerar-miniaturas.mjs --conferir
DATABASE_URL="postgres://USER:PASSWORD@HOST:5432/DATABASE" node scripts/regerar-miniaturas.mjs --aplicar
```

After changing `images.thumbPreset` (e.g. `md` to `xl`, or any change of side or quality) the same
command redoes only what is no longer in the new measure. Take a backup (or snapshot) before the first
full `--aplicar`, and keep the password out of the shell history (set the variable on its own line and
clear the history afterwards). A database without the migration makes the script stop with the path of
the SQL to apply.

## Root: storage screen (`/painel/root/storage`)

Root-only screen (`root-screens/storage-screen.tsx`, slug `storage` in `root-screens/registry.ts`)
to bring **existing** images up to date: lists `public.files` images (filter: not optimized /
optimized / all, and by `purpose`), mark images and optimize the marked ones, or optimize every
pending one in batches with progress, bytes saved and failures.

- "Not optimized" = `files.optimized_at IS NULL` (migration `storage/0006`). Upload sets it when the
  image goes through `optimizeImage`; rows written straight to the database (e.g. a robot import)
  start pending.
- Re-optimizing (`reoptimizeStoredImage`, `@kizuna/core/server/storage-admin`) rewrites the **same
  row** (same `id`, no reference changes): large version by the `purpose` preset + thumbnail. The
  large version is only replaced when it gets smaller (or has fewer pixels — above the preset);
  otherwise the file stays and only the thumbnail is added. `optimized_at` is set either way.
  Unsupported formats (HEIC…) are skipped and stay pending.
- Runs as `service_role` (`POSTGREST_SERVICE_TOKEN`, `kizuna token service`) — the root session
  can't pass the owner-only UPDATE policy. Missing token → 503 with the message.
- API (managed route of the storage plugin): `src/app/api/storage/admin/route.ts` →
  `createStorageAdminHandlers()`. `GET ?status=pending|optimized|all&purpose=&limit=&offset=` →
  `{ items, total }`; `POST { ids }` (max 10 per call) → `{ results }`. Both check `is_root`.

## `ImageGalleryManager` (`client/components/storage/image-gallery-manager.tsx`)

Client component (`'use client'`). Generic image gallery: upload, preview, remove. Ported from the
foco-total app's `AdImagesManager` — the only `ads`-specific bit (the persist default) was removed,
so `onPersist` is now a **required** prop.

Import: `import { ImageGalleryManager } from '@kizuna/core/client/components/storage';`

Props (`ImageGalleryManagerProps`):

| Prop              | Type                                                                                | Notes                                                                                                                                                                          |
| ----------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `referenceId`     | `string`                                                                            | Opaque id of the parent record; passed to `onPersist`.                                                                                                                         |
| `initialImageIds` | `string[]`                                                                          | File ids already linked. Re-hydrates when it or `referenceId` changes.                                                                                                         |
| `accept?`         | `string`                                                                            | `<input accept>` list. Defaults to the JPG/GIF/PNG/HEIC/WEBP set.                                                                                                              |
| `purpose?`        | `string`                                                                            | Default `'image'`. Sent as `purpose` in the upload FormData and as the `purpose` query param when listing.                                                                     |
| `maxFileSizeMb?`  | `number`                                                                            | Default `5`. Sent as `maxFileSizeMb` in the upload FormData.                                                                                                                   |
| `onSaved`         | `(imageIds: string[]) => void`                                                      | Called after every successful persist with the normalized id list.                                                                                                             |
| `onPersist`       | `(referenceId: string, nextImageIds: string[]) => Promise<Array<string \| number>>` | **Required.** Attach/detach the ids on the parent record. Must return the saved id list — the component sets its selection state (and calls `onSaved`) from the returned list. |

- Upload: `POST /api/storage/files` (multipart: `files`, `purpose`, `maxFileSizeMb`, `optimizeImages`).
- Listing: `GET /api/storage/files?ids=&purpose=&active=true&limit=` → `{ items: StorageFileRecord[] }`.
- Grid: `<Image src={`/api/storage/files/{id}/content?size=thumb`} />`; preview modal: full image (`next/image`, `unoptimized`).
- Max 3 images. Remove calls `onPersist` with the shortened list.
