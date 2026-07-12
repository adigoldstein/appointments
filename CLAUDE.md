# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

This is an Nx monorepo (Nx 22.7.3). Use root `npm` scripts, or `npx nx <target> <project>` directly.

```bash
npm run start             # serve frontend + backend in parallel (dev)
npm run dev               # same, with streamed output
npm run start:frontend    # Angular dev server only (proxies /api -> http://localhost:3000, see apps/frontend/proxy.conf.json)
npm run start:backend     # Nest API only, on PORT (default 3000), global prefix /api

npm run build              # nx run-many build --all
npm run lint                # nx run-many lint --all
npx nx build <project>       # build a single project (e.g. backend, frontend, design-system)
npx nx lint <project>

npm run storybook          # nx run frontend:storybook (port 6006)
npm run build:storybook

# Database (TypeORM CLI, reads apps/backend/src/database/data-source.ts)
npm run migration:generate   # generates apps/backend/src/database/migrations/InitialAuthSchema (edit the name arg for new migrations)
npm run migration:run
npm run migration:revert

npx nx graph               # visualize the project dependency graph
```

**Tests:** `npm run test` runs `nx run-many --targets=test --all`, but no project currently defines a `test` target (Angular libs were generated with `unitTestRunner: none`; see `nx.json` generator defaults). `apps/backend-e2e` has a Jest-based `e2e` target (`npx nx e2e backend-e2e`) but currently has no test files (`passWithNoTests: true`) and depends on `backend:build`/`backend:serve`. Don't assume test coverage exists — check before relying on it, and confirm with the user before choosing a test runner/config for new tests.

**Env vars:** required before the backend will boot (validated in `apps/backend/src/config/env.validation.ts`, keys in `env.constants.ts`): `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_DATABASE`, `JWT_ACCESS_SECRET`, `JWT_ACCESS_EXPIRES_IN` (duration string like `15m`/`7d`), `JWT_REFRESH_SECRET`, `JWT_REFRESH_EXPIRES_IN`, `BCRYPT_SALT_ROUNDS` (optional, default 12). See `.env.example`.

## Architecture

### Workspace layout
- `apps/frontend` — the primary Angular 21 SPA (Angular Material/CDK, SCSS). This is the app to build features in.
- `apps/appointments` — an older/legacy Angular app scaffold; not the active frontend.
- `apps/backend` — NestJS 11 REST API. Webpack build via `nx:run-commands` (not the Nx webpack executor directly).
- `apps/backend-e2e` — e2e scaffold, currently empty.
- `libs/feature-*` (`feature-auth`, `feature-admin`, `feature-customer`, `feature-client-portal`) — vertical-slice Angular route/page libraries consumed by `apps/frontend`.
- `libs/ui/*` (`button`, `card`, `input`, `modal`, `date-picker`) — standalone, presentational Angular components with Storybook stories. Each component's template/styles live in separate `.html`/`.scss` files alongside the `.component.ts` (not inline).
- `libs/design-system` — global SCSS: `settings/` (tokens: breakpoints, sizes, opacity, motion, layers), `tools/` (mixins), `base/` (reset). Imported into `apps/frontend/src/styles.scss`.
- `libs/shared/types`, `libs/shared/utils`, `libs/shared/api` — cross-cutting code shared between frontend and backend contexts (e.g. `Role`/`UserRole` enum, `israel-locality` types, API base URL token).
- All libs are imported via TS path aliases in `tsconfig.base.json` under the `@app/...` prefix (e.g. `@app/feature-auth`, `@app/ui/button`, `@app/shared/types`) — always check `tsconfig.base.json` when adding a new lib so its path alias is registered.

### Backend: auth & RBAC (the most involved subsystem)
Users have a `role` (`ADMIN` | `PROVIDER` | `CLIENT`) and an optional `providerId` linking a `CLIENT` to its owning `PROVIDER`. All auth code lives under `apps/backend/src/auth/`.

- **JWT strategy** (`strategies/jwt.strategy.ts`): bearer token extraction, validates against `JWT_ACCESS_SECRET`, maps payload `{ sub, role }` -> `AuthenticatedUserPayload`.
- **Guards**: `JwtAuthGuard` (route requires a logged-in user), `RolesGuard` + `@Roles(...)` decorator (declarative RBAC), `LoginThrottlerGuard` (extends `ThrottlerGuard`, keys the rate limit on the normalized email in the login body — per-account, not just per-IP).
- **Tokens**: access JWT is short-lived and returned to the client; refresh JWT is persisted server-side as a bcrypt hash on the `RefreshToken` entity (`tokenHash`, `expiresAt`, `revokedAt`) and compared on `/auth/refresh`/`/auth/logout`. Logout sets `revokedAt` rather than deleting the row.
- **Resource-scoped RBAC beyond `@Roles`**: `AuthService` has private helpers (`assertCanEditUser`, `assertCanDeleteUser`, `assertCanCreateRole`, `resolveProviderIdForCreateUser`) enforcing rules like "a provider may only edit/delete their own clients" and "a client may only edit themself" — these live in the service, not in guards, so check there when changing who-can-do-what.
- **HTTP surface** (`/api/auth/*`): `POST create-user` (ADMIN/PROVIDER only), `POST login` (throttled), `POST refresh` (public, body-based), `POST logout` (public, body-based), `GET profile` (JWT required), `PATCH users/:userId`, `DELETE users/:userId` (ADMIN/PROVIDER).
- **Schema**: `synchronize: false` — all schema changes go through TypeORM migrations in `apps/backend/src/database/migrations/`, driven by `apps/backend/src/database/data-source.ts`. Migration file names are timestamp-prefixed; check the latest one before generating a new one so timestamps stay ordered.
- **Israel-specific validation**: `auth/validators/` has custom class-validator constraints for Israeli mobile numbers and locality/city IDs (`israel-locality-city-id-optional`, `israeli-mobile-cell-optional`), backed by a reference data loader (`auth/reference/israel-localities.loader.ts`) and `auth/utils/israeli-mobile.util.ts`.
- **Intentional gaps** (not implemented): no forgot-password/email verification, no OAuth2/social login, no MFA, no httpOnly-cookie-only refresh pattern, no paginated user-listing endpoint.

A more detailed technical inventory (written for a reviewing tech lead) exists at `README-STACK.md` in the repo root — consult it for the full backend auth table-by-table breakdown, but treat it as a snapshot that can drift from the code.

### Config & validation conventions
- Backend uses `@nestjs/config` with a custom `validate` function (fail-fast on boot if env vars are missing/malformed) rather than ad hoc `process.env` reads — extend `env.constants.ts` + `env.validation.ts` together when adding a new env var.
- All backend input validation goes through DTOs (`class-validator`) plus a global `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })` set in `main.ts` — unrecognized body fields are rejected, so new DTO fields must be added explicitly.
- TypeORM entities autoload (`autoLoadEntities: true`) but `synchronize` is off — adding/changing an entity column always requires a paired migration.
