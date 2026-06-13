# Smokebomb Report

Date: 2026-05-27

## Project Type

- React 18 + Vite + TypeScript single-page app
- Package manager: npm (`package-lock.json`)
- State: localStorage-backed demo data
- Auth: demo role login, no password-backed auth
- Supabase: not used
- Chrome extension: not used

## Commands Run

- `npm install`
- `npm run build`
- `npm run test`
- `npm run lint`
- `npm run typecheck`
- `node tools/interactive-smoke.mjs`
- `node tools/ui-smoke.mjs`
- `npm install --save-dev @playwright/test`
- `npm run smoke`
- `npx vite preview --host 127.0.0.1 --port 4175 --strictPort`

## Pages Tested

- `/login`
- `/dashboard`
- `/patients`
- `/patients/new`
- `/queues`
- `/reports`
- `/settings`
- `/display`
- `/patient/p-l-001/status`
- `/patient/p-u-001/status`
- `/about`
- invalid route: `/definitely-not-a-route`

## Flows Tested

- App load and protected-route redirect to login
- Demo login and logout
- Refresh persistence for authenticated demo session
- Main navigation links
- Patient form required-field validation
- Add patient
- Search patient
- Complete patient with confirmation dialog
- Delete patient with confirmation dialog
- Empty search state
- Queue "call next" flow
- Patient QR/status page
- Reports CSV export button
- Settings save, reload persistence, and demo reset
- localStorage/session state survival
- Public display page
- Invalid route redirect
- Console/page error detection

## Viewports Tested

- Desktop: 1440x900
- Laptop: 1280x720
- Tablet: 768x1024
- Mobile: 390x844
- Existing visual smoke also covered tablet landscape, tablet portrait, mobile, desktop, and TV display.

## Screenshots Taken

- Playwright screenshots: `output/playwright/smokebomb/`
- Existing QA screenshots: `screenshots/qa/`

## Bugs Found

- Laptop layout at 1280x720 clipped the patients page filter/actions area, making row actions partly unreachable.
- The existing interactive smoke helper hid useful browser exception details behind a generic `Uncaught` message.
- Vitest picked up the new Playwright smoke spec until the unit-test command excluded `tests/smoke/**`.

## Bugs Fixed

- Added a 1320px responsive breakpoint for page headings, filters, queue filters, and patients table action columns.
- Improved `tools/interactive-smoke.mjs` browser exception reporting.
- Added `npm run smoke` Playwright suite and kept it separate from Vitest.
- Set Playwright to use system Chrome and run one worker for stable local server/browser automation.

## UI Issues Fixed

- Wrapped laptop page heading controls instead of clipping them.
- Wrapped filter bars to two columns at laptop width.
- Compressed patients table columns and wrapped action icons into a compact group at laptop width.

## Tests Added

- `playwright.config.ts`
- `tests/smoke/smokebomb.spec.ts`

The suite covers:
- app load/auth persistence/logout
- main route rendering and navigation
- invalid route handling
- patient CRUD-like flow
- settings persistence/reset
- responsive overflow checks
- serious console/page errors

## Files Changed

- `package.json`
- `package-lock.json`
- `playwright.config.ts`
- `tests/smoke/smokebomb.spec.ts`
- `src/styles.css`
- `tools/interactive-smoke.mjs`
- `SMOKEBOMB_REPORT.md`

## Final Verification

- Build: PASS
- Unit tests: PASS
- Lint: PASS
- Typecheck: PASS
- Existing interactive smoke: PASS
- Existing visual/UI smoke: PASS
- Playwright smokebomb: PASS, 12/12
- Preview server: PASS, HTTP 200 on port 4175

## Remaining Issues

- React Router emits v7 future-flag console warnings in dev. These are warnings, not serious console errors.
- Invalid routes currently redirect to `/dashboard` instead of rendering a dedicated 404 page. This passed the existing app behavior but may need product review.
