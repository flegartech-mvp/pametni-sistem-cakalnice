# PametniSistemCakalnice (Smart Queue System) — Product Pitch

## One-Sentence Pitch

Smart Queue System is a fully browser-based queue management SaaS interface for clinics, reception desks, and public service offices — no backend required, works from the first demo load, and ships with staff, display, and admin views out of the box.

## Product Description

Smart Queue System eliminates the paper number slip and the shouted name call. It's a production-quality queue management interface built in React 18 + TypeScript + Tailwind CSS, designed to run at reception desks, on waiting room display screens, and on the patient's own phone simultaneously. Staff call the next patient with one click. The public display updates in real time. Patients can scan a QR code to check their queue position without leaving their seat.

Everything runs in the browser with no backend dependency — making it ideal for demos, pilots, and deployments in environments where server infrastructure is constrained. Role-based demo authentication gives you separate views for staff, public display screens, and administrators without configuring a database or auth server. Room assignment, priority queuing, department management, and CSV export are all included. The codebase is clean TypeScript with Vitest unit tests and Playwright end-to-end tests — ready for a technical audience and a general one.

## Top 5 Features

- **Three-role UI in one app** — staff workflow, public waiting-area display, and admin settings are each purpose-built views under role-based demo auth
- **QR-based patient status** — patients scan a code at check-in; their phone shows live queue position without requiring an account or app download
- **Public display view** — full-screen, auto-refreshing screen for mounting on a waiting room TV or monitor
- **No backend required** — fully browser-based; runs from a static file host or GitHub Pages; perfect for pilots and demos
- **CSV export and reports** — queue statistics and patient flow data exportable for administrative reporting

## 30-Second Demo Flow

1. Open the app in a browser — demo login screen appears; select "Staff" role
2. Check in a new patient from the staff view — they appear at the bottom of the queue
3. Click "Call Next" — the current patient display updates; queue position shifts
4. Switch browser tab to the "Display" role URL — see the public waiting room screen update with the current patient being served
5. Open the QR link on a mobile device — patient status page shows live position in queue without any login

## Target Audience

- Clinic managers and hospital IT teams evaluating queue management software
- Reception and front-desk staff at public service offices (government agencies, tax offices, licensing centers)
- Healthcare UX designers and product managers looking for a reference implementation
- Developers building or customizing queue systems who want a clean TypeScript/React starting point
