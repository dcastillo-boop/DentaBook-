# DentaBook

A browser-based dental appointment booking system for multiple clinics.
Built as a school project for the frontend development course.

## Team Members
- Kris Eduria
- Nathaniel Grate
- Dorin Castillo

## What It Does
Patients create an account, verify their phone via SMS OTP, browse dental
services, pick a clinic and dentist, and request an appointment. Bookings
are reviewed and approved by clinic staff. Confirmations are sent via SMS.
No online payment (payment happens in person at the clinic).

## How to Run
1. Clone or download this folder.
2. Open `index.html` in any modern browser.
3. No build step or server required for Milestone 1.

## Demo Accounts
**Password for all accounts:** `password123`

### Patients
- kris.eduria@example.com
- nathaniel.grate@example.com
- dorin.castillo@example.com

### Staff
- angela@brightsmile.ph   → BrightSmile Dental Clinic
- mark@pearldental.ph     → Pearl Dental Center
- sarah@smilecraft.ph     → SmileCraft Dental Studio

## Notes
- All data is mock data from `js/data.js`.
- No real SMS is sent — notifications are simulated and logged locally.
- **Load order matters:** always load `js/main.js` BEFORE `js/data.js`.
