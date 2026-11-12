# Project RAA NestJS Backend

This backend is a NestJS + TypeORM + PostgreSQL API for the storefront.

## Project structure

```text
backend/
├── database/       # SQL schema and seed script
├── src/
│   ├── auth/       # Admin authentication
│   ├── contact/    # Contact messages and DTOs
│   ├── customers/  # Customer entity and database model
│   └── products/   # Products, services, and DTOs
├── .env.example    # Local environment variable template
├── package.json
└── Dockerfile
```

Generated files and local-only data belong in `dist/`, `node_modules/`, and
`uploads/`. Keep credentials in `.env`; it is excluded from Git and Docker build
contexts. `.env.example` is safe to use as a configuration template.

## Start

From this directory:

```sh
npm install
```

For Docker Compose, copy the root `.env.example` to `.env` and set three
different randomly generated database secrets: `DB_ADMIN_PASSWORD`,
`DB_PASSWORD`, and `DB_MIGRATION_PASSWORD`. Keep the actual `.env` private; it
is ignored by Git. Then start the stack from the project root:

```sh
docker compose up -d --build
```

PostgreSQL is published only on localhost. The Compose backend connects with
the non-superuser `project_raa_app` role; the separate migration role owns the
application schema, and the PostgreSQL superuser password is not passed to the
backend. The database initialization step provisions these roles and grants
the application role only data access. Production disables TypeORM schema
synchronization; apply schema changes through reviewed SQL migrations.

For running the backend directly in development, configure `backend/.env` with
a local `DB_HOST`, `DB_USERNAME=project_raa_migrator`, and a strong,
unique `DB_PASSWORD`. Avoid the default PostgreSQL superuser for the app.

Then run:

```sh
npm run start:dev
```

The API listens on `http://localhost:4000`.

## Endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/health` | Check API health |
| GET | `/api/products` | List products |
| GET | `/api/products/:id` | Get a product |
| POST | `/api/products` | Create a product (admin) |
| POST | `/api/auth/customer/request-code` | Email a customer sign-in code |
| POST | `/api/auth/customer/verify-code` | Verify a code and create/sign in a customer |
| POST | `/api/auth/customer/register` | Register with email and password |
| POST | `/api/auth/customer/login` | Sign in with email/phone and password |
| GET | `/api/auth/customer/me` | Get the signed-in customer |
| GET | `/api/auth/customer/cart` | Get the signed-in customer's saved cart |
| PUT | `/api/auth/customer/cart` | Replace the signed-in customer's saved cart |
| POST | `/api/auth/customer/logout` | Sign out a customer |

Customer carts are stored in the database and follow the account across devices.
Signing in loads the saved cart; guest cart items are merged into it.
Products with multiple compatible phone models are saved as separate cart lines,
and the API validates each selected model against the product.

Admin sign-in requires the configured username and password followed by a
one-time code. In non-production environments, `ADMIN_LOGIN_DUMMY_OTP` is used
(defaults to `123456`); production ignores this setting and sends a random
five-minute code to `ADMIN_EMAIL`, requiring `SMTP_USER` and `SMTP_PASS`.
Codes expire after five minutes, allow five attempts, and can be requested once
per minute. Admin sessions expire after 12 hours and are held in memory.

Customer codes expire after 10 minutes and can be requested once per minute per
email address. Customer sessions are held in memory and expire after 24 hours;
restarting the API signs them out. Email OTP requires `SMTP_USER` and
`SMTP_PASS`. Phone sign-in needs an SMS provider and is not enabled yet.
Password registration currently requires email. Phone numbers can be saved on
the account, but phone/password sign-in stays disabled until SMS verification
is configured. Registration sends an email verification code before saving the
password. Passwords are stored as scrypt hashes, and repeated failed sign-in
attempts are temporarily rate-limited.
