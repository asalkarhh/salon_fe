# Lustre Salon Cloud Frontend

Premium React + TypeScript frontend for the `salon_be` Spring Boot backend in this same workspace.

## Overview

This frontend was built by scanning `../salon_be` first and using the backend code as the source of truth:

- `README.md`
- controllers
- request/response DTOs
- entities
- enums
- security rules
- `application.yml`
- Postman collection
- DB schema script

The app uses the backend exactly as implemented at `http://localhost:8080` with:

- `Authorization: Bearer <token>`
- `Content-Type: application/json`
- `salonBusinessId` spelling exactly as used by the backend

## Tech Stack

- React
- Vite
- TypeScript
- Tailwind CSS
- local shadcn-style component primitives
- React Router
- Axios
- TanStack Query
- TanStack Table
- React Hook Form
- Zod
- Recharts
- Lucide React
- Sonner

## Backend Contract Notes

- Backend folder: `../salon_be`
- Base API URL: `http://localhost:8080`
- Seeded database name in backend config: `saloon_saas`
- Super admin login:
  - username: `superadmin`
  - password: `Admin@123`
- Roles:
  - `SUPER_ADMIN`
  - `SALON_OWNER`
  - `STAFF`
  - `CUSTOMER`
- `SUPER_ADMIN` has `salonBusinessId = null`
- `SALON_OWNER`, `STAFF`, and `CUSTOMER` are salon-scoped
- The frontend passes `salonBusinessId` only where the backend requires it for superadmin tenant-scoped operations

## Implemented Modules

- Auth
- Super Admin Dashboard
- Owner Dashboard
- Staff Dashboard
- Customer Dashboard
- Payroll Dashboard
- Create Owner
- Salons
- My Salon
- Plans
- Subscriptions
- Feature Access
- Branches
- Service Categories
- Services
- Customers
- Staff
- Appointments
- Queue Tokens
- Invoices
- Payments
- Staff Earnings
- My Earnings

## Environment Setup

Create `.env` from `.env.example`:

```env
VITE_API_BASE_URL=http://localhost:8080
```

Make sure the backend is running from `../salon_be`.

## Commands

```bash
npm install
npm run dev
npm run build
```

## Verified Locally

- `npm install` completed successfully
- `npm run build` passes
- `npm run dev` starts successfully

## Main Routes

- `/login`
- `/dashboard`
- `/salons`
- `/salons/:id`
- `/salons/:id/edit`
- `/my-salon`
- `/create-owner`
- `/plans`
- `/plans/new`
- `/plans/:id`
- `/subscriptions`
- `/subscriptions/new`
- `/subscriptions/:id`
- `/subscriptions/:id/edit`
- `/feature-access`
- `/feature-access/:salonBusinessId`
- `/branches`
- `/branches/new`
- `/branches/:id`
- `/branches/:id/edit`
- `/service-categories`
- `/service-categories/new`
- `/service-categories/:id/edit`
- `/services`
- `/services/new`
- `/services/:id`
- `/services/:id/edit`
- `/customers`
- `/customers/new`
- `/customers/:id`
- `/customers/:id/edit`
- `/staff`
- `/staff/new`
- `/staff/:id`
- `/staff/:id/edit`
- `/appointments`
- `/appointments/new`
- `/appointments/:id`
- `/appointments/:id/edit`
- `/queue-tokens`
- `/queue-tokens/new`
- `/queue-tokens/:id`
- `/invoices`
- `/invoices/new`
- `/invoices/:id`
- `/invoices/:id/edit`
- `/payments`
- `/payments/new`
- `/payments/:id`
- `/payments/:id/edit`
- `/staff-earnings`
- `/my-earnings`
- `/payroll`

## Role-Based Navigation

- `SUPER_ADMIN`
  - Dashboard
  - Salons
  - Create Owner
  - Plans
  - Subscriptions
  - Feature Access
  - Services
  - Customers
  - Staff
  - Appointments
  - Queue Tokens
  - Invoices
  - Payments
  - Staff Earnings

- `SALON_OWNER`
  - Dashboard
  - My Salon
  - Branches
  - Service Categories
  - Services
  - Customers
  - Staff
  - Appointments
  - Queue Tokens
  - Invoices
  - Payments
  - Staff Earnings
  - Payroll
  - Feature Access

- `STAFF`
  - Dashboard
  - Customers
  - Appointments
  - Queue Tokens
  - Invoices
  - Payments
  - My Earnings

- `CUSTOMER`
  - Dashboard
  - Appointments

## Mobile Responsiveness

- Sidebar on desktop
- Drawer navigation on mobile
- Forms collapse cleanly on smaller widths
- Tables render as cards on mobile and full tables on larger screens
- Dialogs and cards are sized to fit narrow screens
- The layout was built to avoid breaking at `360px`

## Backend-Driven Limitations

- No `/plans/:id/edit` route is included because the backend does not expose a plan update endpoint.
- Service categories do not have a dedicated backend `GET /{id}` endpoint, so editing is resolved through the current owner-scoped list.
- Customer dashboard depth is limited because the backend only exposes customer-safe access through appointment endpoints, not a dedicated customer dashboard endpoint.
- Payment editing is exposed at `/payments/:id/edit` because the backend supports `PUT /api/payments/{id}` even though the original suggested route list did not include it.

## Troubleshooting

- `401 Unauthorized`
  - Log in again and verify the backend is running on `http://localhost:8080`

- `400 Bad Request`
  - For superadmin tenant-scoped forms, choose a salon first so `salonBusinessId` is included
  - Starter plan branch creation can fail after the first branch because the seeded plan limit is `maxBranches = 1`
  - Staff creation can fail when the plan limit is exceeded

- `403 Forbidden`
  - Use the correct seeded or created role for the route you are trying to access

- `409 Conflict`
  - Duplicate email, phone, branch name, or service name already exists in the backend

- Feature access errors
  - Some owner and staff modules can be disabled by plan features or salon overrides from the backend
