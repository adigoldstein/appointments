# Technical stack & architecture (README-STACK)

This document is a **technical inventory** of methodologies, frameworks, libraries, and patterns used in this repository. It is intended for a **technical lead** reviewing tooling choices, architecture, and especially **authentication & role-based access**.

---

## 1. Monorepo (Nx)

| Area | Choice | Notes |
|------|--------|--------|
| **Workspace** | [Nx](https://nx.dev) **22.7.3** | Single repo for multiple apps and libraries; task graph, caching, and `nx run-many` for parallel dev. |
| **Orchestration** | `nx serve`, `nx build`, `nx run-many` | Root `package.json` scripts: `start`, `dev`, `start:frontend`, `start:backend`, `build`, `lint`, `test`. |
| **Plugins (examples)** | `@nx/angular`, `@nx/nest`, `@nx/node`, `@nx/webpack`, `@nx/eslint`, `@nx/storybook`, `@nx/js`, `@nx/web` | Angular app, Nest backend, webpack bundling for Node, ESLint, Storybook. |
| **Inferred / configured tasks** | `project.json` per project | Build/serve/lint targets defined or inferred per Nx conventions. |
| **Analytics** | Disabled in `nx.json` (`"analytics": false`) | |

**Methodology:** Domain-style split between **applications** (`apps/`) and **reusable libraries** (`libs/`), with **TypeScript path aliases** in `tsconfig.base.json` (e.g. `@app/shared/types`, `@app/feature-auth`) so the same types and UI can be shared across the Angular shell and future consumers.

---

## 2. Applications (`apps/`)

| App | Role | Stack highlights |
|-----|------|------------------|
| **`frontend`** | Primary Angular SPA | `@angular/build:application`, dev server with **`proxy.conf.json`** forwarding `/api` → `http://localhost:3000` (Nest global prefix). Run **`npm run start`** (or `dev`) for full-stack, or start frontend and backend separately. **Storybook** targets for UI/docs. |
| **`backend`** | REST API | **NestJS 11**, **TypeORM**, **PostgreSQL**, **Passport JWT**, global **`/api`** prefix, **class-validator** via global `ValidationPipe`. **Webpack** build (`webpack-cli`) via Nx `run-commands`. |
| **`backend-e2e`** | E2E placeholder | Nx e2e project scaffold (verify locally if tests are wired). |
| **`appointments`** | Legacy / duplicate Angular app (if still present) | Older `@angular-devkit/build-angular:browser` app; primary UI is **`frontend`**. |

---

## 3. Shared libraries (`libs/`)

Libraries are consumed via **`tsconfig.base.json` paths** (prefix `@app/...`).

| Library path | Purpose (high level) |
|--------------|----------------------|
| **`@app/shared/types`** | Cross-cutting types, e.g. **`Role` enum** (`ADMIN`, `PROVIDER`, `CLIENT`) used by backend and frontend for consistent RBAC vocabulary. |
| **`@app/shared/api`** | API-related shared code (e.g. base URL helpers). |
| **`@app/shared/utils`** | Shared utilities (e.g. date helpers). |
| **`@app/design-system`** | Global SCSS tokens, reset, mixins, breakpoints (design system foundation). |
| **`@app/ui/*`** | Presentational UI: `button`, `card`, `input`, `modal`, `date-picker` (some with **Storybook** stories). |
| **`@app/feature-auth`** | Auth-related Angular routes/pages (feature slice). |
| **`@app/feature-admin`** | Admin-area routes/pages. |
| **`@app/feature-customer`** | Customer-area routes/pages. |
| **`@app/feature-client-portal`** | Client-portal routes/pages. |

**Methodology:** **Feature libraries** for vertical slices (auth, admin, customer, client portal) plus **shared** and **UI** layers for reuse and clearer ownership boundaries.

---

## 4. Frontend (Angular) — summary

| Topic | Choice |
|-------|--------|
| **Framework** | Angular **~21.2** |
| **UI** | Angular **Material** & **CDK** |
| **Language** | TypeScript **~5.9** |
| **Styling** | **SCSS**; design system imported from `@app/design-system` |
| **Lint** | **ESLint 9** + **angular-eslint** + **typescript-eslint** |
| **Component docs** | **Storybook 10** (`@storybook/angular`, `@nx/storybook`) |
| **HTTP / API** | Dev proxy to backend **`/api`** (`apps/frontend/proxy.conf.json`) |

---

## 5. Backend (NestJS) — general

| Topic | Choice |
|-------|--------|
| **Runtime** | Node.js; Nest **11** |
| **HTTP** | `@nestjs/platform-express` |
| **Config** | `@nestjs/config` with **startup validation** (`validateEnvironment` in `apps/backend/src/config/env.validation.ts`) |
| **Persistence** | **TypeORM** + **PostgreSQL** (`pg`); **`synchronize: false`** — schema via **migrations** |
| **Migrations** | TypeORM CLI via root script `npm run typeorm` / `migration:run` / `migration:revert`; `DataSource` in `apps/backend/src/database/data-source.ts` (dotenv + explicit entity/migration globs) |
| **Input validation** | `class-validator` + `class-transformer`; global **`ValidationPipe`**: `whitelist`, `forbidNonWhitelisted`, `transform` (`apps/backend/src/main.ts`) |
| **Rate limiting** | `@nestjs/throttler` (global module in `AppModule`); custom guard on login (see auth section) |
| **Build** | Webpack (`webpack` / `webpack-cli`); SWC-related dev tooling in workspace for Nx/JS |

### 5.1 Environment variables (backend)

Validated at boot (see `ENV_KEYS` / `EnvironmentVariables`):

- **DB:** `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_DATABASE`
- **JWT:** `JWT_ACCESS_SECRET`, `JWT_ACCESS_EXPIRES_IN`, `JWT_REFRESH_SECRET`, `JWT_REFRESH_EXPIRES_IN`
- **Security:** `BCRYPT_SALT_ROUNDS` (default **12** in validator if unset)
- **Server:** optional `PORT`

---

## 6. Backend — authentication & authorization (detailed)

This application is **role-based**: users have a **`role`** (`ADMIN` | `PROVIDER` | `CLIENT`) and optional **`providerId`** linking a **CLIENT** to a **PROVIDER**.

### 6.1 Packages & building blocks

| Package / module | Usage |
|------------------|--------|
| **`@nestjs/jwt`** | Sign / verify **access** and **refresh** JWTs |
| **`@nestjs/passport`** + **`passport`** + **`passport-jwt`** | **JWT strategy**; bearer token extraction |
| **`bcrypt`** | Password hashing for users; hashing **refresh token** material before persistence |
| **`@nestjs/typeorm`** | `User` and `RefreshToken` repositories |

### 6.2 JWT strategy (`JwtStrategy`)

- Extends **`PassportStrategy(Strategy, 'jwt')`** from `passport-jwt`.
- **Bearer token** from `Authorization` header (`ExtractJwt.fromAuthHeaderAsBearerToken()`).
- **Secret:** `JWT_ACCESS_SECRET` (via `ConfigService`).
- **`validate()`** maps `JwtPayload` → **`AuthenticatedUserPayload`**: `{ userId: payload.sub, role: payload.role }`.

### 6.3 JWT payload & guards

| Artifact | Purpose |
|----------|---------|
| **`JwtPayload`** | `sub` (user id), `role` |
| **`JwtAuthGuard`** | `AuthGuard('jwt')` — protects routes that need a logged-in user |
| **`RolesGuard`** + **`@Roles(...)`** decorator | Declarative **RBAC** at handler level: compares JWT `role` to allowed roles |
| **`@CurrentUser()`** decorator | Injects **`AuthenticatedUserPayload`** on controller methods |

### 6.4 Token model

| Token | Storage / transport | Notes |
|-------|---------------------|--------|
| **Access JWT** | Returned to client (e.g. in login response); validated on each protected request | Short-lived; `JWT_ACCESS_EXPIRES_IN` |
| **Refresh JWT** | Returned on login; sent on **`/auth/refresh`** and **`/auth/logout`** | Signed with **`JWT_REFRESH_SECRET`**; expiry `JWT_REFRESH_EXPIRES_IN` |
| **Refresh persistence** | **`RefreshToken` entity**: hashed token (`tokenHash`), `expiresAt`, `revokedAt`, relation to `User` | Refresh tokens compared with **bcrypt** against stored hash; logout sets **`revokedAt`** |

### 6.5 Passwords & users

| Topic | Implementation |
|-------|------------------|
| **Password storage** | **`passwordHash`** on `User`; bcrypt with configurable salt rounds |
| **User model** | Email, names, role, `providerId` (nullable), relations: `provider` / `clients`, `refreshTokens` |
| **RBAC in service layer** | Beyond `@Roles`, **`AuthService`** uses private helpers such as **`assertCanEditUser`**, **`assertCanDeleteUser`**, **`assertCanCreateRole`**, **`resolveProviderIdForCreateUser`** for **resource-scoped** rules (e.g. provider may edit/delete only **their** clients). |

### 6.6 HTTP surface (`AuthController`, base path `/api/auth`)

| Method | Path | Guards / throttling | Behaviour summary |
|--------|------|---------------------|---------------------|
| **POST** | `/auth/create-user` | `JwtAuthGuard`, `RolesGuard`, **`@Roles(ADMIN, PROVIDER)`** | Creates users; role creation rules enforced; **CLIENT** gets `providerId` from admin input or logged-in provider |
| **POST** | `/auth/login` | **`LoginThrottlerGuard`**, `@Throttle` (e.g. limit per minute) | Email/password; issues access + refresh; stores refresh hash |
| **POST** | `/auth/refresh` | Public (body refresh token) | New access token after refresh JWT + DB validation |
| **POST** | `/auth/logout` | Public (body refresh token) | Revokes matching refresh session |
| **GET** | `/auth/profile` | `JwtAuthGuard` | Current user profile |
| **PATCH** | `/auth/users/:userId` | `JwtAuthGuard` | Update profile fields; **service-level** rules: admin broad access; client self-only; provider self + **own clients** |
| **DELETE** | `/auth/users/:userId` | `JwtAuthGuard`, `RolesGuard`, **`@Roles(ADMIN, PROVIDER)`** | Admin: delete others (not self); provider: delete only **CLIENT** rows with matching **`providerId`** |

### 6.7 DTO validation (auth)

- **`CreateUserDto`**, **`LoginDto`**, **`UpdateUserDto`**, **`RefreshTokenDto`** — `class-validator` constraints (length, email, password complexity where applicable).

### 6.8 Login abuse mitigation

- **`LoginThrottlerGuard`** extends **`ThrottlerGuard`**: tracker key derived from **normalized email** (`login-<email>`) so throttling is **per-account**, not only per IP.
- Custom message on throttle violation.

### 6.9 RBAC summary (product-level)

| Role | Typical capabilities in this API |
|------|-----------------------------------|
| **ADMIN** | Create users (per rules), broad user update, delete users, assign **`providerId`** when creating **CLIENT** users |
| **PROVIDER** | Create **CLIENT** users (server sets `providerId` to self), update/delete **own profile** and **own clients** |
| **CLIENT** | Update **own** user record only (via `assertCanEditUser`) |

---

## 7. Cross-cutting engineering practices

| Practice | Where it shows up |
|----------|-------------------|
| **Strict config** | `validateEnvironment` on Nest bootstrap; TypeORM `DataSource` reads required DB env |
| **Schema safety** | `synchronize: false`; SQL migrations under `apps/backend/src/database/migrations/` |
| **API consistency** | Global prefix `/api`; DTO validation with whitelist |
| **Shared contracts** | `@app/shared/types` for **roles** and domain types shared FE/BE |
| **Code quality** | ESLint + Prettier in devDependencies |

---

## 8. Intentional gaps (not implemented yet)

Useful for a lead to know what is **out of scope** today:

- No **forgot-password / email verification** flow in this inventory.
- No **OAuth2 / social login** described in the codebase.
- No **MFA** or **httpOnly cookie**-only refresh pattern documented here.
- **Listing users** (pagination, admin/provider directory APIs) is not part of the summarized `AuthController` surface.

---

## 9. Quick reference commands

```bash
npm run start             # frontend + backend (parallel)
npm run dev               # same, streamed output
npm run start:frontend    # Angular dev server only
npm run start:backend     # Nest API only
npm run migration:run   # TypeORM migrations
npx nx graph            # dependency graph
```

---

*Generated as a living technical overview of this repository’s stack and auth design.*
