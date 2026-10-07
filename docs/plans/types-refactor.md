# Plan: types, constants and API contracts refactor (ADR-0008)

Status: **approved 2026-10-07**, in progress.
Brings the existing code in line with ADR-0008 before the client list continues (its step 6 would otherwise add more of the same). Pure refactor: no behavior change, every existing test suite must stay green.

## Goal

Every API shape exists once, in `@app/shared/types`; no types sit inside components, services or stores; shared rules and repeated constants have one home; dead types are gone.

## Out of scope

- Renaming anything users see, changing behavior, or changing endpoints.
- Constants used in a single file (they stay private there, per ADR-0008). Example: `STATUS_FILTER_OPTIONS` is only used by the list page, so it stays in that file; its type `StatusFilter` moves to `users-list.types.ts`.

## Inventory (what moves where)

### A. API responses → `@app/shared/types`

| Shape | Today | After |
|---|---|---|
| `LoginResponse`, `RefreshResponse`, `LogoutResponse` | backend `auth/interfaces/`; frontend repeats `RefreshResponse` in `token-refresh.service.ts` | one copy in shared/types, used by both |
| Provider settings response | backend returns the entity; frontend hand-writes `ProviderSettingsResponse` | `ProviderSettingsResponse` in shared/types; backend methods return it |
| 409 "reactivatable" body | backend builds an inline object; frontend hand-writes `ReactivatableConflict` | `ReactivatableConflictBody` in shared/types, used to build and to read it |

`AuthSession` stays (it is the frontend's stored session, which is `LoginResponse` exactly, so it becomes an alias of it rather than a second definition).

### B. API requests → `@app/shared/types`, DTOs `implements` them

| Shared interface | Backend DTO (stays a class) | Frontend copy removed |
|---|---|---|
| `CreateUserRequest` | `CreateUserDto` | `CreateUserPayload` |
| `UpdateUserRequest` | `UpdateUserDto` | (inline object in `setDeactivated`) |
| `ListUsersQuery` | `ListUsersQueryDto` | `ListUsersParams` |
| `LoginRequest` | `LoginDto` | (login service's inline type) |
| `RefreshTokenRequest` | `RefreshTokenDto` | (inline object in token refresh / logout) |
| `ProviderSettingsRequest` | `CreateProviderSettingsDto` | `CreateProviderSettingsPayload` |
| `ProviderTargetQuery` | `ProviderTargetQueryDto` | (inline params) |
| `SearchLocalitiesQuery` | `SearchLocalitiesQueryDto` | (inline params) |

### C. Shared rules → `@app/shared/types`

- Provider settings limits, today repeated in the DTO and the settings page: min/max appointment duration (5 / 480 minutes), max number of durations (12), max cancellation window (10,080 minutes = 7 days). Same pattern as `PASSWORD_*`.

### D. Frontend types out of component / service / store files → `*.types.ts`

| From | Types | To |
|---|---|---|
| `users-list.page.ts` | `StatusFilter` | `users-list.types.ts` |
| `add-user.page.ts` | `AddUserMode`, `NewUserRole` | `add-user.types.ts` |
| `create-user-error.ts` | `CreateUserFailure` | `create-user-error.types.ts` |
| `shell-navigation.service.ts` | `NavLink`, `NavSection` | `shell-navigation.types.ts` |
| `acting-context.store.ts` | `ActingSelection`, state types | `acting-context.types.ts` |
| `session.store.ts` | `SessionState` | `session.types.ts` |
| `debounced-search.ts` | `DebouncedSearchOptions`, `DebouncedSearch` | `debounced-search.types.ts` |
| `validation.messages.ts` | `FieldErrorMessage(s)` | `validation.types.ts` |
| `ui-autocomplete.component.ts` | `UiAutocompleteOption` | `ui-autocomplete.types.ts` |
| `ui-badge.component.ts` | `UiBadgeTone` | `ui-badge.types.ts` |
| `ui-button.component.ts` | `UiButtonVariant`, `UiButtonSize` | `ui-button.types.ts` |
| `icons.ts` | `UiIconName` | `ui-icon.types.ts` |
| `nav-items.ts` | `NavItem` | `nav-items.types.ts` |

Public exports (`index.ts`) keep exporting the same names, so imports elsewhere don't change.

### E. Constants used in more than one place

| Constant | Today | After |
|---|---|---|
| "אירעה שגיאה. נסו שוב מאוחר יותר." | 3 copies (login, settings, add-user) | `GENERIC_ERROR_MESSAGE` in `shared/utils` |
| Search debounce 250 ms | `debounced-search.ts` and the list page | one `SEARCH_DEBOUNCE_MS` in `shared/utils`, used by both |

### F. Backend internals (stay in the backend, own files)

- `DurationUnit` (inside `auth.service.ts`) → its own `*.types.ts` next to it.
- `EnvironmentVariables` (inside `env.constants.ts`) → `env.types.ts`.

### G. Dead code

- `AppointmentSummary` (old scaffold, unused, wrong statuses), `UserRole` alias (unused), `common/enums/role.enum.ts` (re-export nobody imports).

## Steps (each reviewed before the next)

1. **API responses (A)** + `AuthSession` alias. Also: retag `shared/types` from `scope:frontend` to `scope:shared` (the backend uses it too), and add an Nx lint rule (`bannedExternalImports`) so it can never import `@angular/*` or `@nestjs/*`, keeping it framework-neutral for both sides.
2. **API requests (B)**: shared interfaces, DTOs `implements`, frontend uses them.
3. **Shared rules (C)**: provider settings limits.
4. **Frontend types to `*.types.ts` (D)**.
5. **Repeated constants (E)**, **backend internals (F)**, **dead code (G)**.

## How each step is tested

- Backend type-check and frontend build (the `implements` checks run here).
- Lint on every touched project.
- All existing browser and API suites: acting context, add-user, users list, refresh, field errors, login, status filter, backend API checks. No behavior may change, so they must all pass unchanged.
- `/code-review` on each step's diff.

## Decisions (2026-10-07)

- Approved. Each step is reviewed and committed separately.
- Step 1 includes the `shared/types` retag and the framework-neutral lint rule.
- Backend DTOs stay classes and declare `implements` the shared request interfaces; the frontend uses those interfaces as types.
