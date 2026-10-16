# Math Teacher Personal Premium — Design Specification

**Date:** 2026-10-16  
**Status:** Approved in conversation; awaiting written-spec review  
**Audience:** One person using the application on a trusted device and, optionally, a second phone as the paper camera

## 1. Goal and success criteria

Math Teacher will become a polished personal tutoring workspace rather than a public multi-user product. It must preserve the user's learning state reliably, make each study session easy to start and finish, turn postmortems into useful future practice, and keep the camera and AI boundaries private and understandable.

The iteration succeeds when:

- a reload or accidental tab closure does not lose an active session;
- the user can continue the last session, start a deliberate new one, and review earlier sessions;
- a saved error produces a visible review item due 48 hours later;
- the complete personal record can be exported and restored locally;
- camera credentials do not appear in ordinary HTTP query strings or referrers;
- the primary desktop and mobile-camera journeys have automated browser coverage;
- the interface remains keyboard accessible and usable at narrow widths;
- mathematical coaching distinguishes hypotheses, verification, hints, and complete solutions;
- no account, remote database, payment system, analytics service, or public-user administration is introduced.

## 2. Product shape

The application will have three explicit modes within one React application:

1. **Inicio** — current week and session, a Continue action when a session is active, a Start action otherwise, recent progress, and review items due.
2. **Sesión** — the existing timer, syllabus context, seven-step protocol, camera and classroom feed, reorganized so the active task is prominent and mobile layouts are not an excessively long undifferentiated page.
3. **Historial** — completed sessions, structured postmortems, recurring error categories, and local backup/restore controls.

The mobile camera route remains a focused capture-only experience. It does not expose the study history or tutor interface.

Navigation must not destroy in-progress state. Starting a new session while one is active requires an explicit confirmation explaining what will be archived or reset.

## 3. Local data model

All personal learning data stays on the current browser. A versioned repository module will be the only code allowed to read or write browser storage.

The root state contains:

- `schemaVersion`;
- selected week and session;
- active session or `null`;
- completed session summaries;
- review queue;
- user preferences.

An active session contains a stable ID, start time, elapsed seconds, running state, selected phase, active and completed protocol steps, text-only messages, and an optional draft postmortem. Images are never persisted.

A completed session contains its ID, week, session number, start/end timestamps, duration, completed steps, a bounded text summary, and a structured postmortem. A review item points to its source session and stores the variant problem, due time, completion time, and status.

Storage rules:

- migrate the existing `math_tutor_state_v1` record exactly once;
- validate every value on read and fall back safely when corrupted;
- retain at most 50 completed sessions, 100 review items, and 40 messages in the active session;
- debounce writes that change every second;
- never persist images, credentials, provider responses beyond bounded text, or secrets;
- export a UTF-8 JSON backup containing a format identifier, schema version, export timestamp, and validated personal state;
- import only after schema validation and explicit confirmation, without merging ambiguous records;
- keep the pre-import state unchanged when a backup is invalid.

`localStorage` is sufficient for this bounded text dataset and is preferred over IndexedDB to minimize moving parts. The design deliberately does not promise cross-device synchronization. Backup files provide portability.

## 4. Session and review workflow

Starting a session creates a stable active-session record and initializes the first teacher prompt. Timer changes, phase changes, protocol progress and text messages update that record. The timer uses timestamps rather than relying solely on interval ticks so background tabs and suspended devices recover accurate elapsed time.

Finishing a session opens the postmortem with current context. Saving it:

1. validates the structured fields;
2. creates an immutable completed-session summary;
3. creates one review item due exactly 48 hours after completion when a variant problem exists;
4. clears the active session;
5. returns to Inicio with a visible confirmation.

The review queue shows overdue and upcoming items. Completing a review records completion without inventing a score. Editing historical records is out of scope for this iteration; the user can delete all local data through a deliberate, confirmed reset.

## 5. Tutor behavior

The provider-facing module will request a small, structured response with:

- `message`: the student-facing explanation or question;
- `mode`: `question`, `hint`, `verification`, or `solution`;
- `checks`: zero or more concise hypotheses or verification checks;
- `uncertainty`: an optional warning when an image or mathematical step is ambiguous.

The server validates this structure and falls back to a safe text response if the provider returns malformed output. The interface labels the response mode without presenting it as a certainty score.

Tutor context contains the current curricular topic, phase, protocol step and only the bounded conversation required for continuity. It never claims to have seen an image it could not parse. A complete solution is appropriate only when the user explicitly asks, after a reasonable hint progression, or when verification requires showing a corrected derivation.

Financial examples remain conceptual and never become recommendations, forecasts or claims that Black–Scholes assumptions hold in real markets.

## 6. Camera and privacy architecture

The desktop requests an ephemeral camera session only when the mobile-camera mode is selected. The mobile pairing link places its session identifier and write credential in the URL fragment, not the query string. The mobile route reads the fragment, immediately removes it from the visible address with `history.replaceState`, and retains credentials only in memory.

The desktop receives camera events through an authenticated streaming fetch so the read credential can be carried in an `Authorization` header instead of an EventSource query string. If streaming fetch proves unreliable in a supported browser, the acceptable fallback is a short-lived opaque stream ticket that cannot write frames and expires with the session; the long-lived read credential must not appear in a URL.

Further rules:

- session lifetime remains two hours maximum;
- the server keeps only the latest frame;
- leaving the camera view stops local media tracks and closes the stream;
- reconnect uses bounded exponential backoff and exposes a visible status;
- malformed, oversized or wrongly typed frames remain rejected;
- no camera image is written to disk, browser storage or logs.

## 7. Front-end boundaries

`App.tsx` becomes a thin composition root. Responsibilities are split into focused units:

- routing/mode selection;
- personal-state repository and migration;
- active-session controller;
- timer recovery;
- review queue derivation;
- camera pairing and authenticated stream client;
- presentational screens and reusable status/confirmation components.

Large current components may be divided only along these responsibilities. Visual styling remains the existing stone/amber identity; the iteration improves hierarchy and responsive behavior rather than replacing the brand.

The desktop session layout keeps camera and tutor visible together where space permits. Narrow layouts prioritize the current activity using a two-tab switch (`Papel` / `Profesor`) while keeping timer and phase status compact and persistent.

## 8. Error handling and recovery

Every asynchronous flow has a user-visible state: idle, working, success, recoverable error, or unavailable. Provider errors retain the last user message and allow retry. Camera errors distinguish permission denial, unsupported browser, expired session and transient disconnection. Backup import errors identify the invalid file without modifying current data.

Error details intended for developers are not sent to the browser and must not contain secrets. Expected errors do not produce noisy console logs in production.

## 9. Accessibility

All three modes use one visible `h1`, logical landmarks and a skip link. Icon-only controls have accessible names. Tabs use the appropriate tab semantics and keyboard behavior. Dialogs retain the existing focus trapping and restoration behavior. Dynamic timer, connection and provider states avoid excessive announcements; only meaningful changes use live regions.

The interface maintains visible focus, reduced-motion support, usable touch targets, and contrast compatible with WCAG AA for normal text. Browser tests cover keyboard-only start, session, postmortem, backup and mobile-tab journeys.

## 10. Security and deployment

The application remains a single-user service. It is safe for local or private-network use but is not represented as suitable for arbitrary public users without authentication.

The server will:

- validate configuration once at startup;
- use explicit request-size and timeout limits;
- bound and periodically prune in-memory rate-limit and camera maps;
- set production security headers without requiring external fonts or scripts;
- redact provider and storage errors;
- expose health and readiness separately, with readiness confirming configuration but never contacting or revealing the provider key.

The repository will include a GitHub Actions workflow for a supported Node LTS version that runs clean install, tests, type checking, production build, dependency audit and a secret-pattern scan. Major dependency migrations are not bundled into this iteration unless required to fix a verified defect.

## 11. Verification strategy

Testing follows a layered approach:

- unit tests for migrations, validation, timer recovery, review scheduling and tutor response parsing;
- server integration tests for health/readiness, limits, camera authorization, expiry and streaming cleanup;
- component tests for the three product modes, confirmation behavior and accessible states;
- browser end-to-end tests for start/continue/finish, persistence after reload, backup round-trip, narrow-layout tabs and mobile camera pairing without URL leakage;
- Axe checks for the principal screens;
- production build and dependency audit before publication.

Core state, validation and security modules should reach at least 90% line coverage. A global UI coverage percentage is not used as a vanity target; critical user journeys must instead have explicit behavioral tests.

## 12. Rollout and non-goals

Migration runs automatically and preserves the existing selected week, selected session and text chat when valid. The current branch remains deployable after every implementation task. Publication uses a normal, non-force update to `main` after a fresh full verification.

Non-goals:

- user accounts or authentication UI;
- cloud synchronization or remote database;
- payments, subscriptions or analytics;
- social sharing, email or external messaging;
- autonomous financial advice;
- storing camera frames or student images;
- replacing the Gemini provider solely for architectural variety;
- a broad visual rebrand.

## 13. Residual limitations

The application still depends on browser camera, speech and storage capabilities and on the configured Gemini service. Generative mathematical output cannot be guaranteed correct; the product mitigates this with explicit checks, uncertainty handling and verification prompts rather than claiming infallibility. Clearing browser site data removes local records unless the user has exported a backup.
