# Sprintly - Project Management SASS App

Sprintly is a Node.js and TypeScript project-management backend built with Express, PostgreSQL, Prisma, Redis, and bKash payments. It supports manager-owned projects, member task assignment and comments, role-based administration, email and Google authentication, Cloudinary uploads, subscription plans, and subscription payments through bKash.

## What Problem This Project Solves

Sprintly gives teams a shared system for organizing projects and tasks, assigning work to members, and tracking collaboration instead of relying on manual, ad-hoc coordination. The implementation separates responsibilities across three roles: `MANAGER` users create and manage projects, create tasks, assign members, and purchase subscriptions; `MEMBER` users are assigned work and can update permitted task states and comment on tasks; and `ADMIN` users manage users, plans, projects, analytics, and audit logs.

Access is authenticated with JWT access and refresh tokens delivered in HTTP-only cookies, with the access token also accepted as a Bearer token. Route-level role checks are applied by the shared auth middleware, which also verifies the user against the database and rejects blocked accounts. Subscription enforcement is implemented in the project and task creation services: a manager must have an active subscription whose dates contain the current time. Managers cannot create payments for a `FREE` plan or while they already have an active subscription. Successful bKash callbacks create or renew a one-month subscription.

## Getting Started

**Prerequisites**

- Node.js. The repository does not declare an `engines` field or an `.nvmrc`; use a Node.js version compatible with the installed TypeScript, `tsx`, Express, Prisma 7, and package dependencies.
- PostgreSQL, with a connection string supplied through `DATABASE_URL`.
- Redis, used for registration OTP data and bKash tokens.
- An SMTP-capable Gmail account, because startup verifies Nodemailer and authentication sends email.
- A package manager that can use `package-lock.json`; the documented commands use npm.
- Cloudinary credentials for profile images and project attachments.
- bKash sandbox credentials for payment flows.

**Environment variables**

Create `.env` from `.env.example`. The application loads `.env` from the project root. The table lists every variable referenced by `process.env` in the source code.

| Variable | Purpose |
| --- | --- |
| `NODE_ENV` | Runtime environment; development errors include the original error and stack. |
| `PORT` | HTTP server port. |
| `DATABASE_URL` | PostgreSQL connection URL used by Prisma and the PostgreSQL adapter. |
| `APP_URL` | Read into configuration as an application URL; it is not otherwise used by the current source. |
| `FRONTEND_URL` | Allowed CORS origin and frontend redirect base used by payment callbacks. |
| `BCRYPT_SALT_ROUNDS` | Number of bcrypt salt rounds for passwords. |
| `JWT_ACCESS_SECRET` | Secret used to sign and verify access tokens. |
| `JWT_REFRESH_SECRET` | Secret used to sign and verify refresh tokens. |
| `JWT_ACCESS_EXPIRES_IN` | Access-token lifetime passed to the JWT library. |
| `JWT_REFRESH_EXPIRES_IN` | Refresh-token lifetime passed to the JWT library. |
| `GOOGLE_CLIENT_ID` | Audience used to verify Google ID tokens. |
| `REDIS_USER` | Redis username. |
| `REDIS_PASSWORD` | Redis password. |
| `REDIS_HOST` | Redis host. |
| `REDIS_PORT` | Redis port. |
| `SMTP_USER` | Gmail/Nodemailer authentication username. |
| `SMTP_PASSWORD` | Gmail/Nodemailer authentication password. |
| `EMAIL_SENDER` | Sender address used for verification, welcome, and assignment emails. |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name. |
| `CLOUDINARY_API_KEY` | Cloudinary API key. |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret. |
| `BKASH_BASE_URL` | bKash API base URL, normally the tokenized sandbox URL. |
| `BKASH_USERNAME` | bKash API username. |
| `BKASH_PASSWORD` | bKash API password. |
| `BKASH_APP_KEY` | bKash application key. |
| `BKASH_APP_SECRET` | bKash application secret. |
| `BKASH_CALLBACK_URL` | Callback URL supplied to bKash during checkout. |
| `ADMIN_NAME` | Initial admin name used by the startup admin seed. |
| `ADMIN_EMAIL` | Initial admin email used by the startup admin seed. |
| `ADMIN_PASS` | Initial admin password used by the startup admin seed. |

`BACKEND_URL` appears in `.env.example`, but it is not referenced by the current source. The example callback URL uses port `5000`, while the example server port is `6000`; set these values to the actual public callback and server addresses you use.

## Installation Process

1. Clone the repository and enter the project directory:

  ```bash
  git clone <repository-url>
  cd Sprintly
  ```

2. Install dependencies:

  ```bash
  npm install
  ```

3. Create and configure the environment file:

  ```bash
  cp .env.example .env
  ```

  Set the PostgreSQL, Redis, SMTP, JWT, Cloudinary, Google, bKash, and admin values described above.

4. Ensure PostgreSQL is running and `DATABASE_URL` points to the target database. Apply the checked-in Prisma migrations and generate the client:

  ```bash
  npx prisma migrate deploy
  npx prisma generate
  ```

5. There is no separate Prisma seed script in `package.json`. On server startup, `src/app/utils/seed.ts` creates one `ADMIN` user from `ADMIN_NAME`, `ADMIN_EMAIL`, and `ADMIN_PASS` when no admin exists.

6. Start the development server:

  ```bash
  npm run dev
  ```

  The server connects to PostgreSQL, Redis, and Nodemailer, performs the startup admin check, schedules hourly hard deletion of soft-deleted projects, and then listens on `PORT`.

**Available npm scripts**

```bash
npm run dev      # tsx watch src/server.ts
npm run build    # tsup
npm run start    # node dist/server.js
```

## API Documentation & Architecture

**Architecture overview**

The application is mounted from `src/app.ts` under `/sprintly/api/v1`. Module route files declare endpoints and compose validation, authentication, role checks, and file-upload middleware. Controllers receive Express requests and delegate business logic to module services. Services use the Prisma client and shared integrations such as Redis, Nodemailer, Cloudinary, and bKash.

The main source areas are:

- `src/app/modules`: auth, profile, project, task, comment, plan, payment, and admin routes, controllers, services, and validation.
- `src/app/middleware`: JWT authentication/RBAC, Zod request validation, global error handling, and not-found handling.
- `src/app/lib`: Prisma, Redis, mail, Cloudinary, bKash, upload, and scheduled cleanup integrations.
- `src/app/utils`: errors, JWT helpers, response helpers, async handling, and startup admin seeding.
- `prisma/schema`: PostgreSQL model definitions for users, profiles, projects, tasks, comments, plans, subscriptions, payments, memberships, assignments, and activity logs.

`validateRequest` parses request bodies with Zod. `auth(...roles)` reads an access token from the `accessToken` cookie or the `Authorization` header, verifies its claims, checks the user record, enforces the supplied roles, and rejects blocked users. Services also perform additional ownership, role, status, and subscription checks where implemented. There is no standalone subscription middleware.

All API paths below are relative to `/sprintly/api/v1`.

**Authentication and health**

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/` | Returns the Sprintly welcome response. |
| `POST` | `/auth/register/member` | Stores a pending member registration in Redis and emails a five-minute verification OTP. |
| `POST` | `/auth/register/manager` | Stores a pending manager registration in Redis and emails a five-minute verification OTP. |
| `POST` | `/auth/verifyEmail` | Verifies a member OTP, creates the member and profile, and returns tokens. |
| `POST` | `/auth/verifyEmail/manager` | Verifies a manager OTP, creates the manager and profile, and returns tokens. |
| `POST` | `/auth/login` | Authenticates with email and password and returns access and refresh tokens. |
| `POST` | `/auth/google` | Verifies a Google ID token and logs in or creates a member account. |
| `POST` | `/auth/refresh-token` | Rotates tokens using the `refreshToken` cookie. |
| `GET` | `/auth/me` | Returns the authenticated user and profile. |

**Profiles**

| Method | Path | Description |
| --- | --- | --- |
| `PATCH` | `/profile/update/member` | Updates the authenticated member profile and optional `memberAvatarUrl` upload. |
| `PATCH` | `/profile/update/manager` | Updates the authenticated manager profile and optional `managerAvatarUrl` upload. |

**Projects**

| Method | Path | Description |
| --- | --- | --- |
| `POST` | `/project/create` | Creates a manager-owned project with up to three `additionalFiles`; requires an active subscription. |
| `GET` | `/project/get` | Returns projects visible to the authenticated role, with pagination/search handling. |
| `GET` | `/project/get/:id` | Currently invokes the project list handler; the `id` is not used by the mounted route. |
| `PATCH` | `/project/update/:id` | Updates a manager-owned project. |
| `PATCH` | `/project/del/:id` | Soft-deletes a manager-owned project. |
| `DELETE` | `/project/del/:id` | Removes a member from a manager-owned project; the request body is used as the member identifier. |
| `POST` | `/project/:id/tasks` | Creates a task in a manager-owned project; requires an active subscription. |
| `GET` | `/project/:id/tasks` | Returns tasks for a project with pagination/filter handling. |

**Tasks**

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/task/myAssigned` | Returns tasks assigned to the authenticated manager or member. |
| `GET` | `/task/:id` | Returns task details subject to the task service's assignee filtering. |
| `PATCH` | `/task/:id` | Updates a task; managers can update core fields and members are limited by the service's status rules. |
| `PUT` | `/task/:id` | Assigns a task to a member by email, adds project membership, and sends an email notification. |

**Comments**

| Method | Path | Description |
| --- | --- | --- |
| `POST` | `/task/:taskId/comment` | Adds a comment when the member has a task assignment. |
| `GET` | `/task/:taskId/comments` | Returns non-deleted comments for a task. |
| `DELETE` | `/comments/:id` | Soft-deletes a comment belonging to the authenticated member. |

**Plans, subscriptions, and payments**

| Method | Path | Description |
| --- | --- | --- |
| `POST` | `/plan/createPlan` | Creates a subscription plan; admin only. |
| `GET` | `/plan/` | Lists all subscription plans. |
| `PATCH` | `/plan/updatePlan/:id` | Updates a subscription plan; admin only. |
| `DELETE` | `/plan/delete/:id` | Deletes a subscription plan; admin only. |
| `POST` | `/payment/createPayment` | Creates a pending bKash checkout and returns its callback URL; the service permits managers. |
| `GET` | `/payment/callback` | Public bKash callback that completes the payment, updates subscription data, and redirects to the frontend. |
| `GET` | `/payment/getMyPayment` | Returns payment records for the authenticated manager. |

**Administration**

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/admin/users` | Returns paginated users with profile data. |
| `PATCH` | `/admin/users/:id/status` | Changes a user's status. |
| `GET` | `/admin/analytics` | Returns revenue, user, member, and manager totals. |
| `GET` | `/admin/projects` | Returns projects with related tasks, manager, and members. |
| `GET` | `/admin/audit` | Returns activity logs with their actors. |

**Response format**

Successful controller responses use the standard shape below; `data` and `meta` are omitted by JSON serialization when undefined:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "...",
  "data": {},
  "meta": {
   "page": 1,
   "limit": 10,
   "total": 0,
   "totalPages": 0
  }
}
```

Errors from the global handler use `success`, `statusCode`, `name`, `message`, and development-only `error` and `stack` fields. Zod validation failures use status `409`; authentication and authorization failures commonly use `403`. Unknown routes use a separate response containing `message`, `path`, and `date`.

## ER Diagram

![Sprintly ER DIAGRAM](https://i.ibb.co.com/v49fNGZn/Screenshot-From-2026-09-08-03-15-18.png)

## Author

- [MD Abdur Rahman Nur Jamil](https://github.com/mdabdurrahman07)
