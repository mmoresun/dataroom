# Dataroom

A virtual data room MVP — create nested folders, upload PDF files, rename, view, and delete, all in the browser. Built as a take-home assignment for a due-diligence-style document repository (think a lightweight Google Drive scoped to PDFs).

**Languages / Мови:** [English](#english) · [Українська](#українська)

---

## English

### Live demo

Run it locally with the setup instructions below — no backend or account needed.

### Tech stack

- **React 19 + TypeScript + Vite** — required by the assignment
- **Tailwind CSS v4** + **shadcn/ui** — the company's stated stack; shadcn isn't a component *library* you install, it's a code generator: `npx shadcn add button` copies the component's source straight into `src/components/ui/`, styled with Tailwind and built on Radix UI primitives for accessibility (focus traps, keyboard nav, ARIA). You own and can edit that code.
- **react-router-dom** — folder navigation lives in the URL (`/folder/:id`), so the back button, refresh, and deep links all work correctly
- **idb** — a small Promise wrapper around the native IndexedDB API
- **sonner** — toast notifications
- **lucide-react** — icons

### Setup

```bash
npm install
npm run dev       # start the dev server (http://localhost:5173)
npm run build     # type-check + production build
npm run preview   # preview the production build locally
npm run lint      # eslint
```

Requires Node 20+ (Node 22+ recommended — one dev dependency prints an engine warning on Node 20 but everything still runs correctly).

No environment variables, no backend, no database server. All state lives in the browser's IndexedDB.

### Design decisions

**Data model: a flat table, not a nested tree.**
Every folder and file is a row with `{ id, type, name, parentId, createdAt, updatedAt }`, all stored in a single IndexedDB object store (`nodes`) indexed by `parentId`. A nested-object tree looks tempting at first, but it makes "list this folder's contents," "move a node," and "delete a subtree" all require walking or rebuilding the whole tree. With a flat table indexed by `parentId`, listing a folder is a single indexed lookup, and there's a real (virtual) root: a sentinel `ROOT_ID` constant is used as the `parentId` for top-level items — it's never itself stored as a node. (IndexedDB can't index a literal `null`, which is the other reason for a sentinel instead of `parentId: null`.)

**Storage: IndexedDB, with metadata and file bytes in separate object stores.**
`localStorage` is capped around 5MB and stores strings only — unusable for real PDF bytes. IndexedDB has no such practical limit and stores `Blob`s natively. Metadata (`nodes`) and file contents (`blobs`, keyed by the same node id) are split into two stores so that listing a folder never has to touch the (potentially large) binary payloads.

**Duplicate names: silently auto-suffixed on create/upload, rejected outright on rename.**
Creating a folder or uploading a file named the same as an existing sibling gets a `(1)`, `(2)`, ... suffix automatically — no dialog, no interruption, matching how Drive/Explorer handle bulk uploads. Renaming is different by design: it's a single, deliberate action, so silently substituting a different name than what the user typed would be confusing. Renaming to a name that's already taken throws a `DuplicateNameError`; the dialog stays open with the *original* name restored in the input so the user can immediately try again. The suffix-picking logic also strips any existing `" (N)"` suffix before appending a new one, so renaming into a name that already ends in `(1)` doesn't stack into `(1) (1)` — it correctly bumps to `(2)`.

**Cross-tab "in use" locking via the Web Locks API.**
Opening a PDF in the viewer, or simply browsing into a folder, acquires a `shared` Web Lock scoped to that node's id. Deleting or renaming a node first tries to acquire an `exclusive` lock on it (and, for folder deletes, on every file/folder in its subtree) with `ifAvailable: true` — a non-blocking check. If it's held elsewhere, the action is rejected with a message naming the specific file/folder and telling the user to close it in the other tab first. This was chosen over a `localStorage` + heartbeat scheme because the browser releases Web Locks automatically on tab close or crash — there's no stale-lock cleanup logic to get wrong.

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
    db/            IndexedDB schema (schema.ts) and connection (db.ts)
    store/
      repository.ts  All CRUD + validation — the only module that talks to IndexedDB directly
      viewLock.ts     Web Locks API wrapper for cross-tab "in use" tracking
    format.ts        formatBytes / formatDate helpers
    utils.ts          cn() (clsx + tailwind-merge), shadcn convention
  hooks/
    useDataRoom.ts    Loads/mutates one folder's contents; used by the page
    useTheme.ts       Light/dark theme state + persistence
  components/
    ui/               Generated shadcn/ui primitives (button, dialog, dropdown-menu, ...)
    NodeRow.tsx        A single file/folder row: icon, name, size/count, date, actions menu
    Breadcrumbs.tsx
    CreateFolderDialog.tsx
    RenameDialog.tsx
    DeleteConfirmDialog.tsx
    PdfViewerDialog.tsx
    ThemeToggle.tsx
  pages/
    DataRoomPage.tsx  Ties everything together: toolbar, drag-and-drop, dialogs, list
  App.tsx             Routes: "/" and "/folder/:id"
```

### Edge cases handled

- Duplicate folder/file names on create, upload, and rename (see above)
- Non-PDF uploads rejected (`Only PDF files are supported.`)
- Empty (0-byte) files rejected (`The file is empty.`)
- Files over 20MB rejected, with the limit stated in the message
- Cancelling the native file picker does nothing (no error, no phantom entries)
- Deleting or renaming a file/folder open in another browser tab is blocked with a specific message
- Recursive delete removes every nested file and folder (and their blobs) at any depth
- Very long or special-character names are accepted, truncated visually, full name available via tooltip and screen-reader label
- Renaming/creating with an empty or whitespace-only name is rejected both in the UI (disabled button) and in the repository layer independently

### What's not implemented (out of scope for this pass)

- **No backend / multi-user sync.** Everything lives in one browser's IndexedDB — it's a single-user mock, not shared storage. Deploying the frontend (e.g. to Vercel) would make the *app* public, not the data: each visitor gets their own empty, local data room.
- **No authentication.**
- **No search or content filtering.**
- **No move / drag-and-drop between folders** (only drag-and-drop *upload* is supported).
- **No automated test suite committed.** Every feature in this project was verified end-to-end against the running app with Playwright during development (creating the scenario, driving the UI, checking the resulting DOM/IndexedDB state, screenshotting for visual review) rather than by writing and committing test files — appropriate for the scope of a take-home, but a real test suite (Vitest + Testing Library for the repository/hooks, Playwright for a few end-to-end flows) would be a natural next step.

---

## Українська

### Технологічний стек

- **React 19 + TypeScript + Vite** — вимога завдання
- **Tailwind CSS v4** + **shadcn/ui** — заявлений стек компанії; shadcn — це не бібліотека компонентів, яку встановлюють, а генератор коду: `npx shadcn add button` копіює вихідний код компонента прямо в `src/components/ui/`, стилізований Tailwind і побудований на примітивах Radix UI (фокус-пастки, навігація з клавіатури, ARIA). Цей код належить вам, і його можна редагувати.
- **react-router-dom** — навігація по папках живе в URL (`/folder/:id`), тож кнопка "назад", оновлення сторінки й прямі посилання працюють коректно
- **idb** — невелика обгортка над нативним IndexedDB API на Promise
- **sonner** — тости-сповіщення
- **lucide-react** — іконки

### Встановлення та запуск

```bash
npm install
npm run dev       # запустити дев-сервер (http://localhost:5173)
npm run build     # перевірка типів + продакшн-збірка
npm run preview   # локальний перегляд продакшн-збірки
npm run lint      # eslint
```

Потрібен Node 20+ (рекомендується Node 22+ — одна з dev-залежностей виводить попередження про версію на Node 20, але все одно коректно працює).

Змінні середовища, бекенд чи сервер бази даних не потрібні. Весь стан зберігається в IndexedDB браузера.

### Пояснення рішень

**Модель даних: пласка таблиця, а не вкладене дерево.**
Кожна папка й файл — це рядок `{ id, type, name, parentId, createdAt, updatedAt }`, усі вони зберігаються в одному object store IndexedDB (`nodes`) з індексом по `parentId`. Дерево вкладених об'єктів здається привабливим на перший погляд, але тоді "показати вміст цієї папки", "перемістити вузол" і "видалити піддерево" вимагають обходу або перебудови всього дерева. З пласкою таблицею, індексованою по `parentId`, показ вмісту папки — це один індексований запит, а справжній (віртуальний) корінь реалізовано через константу-мітку `ROOT_ID`, яка використовується як `parentId` для елементів верхнього рівня — сам він ніколи не зберігається як вузол. (IndexedDB не може індексувати буквальний `null`, що є ще однією причиною використати мітку замість `parentId: null`.)

**Сховище: IndexedDB, метадані та вміст файлів у окремих object store.**
`localStorage` обмежений приблизно 5МБ і зберігає лише рядки — непридатний для реальних байтів PDF. IndexedDB не має такого практичного обмеження і зберігає `Blob` нативно. Метадані (`nodes`) і вміст файлів (`blobs`, з тим самим id вузла як ключем) розділені на два сховища, щоб показ вмісту папки ніколи не торкався (потенційно великих) бінарних даних.

**Дублікати імен: автоматичний суфікс при створенні/завантаженні, жорстка відмова при перейменуванні.**
Створення папки або завантаження файлу з іменем, яке вже є у сусіда, автоматично отримує суфікс `(1)`, `(2)`, ... — без діалогу, без переривання, так само як Drive/Провідник обробляють масові завантаження. Перейменування навмисно інше: це одна свідома дія, тож мовчки підставити інше ім'я, ніж те, що ввів користувач, було б заплутано. Перейменування в ім'я, яке вже зайняте, кидає `DuplicateNameError`; діалог залишається відкритим з *початковим* іменем, відновленим у полі вводу, щоб користувач міг одразу спробувати ще раз. Логіка підбору суфікса також відрізає вже наявний суфікс `" (N)"` перед додаванням нового, тож перейменування в ім'я, яке вже закінчується на `(1)`, не перетворюється на `(1) (1)` — коректно стає `(2)`.

**Міжвкладкове блокування "в використанні" через Web Locks API.**
Відкриття PDF у переглядачі або навіть просто перехід у папку отримує `shared`-блокування, прив'язане до id цього вузла. Видалення чи перейменування вузла спершу намагається отримати `exclusive`-блокування на нього (а для видалення папки — на кожен файл/папку в її піддереві) з `ifAvailable: true` — неблокуюча перевірка. Якщо блокування утримує інша вкладка, дія відхиляється з повідомленням, що називає конкретний файл/папку і просить закрити його в іншій вкладці. Обрано саме це рішення, а не схему на `localStorage` з heartbeat, тому що браузер сам звільняє Web Locks при закритті вкладки чи її аварійному завершенні — не потрібна логіка очищення "застряглих" блокувань, у якій легко помилитися.

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
    db/            Схема IndexedDB (schema.ts) та з'єднання (db.ts)
    store/
      repository.ts  Весь CRUD + валідація — єдиний модуль, що напряму працює з IndexedDB
      viewLock.ts     Обгортка над Web Locks API для міжвкладкового трекінгу "в використанні"
    format.ts        Хелпери formatBytes / formatDate
    utils.ts          cn() (clsx + tailwind-merge), конвенція shadcn
  hooks/
    useDataRoom.ts    Завантажує/змінює вміст однієї папки; використовується сторінкою
    useTheme.ts       Стан світлої/темної теми + збереження
  components/
    ui/               Згенеровані примітиви shadcn/ui (button, dialog, dropdown-menu, ...)
    NodeRow.tsx        Один рядок файлу/папки: іконка, ім'я, розмір/кількість, дата, меню дій
    Breadcrumbs.tsx
    CreateFolderDialog.tsx
    RenameDialog.tsx
    DeleteConfirmDialog.tsx
    PdfViewerDialog.tsx
    ThemeToggle.tsx
  pages/
    DataRoomPage.tsx  Об'єднує все: тулбар, drag-and-drop, діалоги, список
  App.tsx             Маршрути: "/" та "/folder/:id"
```

### Оброблені граничні випадки

- Дублікати імен папок/файлів при створенні, завантаженні та перейменуванні (див. вище)
- Відхилення не-PDF файлів (`Only PDF files are supported.`)
- Відхилення порожніх (0 байт) файлів (`The file is empty.`)
- Відхилення файлів понад 20МБ, з лімітом у повідомленні
- Скасування системного діалогу вибору файлу нічого не робить (без помилок, без фантомних записів)
- Видалення чи перейменування файлу/папки, відкритих в іншій вкладці браузера, блокується з конкретним повідомленням
- Рекурсивне видалення прибирає всі вкладені файли й папки (та їхні blob'и) на будь-якій глибині
- Дуже довгі імена та імена зі спецсимволами приймаються, візуально обрізаються, повне ім'я доступне через tooltip і мітку для скрінрідера
- Перейменування/створення з порожнім або пробільним іменем відхиляється і в UI (неактивна кнопка), і незалежно на рівні репозиторію

### Що не реалізовано (поза межами цього етапу)

- **Немає бекенду / синхронізації між користувачами.** Все живе в IndexedDB одного браузера — це мок для одного користувача, а не спільне сховище. Розгортання фронтенду (наприклад, на Vercel) зробить публічним *застосунок*, а не дані: кожен відвідувач отримає свою власну порожню локальну дата-руму.
- **Немає автентифікації.**
- **Немає пошуку чи фільтрації за вмістом.**
- **Немає переміщення / drag-and-drop між папками** (підтримується лише drag-and-drop для *завантаження*).
- **Немає доданого автоматизованого набору тестів.** Кожна функція в цьому проєкті перевірялася наскрізно на реальному застосунку за допомогою Playwright під час розробки (відтворення сценарію, керування UI, перевірка стану DOM/IndexedDB, скриншоти для візуальної перевірки), а не написанням і комітом тестових файлів — це доречно для обсягу тестового завдання, але справжній набір тестів (Vitest + Testing Library для репозиторію/хуків, Playwright для кількох наскрізних сценаріїв) був би логічним наступним кроком.
