# Math Teacher Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a secure, accessible, tested, mathematically reliable first public version of the existing Math Teacher application.

**Architecture:** Keep the React/Vite client and Express/TypeScript server, but extract validation, tutor-history construction, camera-session management, and browser persistence into focused modules. Remove all in-app source distribution and GitHub mutation capabilities; expose only validated tutor and ephemeral-camera APIs.

**Tech Stack:** React 19, TypeScript, Vite, Express, Google GenAI SDK, Vitest, Testing Library, Supertest, Axe.

**Spec:** `docs/superpowers/specs/2026-10-16-math-teacher-hardening-design.md`

## Global Constraints

- Publish only to `gonzalosabatervila-a11y/Math-teacher`; no email or other external communication.
- Keep all Gemini credentials server-side and exclude every real secret from Git, logs, client bundles, and HTTP error bodies.
- Preserve the current React/Vite/TypeScript/Express product and its core tutor, timer, camera, syllabus, and postmortem flows.
- Add no accounts, database, payments, hosting deployment, or financial-advice behavior.
- Implement behavior changes test-first and run the complete suite plus the production build before publication.

## Review Focus

- Corrupt or oversized `localStorage` data must fall back safely without freezing startup; covered in Task 5.
- A valid image data URL with misleading media metadata must be rejected rather than forwarded; covered in Task 3.
- Expired camera credentials and mismatched read/write credentials must both return a non-revealing error; covered in Task 4.
- Disconnecting and reconnecting SSE clients must not retain duplicate subscribers; covered in Task 4.
- Keyboard-only users must be able to open, use, and close every dialog while focus returns to the trigger; covered in Task 6.

---

### Task 1: Establish a reproducible baseline and test harness

**Files:**
- Modify: `package.json`
- Modify: `.gitignore`
- Modify: `.env.example`
- Create: `vitest.config.ts`
- Create: `src/test/setup.ts`
- Create: `src/test/smoke.test.tsx`

**Interfaces:**
- Consumes: existing application entry point.
- Produces: `npm test`, `npm run test:coverage`, `npm run lint`, and `npm run build` commands used by every later task.

- [ ] **Step 1: Install the locked dependencies without changing application behavior and record the exact baseline results of `npm run lint` and `npm run build`.**
- [ ] **Step 2: Add a failing smoke test named `renders the classroom heading` that mounts `App` and asserts the visible application heading.**
- [ ] **Step 3: Run `npm test -- src/test/smoke.test.tsx` and verify it fails because the test environment is not configured.**
- [ ] **Step 4: Configure Vitest, jsdom, Testing Library, Axe, Supertest, coverage, and deterministic browser API stubs; add scripts without changing production behavior.**
- [ ] **Step 5: Run the smoke test, full suite, type check, and build; record any inherited failure by exact command and message.**
- [ ] **Step 6: Commit with `test: establish application baseline`.**

### Task 2: Remove dangerous source and GitHub mutation features

**Files:**
- Modify: `server.ts`
- Modify: `src/App.tsx`
- Delete: `src/components/ExportModal.tsx`
- Delete: `public/profesor-matematicas-preuniversitarias.tar.gz`
- Delete: `profesor-matematicas-preuniversitarias.tar.gz`
- Create: `src/test/removed-surfaces.test.ts`

**Interfaces:**
- Consumes: the baseline server and navigation.
- Produces: a product with no `/api/github/push`, `/api/download-zip`, token input, shell execution, or bundled source archive.

- [ ] **Step 1: Write tests asserting both removed endpoints return 404 and the client contains no GitHub-token or source-download controls.**
- [ ] **Step 2: Run `npm test -- src/test/removed-surfaces.test.ts` and verify the assertions fail against the inherited behavior.**
- [ ] **Step 3: Remove the two endpoints, child-process/archiver use, export modal, related icons/state, archives, and now-unused dependencies.**
- [ ] **Step 4: Run the focused test, full suite, type check, and build.**
- [ ] **Step 5: Commit with `security: remove repository mutation surfaces`.**

### Task 3: Validate and harden the tutor API

**Files:**
- Create: `server/validation.ts`
- Create: `server/tutor.ts`
- Create: `server/errors.ts`
- Create: `server/app.ts`
- Modify: `server.ts`
- Create: `server/validation.test.ts`
- Create: `server/tutor.test.ts`
- Create: `server/app.test.ts`

**Interfaces:**
- Produces: `parseTutorRequest(input: unknown): TutorRequest`, `buildTutorContents(request: TutorRequest): Content[]`, `createApp(dependencies: AppDependencies): Express`, and stable public error `{ error: string; code: string }`.
- `TutorRequest` allows at most 40 messages, 4,000 characters per message, a 6 MiB JPEG/PNG image, weeks 0–13, sessions 1–3, and protocol steps 1–7.

- [ ] **Step 1: Write failing validator tests for valid requests, bad roles, out-of-range context, excessive history/text/image size, malformed base64, and mismatched image MIME signatures.**
- [ ] **Step 2: Run `npm test -- server/validation.test.ts` and verify failures are caused by missing interfaces.**
- [ ] **Step 3: Implement typed validation and normalized output without logging request content.**
- [ ] **Step 4: Write failing tutor-history tests for leading assistant removal, same-role merging, bounded history, context insertion, and visual uncertainty instructions.**
- [ ] **Step 5: Implement `buildTutorContents` and refine the system instruction to separate curriculum, extensions, financial analogies, and uncertainty.**
- [ ] **Step 6: Write failing API tests for 400/413/429 responses, provider failure redaction, absent key startup behavior, and security headers.**
- [ ] **Step 7: Implement `createApp`, route-specific size/rate controls, safe errors, security headers, and configurable `GEMINI_MODEL`; keep provider calls injectable in tests.**
- [ ] **Step 8: Run focused tests, full suite, type check, and build.**
- [ ] **Step 9: Commit with `security: validate and isolate tutor requests`.**

### Task 4: Replace camera pairing with authenticated ephemeral sessions

**Files:**
- Create: `server/camera-session-store.ts`
- Create: `server/camera-session-store.test.ts`
- Modify: `server/app.ts`
- Create: `server/camera-api.test.ts`
- Modify: `src/components/CameraPaperView.tsx`
- Modify: `src/components/MobileCamView.tsx`

**Interfaces:**
- Produces: `CameraSessionStore.create()`, `.write(id, credential, frame)`, `.read(id, credential)`, `.subscribe(id, credential, listener)`, `.delete(id)`, and `.sweep(now)`.
- Session creation returns distinct cryptographically random `sessionId`, `writeCredential`, and `readCredential`; TTL is 2 hours and only the latest frame is retained.

- [ ] **Step 1: Write failing store tests for cryptographic identifiers, distinct credentials, authorization, expiry, last-frame replacement, cleanup, and subscriber removal.**
- [ ] **Step 2: Run the focused store test and verify it fails because the store does not exist.**
- [ ] **Step 3: Implement the in-memory store using injected clock and random-byte functions.**
- [ ] **Step 4: Write failing API tests for explicit initialization, unknown/expired sessions, wrong credentials, frame limits, JPEG/PNG validation, heartbeat, disconnect, and reconnect without duplicate subscribers.**
- [ ] **Step 5: Implement the camera API and update both clients to use returned credentials without persisting images or secrets beyond the active session.**
- [ ] **Step 6: Run camera tests, full suite, type check, and build.**
- [ ] **Step 7: Commit with `security: protect ephemeral camera sessions`.**

### Task 5: Make browser persistence and the main workflow resilient

**Files:**
- Create: `src/utils/persistence.ts`
- Create: `src/utils/persistence.test.ts`
- Create: `src/hooks/useTutorSession.ts`
- Create: `src/hooks/useTutorSession.test.tsx`
- Modify: `src/App.tsx`
- Modify: `src/components/ClassroomFeed.tsx`

**Interfaces:**
- Produces: `loadTutorState(storage: Storage): PersistedTutorState`, `saveTutorState(storage: Storage, state: PersistedTutorState): void`, and `useTutorSession()`.
- Persist only validated week/session settings and the newest 40 text messages; never persist image data.

- [ ] **Step 1: Write failing persistence tests for missing, malformed, oversized, and out-of-range values plus image stripping and message truncation.**
- [ ] **Step 2: Run the persistence test and verify expected failures.**
- [ ] **Step 3: Implement validated persistence with safe defaults and quota-error handling.**
- [ ] **Step 4: Write failing hook tests for send, retry, cancellation on unmount, duplicate-submit prevention, and restoration after an API error.**
- [ ] **Step 5: Implement the session hook and refactor `App`/`ClassroomFeed` to use it while preserving visible behavior.**
- [ ] **Step 6: Run focused tests, full suite, type check, and build.**
- [ ] **Step 7: Commit with `refactor: make tutor session state resilient`.**

### Task 6: Correct accessibility and simplify interaction hierarchy

**Files:**
- Create: `src/components/Dialog.tsx`
- Create: `src/components/Dialog.test.tsx`
- Modify: `src/App.tsx`
- Modify: `src/components/ClassroomFeed.tsx`
- Modify: `src/components/SessionTimeline.tsx`
- Modify: `src/components/SyllabusSelector.tsx`
- Modify: `src/components/PostmortemModal.tsx`
- Modify: `src/components/CameraPaperView.tsx`
- Modify: `src/components/MobileCamView.tsx`
- Modify: `src/index.css`
- Create: `src/test/accessibility.test.tsx`

**Interfaces:**
- Produces: reusable `Dialog` with labelled title, initial focus, focus trap, Escape close, and focus restoration; accessible application landmarks and live regions.

- [ ] **Step 1: Write failing dialog tests for keyboard opening/closing, focus trap, focus restoration, and labelling.**
- [ ] **Step 2: Run the focused dialog test and verify expected failures.**
- [ ] **Step 3: Implement `Dialog` and migrate syllabus and postmortem overlays.**
- [ ] **Step 4: Write failing accessibility tests for landmarks, icon-button names, label associations, status announcements, keyboard flow, and no serious Axe violations.**
- [ ] **Step 5: Add accessible names, labels, live regions, visible focus, reduced-motion rules, and a clearer primary/secondary action hierarchy.**
- [ ] **Step 6: Run component tests, Axe checks, full suite, type check, and build.**
- [ ] **Step 7: Commit with `feat: improve classroom accessibility and focus`.**

### Task 7: Correct mathematical content and document pedagogical boundaries

**Files:**
- Modify: `src/data/syllabus.ts`
- Create: `src/data/syllabus.test.ts`
- Modify: `server/tutor.ts`
- Modify: `README.md`

**Interfaces:**
- Produces: syllabus entries that explicitly label `curricular` and `extension` topics and describe financial examples as conceptual transfer rather than advice or exact market models.

- [ ] **Step 1: Write failing content tests for weeks 0–13 uniqueness/order, non-empty goals, curriculum/extension labels, domain/hypothesis notes for L'Hôpital and inverses, and financial-example disclaimers.**
- [ ] **Step 2: Run the syllabus test and verify expected failures.**
- [ ] **Step 3: Correct and normalize the syllabus, including calculus/probability assumptions, Black–Scholes/lognormal caveats, and adaptive use of the seven-step protocol.**
- [ ] **Step 4: Rewrite README sections for purpose, pedagogy, privacy, limitations, installation, environment, commands, architecture, and safe deployment.**
- [ ] **Step 5: Run content tests, full suite, type check, and build.**
- [ ] **Step 6: Commit with `docs: clarify curriculum and application limits`.**

### Task 8: Final verification, audit report, and GitHub publication

**Files:**
- Create: `docs/audit-report.md`
- Modify: any file only when a fresh verification failure identifies a defect, following a new red-green test cycle.

**Interfaces:**
- Consumes: all prior tasks.
- Produces: evidence-backed audit report, clean Git history, and verified `main` on `gonzalosabatervila-a11y/Math-teacher`.

- [ ] **Step 1: Run a secret scan, dependency audit, full tests with coverage, `npm run lint`, and `npm run build`; record exact outputs and unresolved limitations.**
- [ ] **Step 2: Start the production server with a non-secret stub provider and exercise health, tutor validation, camera pairing, SSE teardown, and SPA fallback.**
- [ ] **Step 3: Perform keyboard-only and responsive visual checks of the principal desktop and mobile-camera flows; record what was manually checked.**
- [ ] **Step 4: Write `docs/audit-report.md` with severity, evidence, implemented remediation, tests, residual risks, and explicit non-actions.**
- [ ] **Step 5: Verify `git status`, inspect the complete diff and commit graph, and confirm no generated archives, secrets, or unrelated files are tracked.**
- [ ] **Step 6: Add the exact GitHub remote, fetch it, re-confirm it has no branches/commits, and push local `main` without force.**
- [ ] **Step 7: Read back the remote branch and head commit through GitHub; report the real repository and Drive URLs.**
- [ ] **Step 8: Commit any report-only finalization with `docs: publish Math Teacher audit report` before the non-force push.**
