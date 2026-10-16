# Math Teacher Personal Premium Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn Math Teacher into a reliable local-first personal tutoring workspace with resumable sessions, structured review, safer camera pairing, clearer tutor responses, responsive navigation, and automated release checks.

**Architecture:** A versioned `PersonalStateRepository` is the single browser-storage boundary. Focused session, timer, review, tutor-response, and camera clients feed three React screens composed by a thin application shell. The existing Express server remains stateless apart from bounded ephemeral camera and rate-limit maps.

**Tech Stack:** React 19, TypeScript, Express 4, Vite 8, Vitest, Testing Library, Axe, Playwright, Google Gemini SDK, localStorage

**Spec:** `docs/superpowers/specs/2026-10-16-math-teacher-personal-premium-design.md`

## Global Constraints

- One trusted user; no account, authentication UI, cloud database, analytics, payment, social-sharing, email, or external-messaging feature.
- Personal learning data stays in browser storage; images, credentials and secrets are never persisted.
- Keep at most 50 completed sessions, 100 review items and 40 active-session messages.
- Review items created from a completed postmortem are due exactly 48 hours after completion.
- Camera sessions expire within two hours and retain only the latest frame in server memory.
- Long-lived camera read/write credentials must not appear in HTTP query strings, referrers or logs.
- Existing stone/amber visual identity remains; improve hierarchy and responsive behavior without a broad rebrand.
- Financial examples remain conceptual and are never advice, forecasts or exact-market claims.
- Major dependency migrations are excluded unless a verified defect requires one.
- Use TDD for behavior changes and commit each task independently.

## Review Focus

- **Corrupt or future-version backup:** Task 1 tests that import rejects it without changing current state.
- **Background/suspended timer:** Task 2 tests recovery from timestamps and caps a session at 60 minutes.
- **Provider returns malformed structured output:** Task 4 tests safe fallback and never renders an empty tutor message.
- **Camera reconnect after credential expiry:** Task 5 tests bounded retry, an expired state, and absence of secrets in URLs.
- **Interrupted active session followed by “Nueva sesión”:** Task 3 tests explicit confirmation and preservation until confirmation.

---

### Task 1: Versioned personal-state repository and local backup

**Files:**
- Create: `src/state/personal-state.ts`
- Create: `src/state/personal-state.test.ts`
- Create: `src/state/personal-state-repository.ts`
- Create: `src/state/personal-state-repository.test.ts`
- Create: `src/state/backup.ts`
- Create: `src/state/backup.test.ts`
- Modify: `src/types/tutor.ts`
- Replace: `src/utils/persistence.ts`
- Modify: `src/utils/persistence.test.ts`

**Interfaces:**
- Consumes: existing `ChatMessage`, `PostmortemData`, week/session bounds and legacy key `math_tutor_state_v1`.
- Produces: `PersonalStateV2`, `ActiveSession`, `CompletedSession`, `ReviewItem`, `UserPreferences`; `createDefaultPersonalState(now: number): PersonalStateV2`; `validatePersonalState(value: unknown): PersonalStateV2 | null`; `PersonalStateRepository.load(): PersonalStateV2`; `save(state: PersonalStateV2): void`; `clear(): void`; `exportBackup(state, exportedAt): string`; `importBackup(text): PersonalStateV2`.

- [ ] **Step 1: Write failing model and repository tests**

Test names and assertions:

```ts
it('migrates valid v1 week, session and text messages exactly once')
it('drops images and bounds active messages to the newest 40')
it('bounds history to 50 sessions and reviews to 100 items')
it('falls back without throwing on corrupt stored JSON')
it('does not mutate the current value when storage writes fail')
```

- [ ] **Step 2: Run the state tests and verify they fail because the v2 interfaces and repository do not exist**

Run: `npm test -- --run src/state/personal-state.test.ts src/state/personal-state-repository.test.ts`

- [ ] **Step 3: Implement the state interfaces, validators and `PersonalStateRepository`**

Use storage key `math_teacher_personal_state_v2`; remove the legacy key only after the migrated v2 write succeeds. Use dependency-injected `Storage` and `now` values in tests.

- [ ] **Step 4: Write failing backup tests**

```ts
it('round-trips a valid UTF-8 personal backup')
it('rejects a different format identifier or future schema version')
it('rejects invalid records without altering repository state')
```

- [ ] **Step 5: Implement `exportBackup` and `importBackup`**

Use format identifier `math-teacher-personal-backup`, schema version `2`, ISO export time, and the same validator as repository reads.

- [ ] **Step 6: Run focused and existing persistence tests**

Run: `npm test -- --run src/state src/utils/persistence.test.ts`
Expected: all tests pass.

- [ ] **Step 7: Commit**

```bash
git add src/state src/types/tutor.ts src/utils/persistence.ts src/utils/persistence.test.ts
git commit -m "feat: add versioned personal learning state"
```

### Task 2: Recoverable session timer, completion and review scheduling

**Files:**
- Create: `src/session/session-controller.ts`
- Create: `src/session/session-controller.test.ts`
- Create: `src/session/timer.ts`
- Create: `src/session/timer.test.ts`
- Create: `src/session/reviews.ts`
- Create: `src/session/reviews.test.ts`
- Create: `src/hooks/usePersonalSession.ts`
- Create: `src/hooks/usePersonalSession.test.tsx`

**Interfaces:**
- Consumes: Task 1 `PersonalStateRepository`, `ActiveSession`, `CompletedSession`, `ReviewItem`, `PostmortemData`.
- Produces: `startSession(state, selection, now): PersonalStateV2`; `finishSession(state, postmortem, now): PersonalStateV2`; `completeReview(state, reviewId, now): PersonalStateV2`; `elapsedSeconds(session, now): number`; `usePersonalSession({ repository, now, tickMs }): PersonalSessionController`.

- [ ] **Step 1: Write failing timer and workflow tests**

```ts
it('recovers elapsed time after a background gap from startedAt and accumulatedSeconds')
it('does not advance while paused and caps elapsed time at 3600 seconds')
it('finishes into immutable history and clears the active session')
it('schedules a variant problem exactly 48 hours after completion')
it('does not create a review when the variant problem is blank')
it('marks a review complete without assigning a score')
```

- [ ] **Step 2: Run focused tests and verify missing-module failures**

Run: `npm test -- --run src/session`

- [ ] **Step 3: Implement pure timer, session and review functions**

Store ISO timestamps and integer accumulated seconds; keep pure functions independent from React and storage.

- [ ] **Step 4: Write failing hook tests for debounced persistence and restoration**

Use fake timers; assert one repository write after 500 ms of rapid ticks and restored active state on mount.

- [ ] **Step 5: Implement `usePersonalSession` as the stateful boundary**

Expose selection, active-session actions, history, reviews, preferences and import/replace actions; keep camera frames outside it.

- [ ] **Step 6: Run focused tests and full type check**

Run: `npm test -- --run src/session src/hooks/usePersonalSession.test.tsx && npm run lint`

- [ ] **Step 7: Commit**

```bash
git add src/session src/hooks/usePersonalSession.ts src/hooks/usePersonalSession.test.tsx
git commit -m "feat: persist and recover personal sessions"
```

### Task 3: Personal app shell, Inicio, Sesión and Historial

**Files:**
- Create: `src/components/AppShell.tsx`
- Create: `src/components/AppShell.test.tsx`
- Create: `src/screens/HomeScreen.tsx`
- Create: `src/screens/HomeScreen.test.tsx`
- Create: `src/screens/SessionScreen.tsx`
- Create: `src/screens/SessionScreen.test.tsx`
- Create: `src/screens/HistoryScreen.tsx`
- Create: `src/screens/HistoryScreen.test.tsx`
- Create: `src/components/ConfirmDialog.tsx`
- Create: `src/components/ResponsiveWorkspaceTabs.tsx`
- Modify: `src/App.tsx`
- Modify: `src/components/PostmortemModal.tsx`
- Modify: `src/components/SessionTimeline.tsx`
- Modify: `src/index.css`

**Interfaces:**
- Consumes: Task 2 `PersonalSessionController`; existing syllabus, camera, timeline, classroom and postmortem components.
- Produces: navigation modes `home | session | history`; accessible responsive workspace tabs `paper | tutor`; confirmed session replacement; local backup download/import/reset controls.

- [ ] **Step 1: Write failing shell and workflow component tests**

```ts
it('shows Continuar when an active session exists and restores its context')
it('shows due reviews and recent completed sessions on Inicio')
it('keeps an active session when Nueva sesión confirmation is cancelled')
it('starts the selected replacement only after confirmation')
it('finishes through a structured postmortem and returns to Inicio')
it('imports only after confirmation and reports invalid backups accessibly')
```

- [ ] **Step 2: Run focused screen tests and verify missing components**

Run: `npm test -- --run src/components/AppShell.test.tsx src/screens`

- [ ] **Step 3: Implement `AppShell`, `HomeScreen` and `HistoryScreen`**

Add one visible `h1`, skip link, primary navigation and status feedback. Backup download uses a local Blob URL and import uses a file input; neither calls a server.

- [ ] **Step 4: Implement `SessionScreen` and confirmed new/finish flows**

Make `App.tsx` only select mobile-camera mode or compose `AppShell` with `usePersonalSession`.

- [ ] **Step 5: Write failing narrow-layout tab tests**

Assert tab roles, ArrowLeft/ArrowRight behavior, `aria-selected`, and preservation of both panels while switching.

- [ ] **Step 6: Implement `ResponsiveWorkspaceTabs` and compact session status**

Use CSS media queries so desktop displays both panels and narrow screens display one selected panel without losing its state.

- [ ] **Step 7: Run component, accessibility and full tests**

Run: `npm test -- --run src/components src/screens src/test/accessibility.test.tsx && npm test`

- [ ] **Step 8: Commit**

```bash
git add src/App.tsx src/components src/screens src/index.css
git commit -m "feat: add personal session workspace"
```

### Task 4: Structured tutor responses and progressive coaching

**Files:**
- Create: `server/tutor-response.ts`
- Create: `server/tutor-response.test.ts`
- Modify: `server/tutor.ts`
- Modify: `server/tutor.test.ts`
- Modify: `server/app.ts`
- Modify: `server/app.test.ts`
- Modify: `src/hooks/useTutorSession.ts`
- Modify: `src/hooks/useTutorSession.test.tsx`
- Modify: `src/types/tutor.ts`
- Modify: `src/components/ClassroomFeed.tsx`
- Create: `src/components/TutorResponseMeta.tsx`
- Create: `src/components/TutorResponseMeta.test.tsx`

**Interfaces:**
- Consumes: validated `TutorRequest` and Task 2 session context.
- Produces: `TutorReply { message: string; mode: 'question' | 'hint' | 'verification' | 'solution'; checks: string[]; uncertainty?: string }`; `parseTutorReply(value: unknown): TutorReply`; API body `{ reply: TutorReply }`.

- [ ] **Step 1: Write failing response-parser tests**

```ts
it('accepts and bounds a valid structured reply')
it('falls back safely from malformed JSON or an unknown mode')
it('never returns an empty student-facing message')
it('bounds checks and uncertainty text')
```

- [ ] **Step 2: Run parser tests and verify expected failures**

Run: `npm test -- --run server/tutor-response.test.ts`

- [ ] **Step 3: Implement `TutorReply`, parser and provider JSON instruction**

Allow at most five checks of 300 characters, a 4,000-character message and a 500-character uncertainty warning. The fallback mode is `question`.

- [ ] **Step 4: Update the server endpoint and its tests**

Inject raw provider text in tests; assert stable structured output and redact malformed provider details.

- [ ] **Step 5: Write failing client tests for mode labels, checks and uncertainty**

Assert Spanish accessible labels and that retry retains the original user message.

- [ ] **Step 6: Update `useTutorSession`, message types and classroom rendering**

Persist only bounded tutor text and metadata; no provider raw payload.

- [ ] **Step 7: Run tutor, client and mathematical-content tests**

Run: `npm test -- --run server/tutor src/hooks/useTutorSession.test.tsx src/components/TutorResponseMeta.test.tsx src/data/syllabus.test.ts`

- [ ] **Step 8: Commit**

```bash
git add server src/hooks/useTutorSession.ts src/hooks/useTutorSession.test.tsx src/types/tutor.ts src/components/ClassroomFeed.tsx src/components/TutorResponseMeta.tsx src/components/TutorResponseMeta.test.tsx
git commit -m "feat: structure progressive tutor feedback"
```

### Task 5: Private camera pairing and authenticated streaming client

**Files:**
- Create: `src/camera/pairing.ts`
- Create: `src/camera/pairing.test.ts`
- Create: `src/camera/stream-client.ts`
- Create: `src/camera/stream-client.test.ts`
- Modify: `src/App.tsx`
- Modify: `src/components/CameraPaperView.tsx`
- Modify: `src/components/MobileCamView.tsx`
- Modify: `server/app.ts`
- Modify: `server/camera-api.test.ts`
- Modify: `server/camera-session-store.ts`
- Modify: `server/camera-session-store.test.ts`

**Interfaces:**
- Consumes: existing camera-session creation, frame-write and snapshot events.
- Produces: `createPairingFragment(access): string`; `consumePairingFragment(location, history): MobilePairing | null`; `openCameraStream({ url, credential, signal, fetchImpl, onSnapshot, onState }): Promise<void>`; server stream accepts only `Authorization: Bearer <readCredential>`.

- [ ] **Step 1: Write failing pairing privacy tests**

```ts
it('places session and write credential only in the URL fragment')
it('consumes and immediately removes the fragment from the visible address')
it('rejects missing, duplicate or oversized fragment values')
it('does not create a server camera session until mobile mode is selected')
```

- [ ] **Step 2: Run pairing tests and verify failure**

Run: `npm test -- --run src/camera/pairing.test.ts`

- [ ] **Step 3: Implement pairing helpers and update mobile route selection**

Use fragment keys `cam` and `key`; never copy credentials to local/session storage.

- [ ] **Step 4: Write failing authenticated stream and retry tests**

Use a fake streaming `Response`; assert Authorization header, line parsing across chunk boundaries, abort cleanup, retry delays of 500/1000/2000/4000 ms, and terminal expired state after 404.

- [ ] **Step 5: Implement `openCameraStream` and remove EventSource query credentials**

Parse SSE `data:` records from `response.body`; cap each event at 3 MiB and retries at four consecutive failures.

- [ ] **Step 6: Update server stream authorization and lifecycle tests**

Reject query-string credentials; assert subscriber count returns to zero when a request closes and expired sessions are pruned.

- [ ] **Step 7: Update camera components with explicit idle/connecting/live/retrying/expired states**

Stop media tracks, abort stream fetch and clear timers on unmount or source change.

- [ ] **Step 8: Run camera tests, secret-in-URL scan and full type check**

Run: `npm test -- --run src/camera server/camera-api.test.ts server/camera-session-store.test.ts && ! rg -n "stream\\?credential|\\?cam=.*key=" src server && npm run lint`

- [ ] **Step 9: Commit**

```bash
git add src/camera src/App.tsx src/components/CameraPaperView.tsx src/components/MobileCamView.tsx server/app.ts server/camera-api.test.ts server/camera-session-store.ts server/camera-session-store.test.ts
git commit -m "security: keep camera credentials out of URLs"
```

### Task 6: Server lifecycle, limits and readiness

**Files:**
- Create: `server/config.ts`
- Create: `server/config.test.ts`
- Create: `server/rate-limiter.ts`
- Create: `server/rate-limiter.test.ts`
- Modify: `server/app.ts`
- Modify: `server/app.test.ts`
- Modify: `server.ts`

**Interfaces:**
- Consumes: environment values, camera store, tutor generator.
- Produces: `loadConfig(env): ServerConfig`; `InMemoryRateLimiter.check(key, now): RateDecision`; `/api/health`; `/api/ready`; `createApp` cleanup handle or explicit lifecycle object.

- [ ] **Step 1: Write failing configuration and readiness tests**

```ts
it('rejects missing production API key and invalid port/model values')
it('reports health without configuration details')
it('reports ready only after valid configuration without contacting Gemini')
```

- [ ] **Step 2: Implement validated `ServerConfig` and readiness route**

Accept port 1–65535 and a model identifier of at most 100 safe characters. Never return the model or key from readiness.

- [ ] **Step 3: Write failing bounded rate-limiter tests**

Assert 20 requests/minute, expiry after the window, maximum 1,000 live buckets, pruning of oldest expired buckets, and no unbounded growth under unique IP input.

- [ ] **Step 4: Implement `InMemoryRateLimiter` and integrate it**

Inject clock and maximum bucket count; prune on checks and on the server's ten-minute maintenance interval.

- [ ] **Step 5: Add request and provider timeouts**

Write tests for a 15-second provider abort mapped to `TUTOR_UNAVAILABLE` and a controlled 408/413 body failure. Implement with injected timeout values and cleanup.

- [ ] **Step 6: Run all server tests and type check**

Run: `npm test -- --run server && npm run lint`

- [ ] **Step 7: Commit**

```bash
git add server server.ts
git commit -m "security: bound server resources and readiness"
```

### Task 7: Browser journeys and continuous verification

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `playwright.config.ts`
- Create: `e2e/personal-session.spec.ts`
- Create: `e2e/backup.spec.ts`
- Create: `e2e/mobile-camera.spec.ts`
- Create: `.github/workflows/verify.yml`
- Modify: `.gitignore`
- Modify: `README.md`
- Modify: `CONTRIBUTING.md`

**Interfaces:**
- Consumes: Tasks 1–6 user journeys and API health/readiness.
- Produces: `npm run test:e2e`; GitHub Actions verification on pushes and pull requests to `main`.

- [ ] **Step 1: Add Playwright as a development dependency and define the local web-server configuration**

Use Chromium, base URL `http://127.0.0.1:4173`, retries only in CI, screenshots/traces only on failure, and a stub tutor provider mode permitted only when `NODE_ENV=test`.

- [ ] **Step 2: Write browser tests for start, reload, continue and finish**

Assert timer/session context survives reload, postmortem creates a due review, and history contains the completed record.

- [ ] **Step 3: Write browser tests for backup round-trip and rejection**

Export, reset, import and compare visible history; then import a future-version file and assert state remains unchanged.

- [ ] **Step 4: Write narrow-layout and camera privacy tests**

At 390×844 assert Paper/Tutor tabs, keyboard operation, fragment consumption, sanitized address bar and no query credential in network requests.

- [ ] **Step 5: Run the browser suite locally**

Run: `npm run build && npm run test:e2e`
Expected: all Chromium journeys pass without a real Gemini key.

- [ ] **Step 6: Add GitHub Actions verification**

Use Node 22; run `npm ci`, `npm test`, `npm run lint`, `npm run build`, `npm run test:e2e`, `npm audit --omit=dev --audit-level=high`, and the repository secret-pattern scan. Grant contents read-only and no other permissions.

- [ ] **Step 7: Update operational documentation**

Document local data ownership, backup/restore, camera fragment privacy, test-mode restriction, private-network boundary and exact verification commands.

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json playwright.config.ts e2e .github/workflows/verify.yml .gitignore README.md CONTRIBUTING.md
git commit -m "test: verify personal tutoring journeys"
```

### Task 8: Final accessibility, coverage, audit and publication

**Files:**
- Modify: `src/test/accessibility.test.tsx`
- Modify: `docs/audit-report.md`
- Modify: other files only when a fresh verification failure identifies a defect, following a red-green test cycle.

**Interfaces:**
- Consumes: completed Tasks 1–7.
- Produces: evidence-backed audit update and verified non-force publication of `main`.

- [ ] **Step 1: Extend Axe coverage to Inicio, Sesión, Historial, postmortem and mobile tabs**

Assert no serious or critical violations in each stable state.

- [ ] **Step 2: Measure core-module coverage**

Run: `npm run test:coverage`
Expected: at least 90% line coverage for `src/state/**`, `src/session/**`, `src/camera/**`, `server/validation.ts`, `server/tutor-response.ts`, `server/rate-limiter.ts` and `server/camera-session-store.ts`.

- [ ] **Step 3: Run the complete release gate**

Run: `npm ci && npm test && npm run lint && npm run build && npm run test:e2e && npm audit --omit=dev --audit-level=high && git diff --check`
Expected: every command exits 0.

- [ ] **Step 4: Perform responsive and keyboard visual QA**

Inspect desktop 1280×720 and mobile 390×844; cover Inicio, active session Paper/Tutor tabs, postmortem, history, backup and camera pairing. Record only observed results.

- [ ] **Step 5: Update the audit report**

Record exact test counts, coverage, bundle sizes, dependency-audit output, visual checks, remaining personal-use limitations and deliberate non-actions.

- [ ] **Step 6: Review repository scope and history**

Confirm clean status, no secrets/generated archives, only intended commits, and no remote changes since the branch base.

- [ ] **Step 7: Commit the final evidence**

```bash
git add src/test/accessibility.test.tsx docs/audit-report.md
git commit -m "docs: verify personal premium release"
```

- [ ] **Step 8: Merge and publish without rewriting history**

Fast-forward local `main`, rerun the release gate on the merged tree, fetch remote, require the expected ancestor relationship, push `main` without force, and read back the exact remote HEAD through GitHub.
