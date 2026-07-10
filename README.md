# Dataroom

A virtual data room MVP — create multiple independent Datarooms, each with its own nested folders and PDF files: upload, rename, view, and delete, all in the browser. Built as a take-home assignment for a due-diligence-style document repository (think a lightweight Google Drive scoped to PDFs, where each Dataroom is its own top-level drive — e.g. one per deal).

**Languages / Мови:** [English](#english) · [Українська](#українська)

---

## English

### Live demo

Run it locally with the setup instructions below.

### Tech stack

- **React 19 + TypeScript + Vite** — required by the assignment
- **Tailwind CSS v4** + **shadcn/ui** — the company's stated stack; shadcn isn't a component *library* you install, it's a code generator: `npx shadcn add button` copies the component's source straight into `src/components/ui/`, styled with Tailwind and built on Radix UI primitives for accessibility (focus traps, keyboard nav, ARIA). You own and can edit that code.
- **react-router-dom** — navigation lives in the URL (`/room/:roomId/folder/:id`), so the back button, refresh, and deep links all work correctly
- **sonner** — toast notifications
- **lucide-react** — icons
- **Backend: NestJS + TypeORM/PostgreSQL** (in `backend/`) — real multi-user persistence, JWT + Google auth, S3 presigned uploads. See `backend/CLAUDE.md` for its own architecture notes. The frontend originally ran on IndexedDB alone (no backend); that mock layer has since been fully replaced — see "What's not implemented" below for what's still historical in this doc.

### Local Development Setup

Two independent apps: this repo's root (frontend, Vite) and `backend/` (NestJS API). Both need to be running for the app to actually work end-to-end (folders/files, auth, PDF upload/view) — running only the frontend gets you a login screen and nothing past it.

**Prerequisites:** Node 22+ (developed against Node 24), Docker + Docker Compose (for local Postgres/Adminer/Maildev), an AWS S3 bucket (for PDF upload/download — see note below).

#### 1. Backend: local services

```bash
cd backend
docker compose up -d postgres adminer maildev   # NOT `api` — we run Nest directly on the host below
```

This starts Postgres, [Adminer](http://localhost:8082) (a DB admin UI), and [Maildev](http://localhost:1080) (catches outgoing emails locally instead of sending them).

#### 2. Backend: environment

Create `backend/.env`. The vendored `env-example-relational` is the upstream boilerplate's own template — this project uses different values in a few places (documented in `backend/CLAUDE.md`), most importantly:

```env
DATABASE_HOST=localhost
DATABASE_PORT=5433        # not 5432 — avoids clashing with a native Postgres install; matches docker-compose.yaml
DATABASE_USERNAME=root
DATABASE_PASSWORD=secret
DATABASE_NAME=api
FILE_DRIVER=s3-presigned
ACCESS_KEY_ID=...         # your AWS credentials
SECRET_ACCESS_KEY=...
AWS_S3_REGION=...
AWS_DEFAULT_S3_BUCKET=...
AUTH_JWT_SECRET=...        # any random string for local dev
AUTH_REFRESH_SECRET=...
AUTH_FORGOT_SECRET=...
AUTH_CONFIRM_EMAIL_SECRET=...
GOOGLE_CLIENT_ID=...       # optional — only needed to test Google sign-in
GOOGLE_CLIENT_SECRET=...
FRONTEND_DOMAIN=http://localhost:5173
BACKEND_DOMAIN=http://localhost:3001
```

**Note on file storage:** folder/file upload in this app always talks to S3 directly via presigned URLs (`src/nodes/node-storage.service.ts`) — this isn't gated by `FILE_DRIVER` (that setting only affects the vendored boilerplate's own unrelated user-avatar upload feature). To exercise upload/view locally you need a real S3 bucket with CORS allowing `http://localhost:5173` for `GET`/`PUT`/`HEAD` (see `backend/CLAUDE.md`'s "Uploads/downloads" section for why the architecture is shaped this way). Without it, everything except PDF upload/view still works.

**Note on Google sign-in:** optional — email/password auth works out of the box. To test Google sign-in locally, create an OAuth client in Google Cloud Console with `http://localhost:5173` as an authorized JavaScript origin.

#### 3. Backend: install, migrate, seed, run

```bash
npm install
npm run migration:run
npm run seed:run:relational   # creates admin@example.com / john.doe@example.com, password "secret"
npm run start:dev             # http://localhost:3001, API under /api/v1
```

#### 4. Frontend: environment, install, run

```bash
cd ..                # repo root
cp .env.example .env
npm install
npm run dev           # http://localhost:5173
```

`.env`'s defaults already point at `http://localhost:3001` — only change `VITE_API_URL` if the backend runs elsewhere.

#### What's running where

| Service | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:3001/api/v1 |
| Swagger API docs | http://localhost:3001/docs |
| Adminer (Postgres UI) | http://localhost:8082 |
| Maildev (caught emails) | http://localhost:1080 |

**Production** uses managed Neon Postgres and is deployed to Heroku (two apps, auto-deployed independently on push — see `backend/CLAUDE.md`'s "Deployment" section) instead of the local Docker Postgres above; same code, different `DATABASE_URL`.

### Design decisions

**Data model: a flat table, not a nested tree.**
Every folder and file is a row with `{ id, type, name, parentId, createdAt, updatedAt }`, all stored in a single IndexedDB object store (`nodes`) indexed by `parentId`. A nested-object tree looks tempting at first, but it makes "list this folder's contents," "move a node," and "delete a subtree" all require walking or rebuilding the whole tree. With a flat table indexed by `parentId`, listing a folder is a single indexed lookup. (IndexedDB can't index a literal `null`, which is why top-level items need a real string `parentId` rather than `null` — see the next section for what that value is.)

**Multiple Datarooms: each room's own id doubles as the virtual root of its tree.**
The assignment asks users to be able to *create* Datarooms (plural) — a Dataroom is the top-level drive, like "My Drive" in Google Drive, and a user may be running due diligence on several deals at once, each needing its own isolated room. Earlier iterations of this project had exactly one implicit Dataroom (a global `ROOT_ID` sentinel every top-level folder/file was parented under), which didn't actually support that. Datarooms are now a real entity in their own IndexedDB store (`datarooms: { id, name, createdAt, updatedAt }`), and a room's own `id` is reused as the `parentId` for everything at that room's top level — exactly how the old global sentinel worked, just scoped per room instead of shared globally. This means the existing `nodes` store, its `by-parent` index, and every folder/file CRUD function in `repository.ts` needed no structural change at all — only their `ROOT_ID` defaults became an explicit, always-supplied `roomId`. Deleting a Dataroom reuses the same recursive-subtree-collection logic as deleting a folder, just seeded at the room's id instead of a folder's.

**Storage: IndexedDB, with metadata and file bytes in separate object stores.**
`localStorage` is capped around 5MB and stores strings only — unusable for real PDF bytes. IndexedDB has no such practical limit and stores `Blob`s natively. Metadata (`nodes`) and file contents (`blobs`, keyed by the same node id) are split into two stores so that listing a folder never has to touch the (potentially large) binary payloads.

**Duplicate names: silently auto-suffixed on create/upload, rejected outright on rename.**
Creating a folder or uploading a file named the same as an existing sibling gets a `(1)`, `(2)`, ... suffix automatically — no dialog, no interruption, matching how Drive/Explorer handle bulk uploads. Renaming is different by design: it's a single, deliberate action, so silently substituting a different name than what the user typed would be confusing. Renaming to a name that's already taken throws a `DuplicateNameError`; the dialog stays open with the *original* name restored in the input so the user can immediately try again. The suffix-picking logic also strips any existing `" (N)"` suffix before appending a new one, so renaming into a name that already ends in `(1)` doesn't stack into `(1) (1)` — it correctly bumps to `(2)`.

**Cross-tab "in use" locking via the Web Locks API.**
Opening a PDF in the viewer, or simply browsing into a folder or Dataroom, acquires a `shared` Web Lock scoped to that item's id. Deleting or renaming first tries to acquire an `exclusive` lock on it (and, for folder/Dataroom deletes, on every file/folder in its subtree) with `ifAvailable: true` — a non-blocking check. If it's held elsewhere, the action is rejected with a message naming the specific file/folder/Dataroom and telling the user to close it in the other tab first. This applies at the Dataroom level too — a room can't be renamed or deleted from one tab while another tab is browsing anywhere inside it. This was chosen over a `localStorage` + heartbeat scheme because the browser releases Web Locks automatically on tab close or crash — there's no stale-lock cleanup logic to get wrong.

**Validation lives in the repository layer, not just the UI.**
Every mutating function in `src/lib/store/repository.ts` (`createFolder`, `uploadFile`, `renameNode`, `deleteNode`) re-validates its own preconditions (non-empty name, PDF-only, 20MB size cap, no name collision, not locked elsewhere) regardless of what the calling UI already checked. Disabling a Save button is a UX nicety, not a security boundary — the underlying function has to be correct on its own, since it's callable directly (e.g. from devtools) bypassing any disabled button.

**Theming: custom light/dark palettes, not the shadcn defaults.**
Light mode is a warm, low-chroma ivory rather than clinical pure white; dark mode is a desaturated navy-black rather than neutral gray, with a blue accent color. Both are defined as CSS custom properties in `oklch()` in `src/index.css`, toggled by adding/removing a `.dark` class on `<html>`. The `useTheme` hook persists the choice to `localStorage` and falls back to the OS `prefers-color-scheme` on first load.

**Discoverability over minimalism for row actions.**
The "⋮" actions button on each row is always visible (in a muted color), not hidden until hover — a user scanning the list should immediately understand that rows have actions available, which matters more here than a marginally cleaner idle state. It brightens on hover/focus/open.

**Focus + highlight after create/rename.**
After creating or renaming a folder or file, that row receives real DOM focus, scrolls into view, and flashes briefly — so in a long list the user isn't left wondering where the thing they just created ended up.

**React Compiler's stricter lint rules shaped a couple of patterns.**
This project uses the React Compiler (`babel-plugin-react-compiler`) and its accompanying ESLint rule `react-hooks/set-state-in-effect`, which flags the common "sync a prop into local state via `useEffect`" pattern (used for resetting a dialog's form state per target, or resetting fetched counts per node). The fix used throughout (`RenameDialog`, `PdfViewerDialog`, `DeleteConfirmDialog`) is the React-team-recommended one: extract a child component keyed by the target's `id`, so switching targets remounts it and resets state naturally, with no effect needed at all.

### Project structure

```
src/
  lib/
    db/            IndexedDB schema (schema.ts) and connection (db.ts, DB v2: datarooms/nodes/blobs stores)
    store/
      repository.ts  All CRUD + validation — the only module that talks to IndexedDB directly
      viewLock.ts     Web Locks API wrapper for cross-tab "in use" tracking
    format.ts        formatBytes / formatDate / folderWarning helpers
    utils.ts          cn() (clsx + tailwind-merge), shadcn convention
  hooks/
    useDataRoom.ts     Loads/mutates one folder's contents within a room; used by DataRoomPage
    useDataRoomList.ts Loads/mutates the top-level list of Datarooms; used by DataRoomListPage
    useTheme.ts        Light/dark theme state + persistence
  components/
    ui/                     Generated shadcn/ui primitives (button, dialog, dropdown-menu, ...)
    NodeRowShell.tsx        Shared row chrome (icon slot, truncated-name tooltip, actions menu) — generic over anything with { name, createdAt }, so FolderRow/FileRow/DataRoomRow all reuse it
    FolderRow.tsx / FileRow.tsx / DataRoomRow.tsx   Thin wrappers over NodeRowShell, one per row type
    NodeList.tsx            Folder-contents area: loading skeleton, empty state, the row list
    UploadDropzone.tsx      Drag-and-drop-to-upload wrapper
    DataRoomList.tsx        Dataroom-list area: loading skeleton, empty state, the row list
    Breadcrumbs.tsx         "All Datarooms > Room name > nested folders..."
    CreateDialog.tsx        Generic "create X" dialog (title/label/default name as props) — used for both folders and datarooms
    RenameDialog.tsx        Generic rename dialog — works for anything with { id, name } (folders, files, datarooms)
    DeleteConfirmDialog.tsx Generic delete-confirmation dialog — an `isContainer` prop decides whether to fetch/report nested item counts
    PdfViewerDialog.tsx
    ThemeToggle.tsx
  pages/
    DataRoomListPage.tsx  Landing page: list of Datarooms, create/rename/delete
    DataRoomPage.tsx      A single Dataroom's contents: toolbar, drag-and-drop, dialogs, list
  App.tsx                 Routes: "/", "/room/:roomId", "/room/:roomId/folder/:id"
```

### Edge cases handled

- Duplicate folder/file names on create, upload, and rename (see above)
- Non-PDF uploads rejected (`Only PDF files are supported.`)
- Empty (0-byte) files rejected (`The file is empty.`)
- Files over 20MB rejected, with the limit stated in the message
- Cancelling the native file picker does nothing (no error, no phantom entries)
- Deleting or renaming a file/folder/Dataroom open in another browser tab is blocked with a specific message
- Recursive delete removes every nested file and folder (and their blobs) at any depth, whether deleting a folder or an entire Dataroom
- Very long or special-character names are accepted, truncated visually, full name available via tooltip (shown only when the name is actually truncated) and screen-reader label
- Renaming/creating with an empty or whitespace-only name is rejected both in the UI (disabled button) and in the repository layer independently
- Duplicate Dataroom names are auto-suffixed on create and rejected outright on rename, the same as folders/files
- Revisiting a stale URL for a folder that's since been deleted bounces up to that Dataroom's root; revisiting a stale URL for a Dataroom that's since been deleted bounces to the Dataroom list — each with a toast shown exactly once even under React StrictMode's double-invoked effects

### What's not implemented (out of scope for this pass)

> The two bullets below described the project's original, frontend-only take-home phase, where everything lived in one browser's IndexedDB with no server. That's since been fully replaced by the real backend and auth described in "Local Development Setup" above — kept here for history, not because they're still true.
> - ~~No backend / multi-user sync.~~ Now a real NestJS + PostgreSQL backend with per-user data isolation, deployed independently of the frontend.
> - ~~No authentication.~~ Now email/password + Google sign-in (JWT-based).

- **No search or content filtering.**
- **No move / drag-and-drop between folders** (only drag-and-drop *upload* is supported).
- **No automated test suite committed.** Every feature in this project was verified end-to-end against the running app with Playwright during development (creating the scenario, driving the UI, checking the resulting DOM/IndexedDB state, screenshotting for visual review) rather than by writing and committing test files — appropriate for the scope of a take-home, but a real test suite (Vitest + Testing Library for the repository/hooks, Playwright for a few end-to-end flows) would be a natural next step.

---

## Українська

### Технологічний стек

- **React 19 + TypeScript + Vite** — вимога завдання
- **Tailwind CSS v4** + **shadcn/ui** — заявлений стек компанії; shadcn — це не бібліотека компонентів, яку встановлюють, а генератор коду: `npx shadcn add button` копіює вихідний код компонента прямо в `src/components/ui/`, стилізований Tailwind і побудований на примітивах Radix UI (фокус-пастки, навігація з клавіатури, ARIA). Цей код належить вам, і його можна редагувати.
- **react-router-dom** — навігація живе в URL (`/room/:roomId/folder/:id`), тож кнопка "назад", оновлення сторінки й прямі посилання працюють коректно
- **sonner** — тости-сповіщення
- **lucide-react** — іконки
- **Бекенд: NestJS + TypeORM/PostgreSQL** (у `backend/`) — справжнє багатокористувацьке збереження даних, JWT + Google-автентифікація, завантаження файлів у S3 через presigned URL. Архітектурні нотатки — у `backend/CLAUDE.md`. Спочатку фронтенд працював лише на IndexedDB (без бекенду); цей мок-шар відтоді повністю замінено — див. "Що не реалізовано" нижче про те, що з цього документа вже застаріло.

### Локальне розгортання

Два незалежні застосунки: корінь цього репо (фронтенд, Vite) і `backend/` (NestJS API). Для повноцінної роботи (папки/файли, автентифікація, завантаження/перегляд PDF) потрібні обидва — лише фронтенд дасть екран входу і нічого далі.

**Передумови:** Node 22+ (розроблено на Node 24), Docker + Docker Compose (для локальних Postgres/Adminer/Maildev), бакет AWS S3 (для завантаження/перегляду PDF — див. примітку нижче).

#### 1. Бекенд: локальні сервіси

```bash
cd backend
docker compose up -d postgres adminer maildev   # НЕ `api` — Nest запускаємо напряму на хості нижче
```

Піднімає Postgres, [Adminer](http://localhost:8082) (UI для БД) і [Maildev](http://localhost:1080) (перехоплює вихідні листи локально, замість реальної відправки).

#### 2. Бекенд: середовище

Створіть `backend/.env`. Вендорний `env-example-relational` — це шаблон самого апстрім-бойлерплейта; цей проєкт використовує інші значення в кількох місцях (задокументовано в `backend/CLAUDE.md`), найважливіше:

```env
DATABASE_HOST=localhost
DATABASE_PORT=5433        # не 5432 — щоб не конфліктувати з нативним Postgres; відповідає docker-compose.yaml
DATABASE_USERNAME=root
DATABASE_PASSWORD=secret
DATABASE_NAME=api
FILE_DRIVER=s3-presigned
ACCESS_KEY_ID=...         # ваші AWS-креденшали
SECRET_ACCESS_KEY=...
AWS_S3_REGION=...
AWS_DEFAULT_S3_BUCKET=...
AUTH_JWT_SECRET=...        # будь-який випадковий рядок для локальної розробки
AUTH_REFRESH_SECRET=...
AUTH_FORGOT_SECRET=...
AUTH_CONFIRM_EMAIL_SECRET=...
GOOGLE_CLIENT_ID=...       # опційно — лише для тестування входу через Google
GOOGLE_CLIENT_SECRET=...
FRONTEND_DOMAIN=http://localhost:5173
BACKEND_DOMAIN=http://localhost:3001
```

**Про сховище файлів:** завантаження файлів у цьому застосунку завжди йде напряму в S3 через presigned URL (`src/nodes/node-storage.service.ts`) — це не залежить від `FILE_DRIVER` (це налаштування впливає лише на окрему, непов'язану функцію завантаження аватарів користувачів із вендорного бойлерплейту). Щоб перевірити завантаження/перегляд локально, потрібен реальний S3-бакет з CORS, що дозволяє `http://localhost:5173` для `GET`/`PUT`/`HEAD` (див. розділ "Uploads/downloads" у `backend/CLAUDE.md` про те, чому архітектура саме така). Без цього все, крім завантаження/перегляду PDF, працює.

**Про вхід через Google:** опційно — автентифікація email/пароль працює одразу. Щоб перевірити вхід через Google локально, створіть OAuth-клієнт у Google Cloud Console з `http://localhost:5173` як authorized JavaScript origin.

#### 3. Бекенд: встановлення, міграції, сіди, запуск

```bash
npm install
npm run migration:run
npm run seed:run:relational   # створює admin@example.com / john.doe@example.com, пароль "secret"
npm run start:dev             # http://localhost:3001, API під /api/v1
```

#### 4. Фронтенд: середовище, встановлення, запуск

```bash
cd ..                # корінь репо
cp .env.example .env
npm install
npm run dev           # http://localhost:5173
```

Значення за замовчуванням у `.env` вже вказують на `http://localhost:3001` — міняйте `VITE_API_URL` лише якщо бекенд працює деінде.

#### Що де працює

| Сервіс | URL |
|---|---|
| Фронтенд | http://localhost:5173 |
| Backend API | http://localhost:3001/api/v1 |
| Swagger API docs | http://localhost:3001/docs |
| Adminer (UI для Postgres) | http://localhost:8082 |
| Maildev (перехоплені листи) | http://localhost:1080 |

**Прод** використовує керований Neon Postgres і задеплоєний на Heroku (два застосунки, автодеплой незалежно при пуші — див. розділ "Deployment" у `backend/CLAUDE.md`) замість локального Docker Postgres вище; той самий код, інший `DATABASE_URL`.

### Пояснення рішень

**Модель даних: пласка таблиця, а не вкладене дерево.**
Кожна папка й файл — це рядок `{ id, type, name, parentId, createdAt, updatedAt }`, усі вони зберігаються в одному object store IndexedDB (`nodes`) з індексом по `parentId`. Дерево вкладених об'єктів здається привабливим на перший погляд, але тоді "показати вміст цієї папки", "перемістити вузол" і "видалити піддерево" вимагають обходу або перебудови всього дерева. З пласкою таблицею, індексованою по `parentId`, показ вмісту папки — це один індексований запит. (IndexedDB не може індексувати буквальний `null`, тому елементам верхнього рівня потрібен справжній рядковий `parentId` замість `null` — що саме це за значення, дивіться в наступному пункті.)

**Декілька дата-рум: id кожної кімнати сам є віртуальним коренем її дерева.**
Завдання просить дати користувачам можливість *створювати* дата-руми (у множині) — дата-рум це верхньорівневий диск, як "Мій диск" у Google Drive, і користувач може одночасно вести due diligence кількох угод, кожна з яких потребує ізольованої кімнати. Раніші ітерації цього проєкту мали лише один неявний дата-рум (глобальну мітку-сентінел `ROOT_ID`, під якою був батьком кожен елемент верхнього рівня), що насправді цього не підтримувало. Тепер дата-руми — це окрема сутність у власному object store IndexedDB (`datarooms: { id, name, createdAt, updatedAt }`), і id кімнати повторно використовується як `parentId` для всього на верхньому рівні цієї кімнати — точнісінько так само, як працювала стара глобальна мітка, лише в межах кожної кімнати окремо, а не спільно для всіх. Це означає, що існуючий object store `nodes`, його індекс `by-parent` і кожна CRUD-функція для папок/файлів у `repository.ts` не потребували жодних структурних змін — лише їхні дефолти `ROOT_ID` стали явним, завжди переданим `roomId`. Видалення дата-руму використовує ту саму рекурсивну логіку збору піддерева, що й видалення папки, просто починаючи з id кімнати замість id папки.

**Сховище: IndexedDB, метадані та вміст файлів у окремих object store.**
`localStorage` обмежений приблизно 5МБ і зберігає лише рядки — непридатний для реальних байтів PDF. IndexedDB не має такого практичного обмеження і зберігає `Blob` нативно. Метадані (`nodes`) і вміст файлів (`blobs`, з тим самим id вузла як ключем) розділені на два сховища, щоб показ вмісту папки ніколи не торкався (потенційно великих) бінарних даних.

**Дублікати імен: автоматичний суфікс при створенні/завантаженні, жорстка відмова при перейменуванні.**
Створення папки або завантаження файлу з іменем, яке вже є у сусіда, автоматично отримує суфікс `(1)`, `(2)`, ... — без діалогу, без переривання, так само як Drive/Провідник обробляють масові завантаження. Перейменування навмисно інше: це одна свідома дія, тож мовчки підставити інше ім'я, ніж те, що ввів користувач, було б заплутано. Перейменування в ім'я, яке вже зайняте, кидає `DuplicateNameError`; діалог залишається відкритим з *початковим* іменем, відновленим у полі вводу, щоб користувач міг одразу спробувати ще раз. Логіка підбору суфікса також відрізає вже наявний суфікс `" (N)"` перед додаванням нового, тож перейменування в ім'я, яке вже закінчується на `(1)`, не перетворюється на `(1) (1)` — коректно стає `(2)`.

**Міжвкладкове блокування "в використанні" через Web Locks API.**
Відкриття PDF у переглядачі або навіть просто перехід у папку чи дата-рум отримує `shared`-блокування, прив'язане до id цього елемента. Видалення чи перейменування спершу намагається отримати `exclusive`-блокування на нього (а для видалення папки чи дата-руму — на кожен файл/папку в його піддереві) з `ifAvailable: true` — неблокуюча перевірка. Якщо блокування утримує інша вкладка, дія відхиляється з повідомленням, що називає конкретний файл/папку/дата-рум і просить закрити його в іншій вкладці. Це діє і на рівні дата-руму — кімнату не можна перейменувати чи видалити з однієї вкладки, поки інша переглядає щось усередині неї. Обрано саме це рішення, а не схему на `localStorage` з heartbeat, тому що браузер сам звільняє Web Locks при закритті вкладки чи її аварійному завершенні — не потрібна логіка очищення "застряглих" блокувань, у якій легко помилитися.

**Валідація живе на рівні репозиторію, а не лише в UI.**
Кожна функція-мутація в `src/lib/store/repository.ts` (`createFolder`, `uploadFile`, `renameNode`, `deleteNode`) самостійно перевіряє свої передумови (непорожнє ім'я, лише PDF, ліміт 20МБ, відсутність колізії імен, відсутність блокування) незалежно від того, що вже перевірив UI, який її викликав. Деактивована кнопка Save — це зручність UX, а не межа безпеки: сама функція має бути коректною незалежно від UI, оскільки її можна викликати напряму (наприклад, з devtools), обійшовши будь-яку неактивну кнопку.

**Тема: власні світла/темна палітри, а не дефолтні з shadcn.**
Світла тема — тепла, малонасичена слонова кістка, а не стерильно-білий; темна тема — десатурований темно-синій, а не нейтрально-сірий, з синім акцентним кольором. Обидві визначені як CSS custom properties у форматі `oklch()` у `src/index.css`, перемикаються додаванням/зняттям класу `.dark` на `<html>`. Хук `useTheme` зберігає вибір у `localStorage` і при першому завантаженні орієнтується на системну `prefers-color-scheme`.

**Помітність важливіша за мінімалізм для меню дій рядка.**
Кнопка дій "⋮" на кожному рядку завжди видима (приглушеного кольору), а не прихована до наведення — користувач, що переглядає список, має одразу розуміти, що в рядків є доступні дії; це важливіше, ніж трохи чистіший вигляд у стані спокою. При наведенні/фокусі/відкритому меню вона стає яскравішою.

**Фокус + підсвітка після створення/перейменування.**
Після створення чи перейменування папки або файлу цей рядок отримує справжній DOM-фокус, прокручується у видиму область і на мить підсвічується — щоб у довгому списку користувач не губився в пошуках того, що щойно створив.

**Суворіші правила лінтера React Compiler вплинули на кілька патернів.**
Проєкт використовує React Compiler (`babel-plugin-react-compiler`) і супутнє ESLint-правило `react-hooks/set-state-in-effect`, яке позначає поширений патерн "синхронізувати проп у локальний стан через `useEffect`" (використовувався для скидання стану форми діалогу під кожну ціль, або скидання завантажених лічильників під кожен вузол). Виправлення, застосоване всюди (`RenameDialog`, `PdfViewerDialog`, `DeleteConfirmDialog`) — рекомендоване командою React: винести дочірній компонент з `key={id цілі}`, щоб зміна цілі перемонтовувала його і природно скидала стан без жодного ефекту.

### Структура проєкту

```
src/
  lib/
    db/            Схема IndexedDB (schema.ts) та з'єднання (db.ts, DB v2: сховища datarooms/nodes/blobs)
    store/
      repository.ts  Весь CRUD + валідація — єдиний модуль, що напряму працює з IndexedDB
      viewLock.ts     Обгортка над Web Locks API для міжвкладкового трекінгу "в використанні"
    format.ts        Хелпери formatBytes / formatDate / folderWarning
    utils.ts          cn() (clsx + tailwind-merge), конвенція shadcn
  hooks/
    useDataRoom.ts      Завантажує/змінює вміст однієї папки в межах кімнати; використовується DataRoomPage
    useDataRoomList.ts  Завантажує/змінює список дата-рум верхнього рівня; використовується DataRoomListPage
    useTheme.ts         Стан світлої/темної теми + збереження
  components/
    ui/                     Згенеровані примітиви shadcn/ui (button, dialog, dropdown-menu, ...)
    NodeRowShell.tsx        Спільна "обгортка" рядка (іконка, tooltip з обрізаним іменем, меню дій) — generic над будь-чим із { name, createdAt }, тож FolderRow/FileRow/DataRoomRow всі перевикористовують її
    FolderRow.tsx / FileRow.tsx / DataRoomRow.tsx   Тонкі обгортки над NodeRowShell, по одній на тип рядка
    NodeList.tsx            Область вмісту папки: skeleton завантаження, порожній стан, список рядків
    UploadDropzone.tsx      Обгортка drag-and-drop для завантаження
    DataRoomList.tsx        Область списку дата-рум: skeleton завантаження, порожній стан, список рядків
    Breadcrumbs.tsx         "All Datarooms > назва кімнати > вкладені папки..."
    CreateDialog.tsx        Generic діалог "створити X" (title/label/дефолтне ім'я як пропси) — використовується і для папок, і для дата-рум
    RenameDialog.tsx        Generic діалог перейменування — працює для будь-чого з { id, name } (папки, файли, дата-руми)
    DeleteConfirmDialog.tsx Generic діалог підтвердження видалення — проп `isContainer` вирішує, чи завантажувати й показувати кількість вкладених елементів
    PdfViewerDialog.tsx
    ThemeToggle.tsx
  pages/
    DataRoomListPage.tsx  Стартова сторінка: список дата-рум, створення/перейменування/видалення
    DataRoomPage.tsx      Вміст одного дата-руму: тулбар, drag-and-drop, діалоги, список
  App.tsx                 Маршрути: "/", "/room/:roomId", "/room/:roomId/folder/:id"
```

### Оброблені граничні випадки

- Дублікати імен папок/файлів при створенні, завантаженні та перейменуванні (див. вище)
- Відхилення не-PDF файлів (`Only PDF files are supported.`)
- Відхилення порожніх (0 байт) файлів (`The file is empty.`)
- Відхилення файлів понад 20МБ, з лімітом у повідомленні
- Скасування системного діалогу вибору файлу нічого не робить (без помилок, без фантомних записів)
- Видалення чи перейменування файлу/папки/дата-руму, відкритих в іншій вкладці браузера, блокується з конкретним повідомленням
- Рекурсивне видалення прибирає всі вкладені файли й папки (та їхні blob'и) на будь-якій глибині — і при видаленні папки, і при видаленні цілого дата-руму
- Дуже довгі імена та імена зі спецсимволами приймаються, візуально обрізаються, повне ім'я доступне через tooltip (показується лише коли ім'я справді обрізане) і мітку для скрінрідера
- Перейменування/створення з порожнім або пробільним іменем відхиляється і в UI (неактивна кнопка), і незалежно на рівні репозиторію
- Дублікати імен дата-рум автоматично отримують суфікс при створенні й жорстко відхиляються при перейменуванні — так само, як папки/файли
- Повернення на застарілий URL папки, яку вже видалено, повертає на корінь того дата-руму; повернення на застарілий URL дата-руму, який вже видалено, повертає на список дата-рум — і в обох випадках тост показується рівно один раз навіть під подвійним викликом ефектів React StrictMode

### Що не реалізовано (поза межами цього етапу)

> Два пункти нижче описували початковий, чисто фронтендовий етап проєкту (тестове завдання), де все жило в IndexedDB одного браузера без сервера. Це відтоді повністю замінено справжнім бекендом і автентифікацією, описаними в "Локальне розгортання" вище — залишено тут для історії, а не тому що досі актуально.
> - ~~Немає бекенду / синхронізації між користувачами.~~ Тепер справжній бекенд на NestJS + PostgreSQL з ізоляцією даних по користувачах, деплоїться незалежно від фронтенду.
> - ~~Немає автентифікації.~~ Тепер email/пароль + вхід через Google (на основі JWT).

- **Немає пошуку чи фільтрації за вмістом.**
- **Немає переміщення / drag-and-drop між папками** (підтримується лише drag-and-drop для *завантаження*).
- **Немає доданого автоматизованого набору тестів.** Кожна функція в цьому проєкті перевірялася наскрізно на реальному застосунку за допомогою Playwright під час розробки (відтворення сценарію, керування UI, перевірка стану DOM/IndexedDB, скриншоти для візуальної перевірки), а не написанням і комітом тестових файлів — це доречно для обсягу тестового завдання, але справжній набір тестів (Vitest + Testing Library для репозиторію/хуків, Playwright для кількох наскрізних сценаріїв) був би логічним наступним кроком.
