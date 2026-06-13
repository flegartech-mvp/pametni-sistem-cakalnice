# PametniSistemCakalnice — Safe Public Claims

## SAFE TO CLAIM

- Fully browser-based React 18 + TypeScript + Tailwind CSS application — no backend or server required
- Three distinct role-based views: staff queue management panel, public waiting room display, and admin settings
- QR-based patient status page lets patients check their queue position on their own phone without an account or app
- Patient check-in, call-next-patient flow, and room/department assignment are all implemented and functional
- Admin panel includes department configuration, room management, and CSV export of queue data
- Priority queue handling allows urgent cases to be elevated in the queue
- Vitest unit tests and Playwright end-to-end tests are included in the repository
- Vite build passes cleanly; deployable as a static site to GitHub Pages, Netlify, Vercel, or any static host
- Demo authentication with role-based routing — no external auth service required for evaluation

## DO NOT CLAIM

- Do not claim this is production-ready for HIPAA or GDPR-regulated healthcare environments without legal and security review — no data encryption, audit logging, or access control beyond demo auth is implemented
- Do not claim real-time updates across multiple devices without backend infrastructure — the current implementation is browser-local state; multi-device sync requires a backend or WebSocket layer
- Do not claim this replaces commercial queue management systems (Qminder, Waitwhile, etc.) for enterprise use — it is a SaaS interface MVP and reference implementation
- Do not claim patient data persistence — browser state is cleared on refresh; production use requires a database
- Do not claim support for high-volume environments — no load testing or concurrency testing has been performed
