# Landscaping Management System

Web app for running a landscaping business: customers, crews, routes, jobs, billing and reporting, with four
sign-in levels (customer, employee, manager, owner/admin).

- **Backend:** Node.js, Express, PostgreSQL (Sequelize), JWT auth — `backend/`
- **Frontend:** React 18 + TypeScript — `frontend/`

## Getting started

You need Node.js 18+ and Docker (or your own PostgreSQL 13+).

```bash
# 1. Database
docker-compose up -d

# 2. API (http://localhost:5000)
cd backend
cp .env.example .env        # then set JWT_SECRET, JWT_REFRESH_SECRET and TZ (your time zone)
npm install
npm run seed                # starter accounts + sample data
npm run dev

# 3. Web app (http://localhost:3000), in a second terminal
cd frontend
npm install
npm start
```

`npm run seed` creates one account per role and prints the password (default `ChangeMe123!`, or set
`SEED_PASSWORD`). Change the passwords before real use.

| Role | Email |
|------|-------|
| Owner / admin | owner@example.com |
| Manager | manager@example.com |
| Employee | employee@example.com |
| Customer | customer@example.com |

New customers can sign themselves up on the sign-in page. Employee, manager and admin accounts are created by
the owner under **People → Hire team member**.

## What each role can do

**Customer**
- See bills, line items, balance due and payment status
- Leave notes and photos on their property (visible to crews and managers); keep standing instructions (gate codes, pets)
- Request extra services, see upcoming visits and service history with before/after photos
- Book, reschedule and cancel appointments; see their service plan
- Message the office

**Employee**
- Clock in and out; see their own timesheet
- See today's truck, route and stops in order, with a one-tap Google Maps link for the whole route
- Mark stops arrived/finished/skipped (times are stamped automatically)
- Work jobs: quality checklist, before/after photos, materials used, start/complete
- Leave property notes and photos, including staff-only notes
- See the weekly schedule, request time off, log maintenance on equipment assigned to them, message the team

**Manager** — everything an employee can do, plus
- Adjust timecards (with a recorded reason); approve or deny time off
- Trucks: add/edit, assign each day's crew and driver
- Routes: create, assign a truck, add customers, set the stop order; moving a route's date moves its unfinished jobs
- Jobs/work orders: create, assign, price, checklist; schedule customer requests
- Edit employee details (name, address, phone, hourly rate); add and edit customers
- Equipment and maintenance history; inventory with low-stock flags
- Invoices: create, send, record payments, send reminders; service plans; appointments
- Reports: employee hours and jobs completed, route completion

**Owner / admin** — everything a manager can do, plus
- Hire, deactivate/reactivate, and change roles (including assigning the manager role)
- Finances: collected, invoiced, outstanding, overdue, labor/materials/maintenance costs, payments by month
- Send an announcement to all staff

## Automation

- Completing a job with a price creates and sends its invoice; materials used are deducted from inventory.
- Every night (and at startup) the server marks past-due invoices overdue, bills active service plans on
  their cycle, and creates the coming week's jobs for recurring plans.

## Not built yet

- **Online card payments.** Customers see their bills; staff record payments (cash, check, card, transfer).
  Needs a Stripe (or similar) account.
- **Text messages.** Announcements are delivered in-app. Sending them by SMS as well is coded but has never
  been run against a live Twilio account; add the `TWILIO_*` values in `backend/.env` to try it.
- **Automatic route optimization.** Stop order is set by hand and previewed in Google Maps.
- **Live GPS tracking and arrival estimates, push/email notifications, referral program, training and
  certification tracking.**
- **Mobile apps** for the App Store and Google Play. The web app is responsive and works on phones.
- **Production hardening:** database migrations (tables are currently created from the models at startup),
  password reset by email, and deployment/HTTPS setup.

## Checks

```bash
cd backend && npm run test:api     # needs the API running against a seeded development database
cd frontend && CI=true npm run build
```

`npm run test:api` exercises every endpoint and the permission rules for each role. It creates records, so
do not point it at real data.

## Project layout

```
backend/src/
  config/        database connection, seed script
  controllers/   request handlers
  jobs/          nightly scheduler
  middleware/    auth, validation, error handling
  models/        Sequelize models and associations
  routes/        API routes
  services/      invoicing, plan billing, SMS
frontend/src/
  components/    layout, shared UI, generic list/edit page
  pages/         screens, grouped by area
  services/      API client
```

## Configuration

`backend/.env` (copied from `.env.example`): database connection, JWT secrets, `CORS_ORIGIN` (the web app's
URL), `TZ` (time zone used for "today"), upload size/location, and optional Twilio keys.
`frontend/.env`: `REACT_APP_API_URL` (defaults to `http://localhost:5000/api`).

Uploaded photos are stored on the API server's disk under `backend/uploads/`.
