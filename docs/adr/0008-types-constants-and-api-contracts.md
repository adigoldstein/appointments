# Where types, constants and API contracts live

Decided 2026-10-07, after the code had grown types and constants inline in components and services, and had started writing the same API shapes twice (once in the backend, once in the frontend).

## API contracts: one copy, in `@app/shared/types`

**What the API returns** (response bodies, error bodies the frontend reacts to) is defined once in `@app/shared/types` and used by both sides. The backend's controller/service return types and the frontend's HTTP calls use the same interface. Examples: `AuthUser`, `PaginatedUsersResponse`, `LoginResponse`.

**What the API receives** (request bodies, query params) is also defined once there, as an interface named `…Request` / `…Query`. The backend's validation DTO stays a class (class-validator needs decorators) and declares `implements` that interface:

```ts
// @app/shared/types
export interface CreateUserRequest { firstName: string; email: string; role: Role; /* ... */ }

// apps/backend: the class keeps all validation
export class CreateUserDto implements CreateUserRequest { @IsEmail() email: string; /* ... */ }

// frontend: sends exactly the shared shape
create(payload: CreateUserRequest) { /* ... */ }
```

If the DTO and the shared interface drift apart, the build fails, instead of a user hitting a 400 at runtime. The frontend never keeps its own copy of a request or response shape.

**Shared rules** that both sides enforce (limits, patterns) live in `@app/shared/types` too, and both the DTO decorators and the frontend validators read them. Example: `PASSWORD_MIN_LENGTH` / `PASSWORD_PATTERN`.

## Backend internals stay in the backend

Types the frontend never sees (`JwtPayload`, `AuthenticatedUserPayload`, entities, config types) are not shared. Each lives in its own file next to the code that uses it, following the NestJS naming already in use (`*.interface.ts`, or `*.types.ts` for type aliases).

## Frontend: types and constants in their own files

- **Types and interfaces** never sit inside a component, service or store file. They go in a `*.types.ts` file next to it (e.g. `users-list.types.ts`, `ui-badge.types.ts`). A component's input types are part of its public API and live in its `*.types.ts`.
- **Constants** go in a `*.constants.ts` file **when they are used in more than one place**. A constant used by a single file stays private in that file.
- **Placement by reach**: used by both backend and frontend → `@app/shared/types`; used by several frontend libs → the relevant `shared/*` lib; used by one lib → that lib.

**Revisit if**: a second frontend app or a public API client appears, in which case the contracts in `@app/shared/types` may deserve their own lib (e.g. `@app/shared/api-contracts`).
