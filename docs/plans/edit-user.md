# Plan: edit a user (from the Clients and Providers lists)

Status: **approved 2026-10-08**; step 1 done, step 2 in review.
Follows the user lists (docs/plans/client-list.md), ADR-0004/0005 (acting on behalf), ADR-0006 (Hebrew-only), ADR-0008 (types and contracts).

## Goal

From a row in the Clients list or the Providers list, open that user's details in the same form used to add users, change them, save, and come back to the list.

## In scope

- An "עריכה" button on every row of both lists, next to deactivate / reactivate.
- The add-user form becomes a create **or** edit form, renamed from `add-user` to `user-form`.
- Edit mode: fields pre-filled, title "עריכת לקוח" / "עריכת נותן שירות", save with `PATCH /auth/users/:id`, then back to the list.
- Editable fields: first name, last name, email, phone (can be cleared), city (can be cleared).
- "שמירה", "ביטול" and a "חזרה" link at the top; all three return to the list.

## Out of scope

- **Password**: never on the edit screen. Changing a password will be a separate "change my password" section for the user themselves (later plan).
- Changing a user's role, or moving a Client to another Provider.
- Deactivate / reactivate from the edit page (already on the list rows).
- A Provider editing their own profile (the same form can serve it later; not in this plan).

## Decisions (2026-10-08)

1. **A page, not a dialog.** The form has 5 fields with validation and a city autocomplete (dropdowns get clipped inside dialogs), it is full-screen on mobile anyway, it matches the add page, and it gives back-button and link support. A side panel (drawer) was considered and left for later.
2. **No password field** in edit mode.
3. **Rename** `add-user` to `user-form`: one component, two modes.
4. **The list does not remember its view** (decided 2026-10-08, dropped the earlier "list state in the URL" step): returning to the list, from the nav or from edit, opens it fresh (page 1, no search, הכל). Kept simple; add it later only if it gets in the way. Not in `UsersApiService` either: it stays a stateless HTTP service (ADR-0007).
5. **Buttons**: submit is "הוספה" when adding and "שמירה" when editing; edit also has "ביטול" next to it and "חזרה ללקוחות" / "חזרה לנותני שירות" at the top. No unsaved-changes prompt (POC).

## Screens

```
/provider/clients/<id>/edit            Provider edits own Client
/admin/provider/clients/<id>/edit      Admin edits a Client of the selected Provider
/admin/providers/<id>/edit             Admin edits a Provider
```

The user id is in the URL here on purpose: it identifies the record being edited (a resource), not the acting target, which stays state (ADR-0005).

Edit mode of the form:

| | Create (today) | Edit |
|---|---|---|
| Title | הוספת לקוח / הוספת משתמש | עריכת לקוח / עריכת נותן שירות |
| Fields | empty | pre-filled from `GET /auth/users/:id` (city shown by its Hebrew name) |
| Password | required | not shown |
| Role choice (Admin) | shown | hidden |
| Submit | "הוספה" | "שמירה", plus "ביטול" next to it and "חזרה ל..." at the top, both back to the list |
| Sent | `POST /auth/create-user` | `PATCH /auth/users/:id` with only the fields that changed (`UpdateUserRequest`) |
| Email already used | reactivation flow | plain "כתובת האימייל כבר רשומה במערכת." |
| After saving | stays, ready for the next user | back to the list (opens fresh), notice "הפרטים של ... נשמרו." |

States: loading (skeleton fields), user not found or not allowed (message + back to the list), save error (inline, Hebrew only).

Clearing works with the existing API: an empty phone is stored as no phone, and `cityId: null` removes the city.

## Where things live

| Piece | Where |
|---|---|
| `UserFormPageComponent` (renamed from `AddUserPageComponent`) and its types / error mapping | `feature-users` (files renamed `user-form.*`) |
| "עריכה" row button | `users-list.page.html` (icon from `ui-icons`; one new Phosphor icon, `pencil-simple`) |
| Routes | `apps/frontend/src/app/app.routes.ts` (3 edit routes) |
| Data | existing `UsersApiService.get` to load; a new `UsersApiService.update(id, UpdateUserRequest)` to save, which (like `setDeactivated`) announces `usersChanged$` so the lists refresh |

**Backend**: no changes. `GET /auth/users/:id` and `PATCH /auth/users/:id` exist with the right permissions (Admin: anyone; Provider: own Clients).

## Steps (each reviewed and committed separately)

1. **Rename** `add-user` to `user-form` (files, class, selector, routes). Pure rename, no behavior change.
2. **Edit mode** (Clients and Providers together) in the form: load, pre-fill, hide password and role, diff-and-PATCH, cancel, errors; `UsersApiService.update`; the 3 edit routes.
3. **"עריכה" button** on list rows (both lists), back to the list after saving with the notice.

## How each step is tested

- Step 1: build, lint, and the existing add-user suite unchanged.
- Step 2: browser test: pre-filled values; change name, phone, clear city; save sends only changed fields; email conflict message; a Provider can't open another Provider's Client (not found / not allowed state); Admin edits a Provider.
- Step 3: browser test: edit from a list row, save, land back on the list with the notice and the change visible; cancel and back return without saving.
- Every step: build, lint, regression suites, `/code-review`.

## Open questions

- None at the moment.
