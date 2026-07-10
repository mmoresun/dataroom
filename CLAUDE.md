# Dataroom — project map

This repo holds both halves of the Dataroom app:

- **Frontend** — lives at the repo root (`src/`, `package.json`, etc.). A React/TS/Vite SPA, currently backed by IndexedDB (mock storage, no server). See `README.md` for its own design decisions.
- **Backend** — lives in `backend/`. **NestJS**, deployed to **AWS** as Lambda functions behind API Gateway (serverless — no always-on server process; see "Uploads/downloads" below for why this shapes the API). Its job is to implement the API contract below so the frontend can swap its storage layer from IndexedDB to real HTTP calls.

## The boundary: `src/lib/store/repository.ts`

Every frontend feature (pages, hooks, dialogs) calls into this one module — nothing else in `src/` talks to IndexedDB directly. When the backend exists, this file is what gets rewritten to call `fetch()` instead of `idb`; its exported function signatures are the de facto API contract. Treat changes to this file's exports as an API contract change on both sides.

### Data model (`src/lib/db/schema.ts`)

```ts
type NodeId = string
type DataRoomId = string

interface DataRoom { id: DataRoomId; name: string; createdAt: number; updatedAt: number }

interface FolderNode { id: NodeId; type: 'folder'; name: string; parentId: NodeId; createdAt: number; updatedAt: number }
interface FileNode   { id: NodeId; type: 'file';   name: string; parentId: NodeId; createdAt: number; updatedAt: number; size: number; mimeType: string }
```

- A `DataRoom` is a top-level container (like a Drive). Its own `id` doubles as the `parentId` for whatever sits at its root — there's no separate "root node."
- Folders/files are a flat table keyed by `parentId`, not a nested tree — walking up via `parentId` reconstructs the path (breadcrumb) or the whole subtree (recursive delete).
- File bytes are NOT in this table — see `getFileBlob`/`uploadFile` below, currently a separate IndexedDB store (`blobs`); on a real backend this is blob storage (S3-style), referenced by the file's `id`.

### Functions to reimplement as API calls

| Function | Signature | Notes |
|---|---|---|
| `listDataRooms` | `() => Promise<DataRoom[]>` | Sorted by name |
| `getDataRoom` | `(id) => Promise<DataRoom \| undefined>` | |
| `createDataRoom` | `(name) => Promise<DataRoom>` | Auto-suffixes `(1)`, `(2)`... on name collision, never rejects |
| `renameDataRoom` | `(id, newName) => Promise<DataRoom>` | Rejects (doesn't suffix) on collision — throws `DuplicateNameError` |
| `deleteDataRoom` | `(id) => Promise<void>` | Cascades: deletes every nested file/folder + their blobs |
| `listChildren` | `(parentId) => Promise<DataRoomNode[]>` | Direct children only, folders sorted before files |
| `getNode` | `(id) => Promise<DataRoomNode \| undefined>` | |
| `countChildren` | `(parentId) => Promise<number>` | Direct children, not recursive |
| `getBreadcrumb` | `(id, rootId) => Promise<DataRoomNode[]>` | Path from the dataroom's root down to `id` inclusive |
| `createFolder` | `(name, parentId) => Promise<FolderNode>` | Same auto-suffix behavior as createDataRoom |
| `uploadFile` | `(file: File, parentId) => Promise<FileNode>` | Validates PDF-only, non-empty, ≤20MB; auto-suffixes name — **becomes a 3-step flow on the backend, see below** |
| `getFileBlob` | `(id) => Promise<Blob \| undefined>` | Fetches the actual PDF bytes for viewing — **becomes a presigned GET URL, see below** |
| `renameNode` | `(id, newName) => Promise<DataRoomNode>` | Rejects on collision, like renameDataRoom |
| `deleteNode` | `(id) => Promise<void>` | Cascades for folders — also deletes each file's S3 object |

`RepositoryError` (generic failure, message shown to the user as-is) and `DuplicateNameError extends RepositoryError` (rename/create-name collision) are the two error types the UI specifically branches on — the backend's error responses should let the frontend distinguish these two cases (e.g. a `code` field or distinct HTTP status).

### Uploads/downloads: presigned S3, bypassing the Lambda server

The backend runs as Lambda behind API Gateway — API Gateway caps synchronous request/response payloads at **6MB**, well under our own 20MB PDF limit. So file bytes never pass through the backend at all; the frontend talks to S3 directly using presigned URLs, and the backend only ever handles metadata:

1. **`requestUpload(parentId, fileName, fileSize, mimeType) => Promise<{ fileId, uploadUrl }>`** — backend validates PDF-only/size/name-collision *before* issuing a presigned S3 **PUT** URL (scoped to that exact key, content-type, and size via the presigned policy so the client can't smuggle in a different file). Creates the `FileNode` metadata row up front (or in a pending state).
2. Frontend `PUT`s the raw file bytes straight to `uploadUrl` — S3 only, backend is not in this request path at all.
3. **`confirmUpload(fileId) => Promise<FileNode>`** — backend does a `HeadObject` to confirm the upload landed (right size, exists), then marks the `FileNode` ready. This replaces the single old `uploadFile` call — the frontend hook (`useDataRoom.uploadFile`) becomes a 3-step orchestration instead of one function call, but its *external* behavior (toast on success/failure, auto-suffixed name, focus-highlight the new row) stays the same.
4. **`getDownloadUrl(fileId) => Promise<string>`** replaces `getFileBlob` — returns a short-lived presigned **GET** URL; `PdfViewerDialog` points its `<iframe src>` straight at that URL instead of an `URL.createObjectURL(blob)`.

Deleting a file (`deleteNode`) now also needs to delete the underlying S3 object, not just the metadata row.

### Cross-tab locking (`src/lib/store/viewLock.ts`)

Currently a client-only concern (Web Locks API, one browser tab vs another). A real backend with multiple *users* editing concurrently would need to move this server-side (e.g. optimistic concurrency via `updatedAt`, or actual locks/leases) — this is a real design decision to make once the backend exists, not a mechanical port.

## Backend: current setup (`backend/`)

Vendored from [brocoders/nestjs-boilerplate](https://github.com/brocoders/nestjs-boilerplate) (fetched via `degit`, no upstream git history). Configured choices, made non-interactively since its `app:config` prompt needs a TTY we don't have in an agent shell (see `.install-scripts/non-interactive-config.ts`, a one-off script that calls the boilerplate's own vetted removal functions directly — safe to delete once you're happy with the result, it's not needed again):

- **Database**: PostgreSQL + TypeORM only (Mongoose/document persistence stripped).
- **Auth**: email/password + **Google** social sign-in only (Facebook/Apple modules removed — `AuthFacebookModule`/`AuthAppleModule` no longer exist). JWT access/refresh tokens with real generated secrets in `backend/.env` (not the vendor placeholder values).
- **Ports are non-default** because of local conflicts on this dev machine — check `backend/.env` / `backend/docker-compose.yaml` before assuming the vendor docs' default ports:
  - Postgres: **5433** (5432 was already bound by a native Windows Postgres install)
  - Adminer: **8082** (8080 was already bound by another local process)
  - App itself, Maildev: unchanged (3001, 1080/1025)
- **Google OAuth**: this boilerplate's Google flow verifies a client-obtained **ID token** (`POST /api/auth/google/login`), not a server-side redirect — the frontend gets the ID token via Google Identity Services, so only "Authorized JavaScript origins" need configuring in Google Cloud Console (no redirect URI).
- Local dev containers: `cd backend && docker compose up -d postgres adminer maildev`, then `npm install`, `npm run migration:run`, `npm run seed:run:relational`, `npm run start:dev`. Seeded users: `admin@example.com` / `john.doe@example.com`, password `secret`.
- `backend/README.md` is the vendor's own README (left untouched, includes attribution) — `backend/docs/` has the boilerplate's full documentation (auth flows, file uploading, architecture).

## Where to look for more context

- `README.md` — full design-decision writeup for the frontend (data model rationale, storage choice, trade-offs, edge cases handled, what's not implemented).
- `src/lib/store/repository.ts` — the actual current implementation of every function above.
- `backend/docs/` — the boilerplate's own documentation (auth, file-uploading, database, architecture).
