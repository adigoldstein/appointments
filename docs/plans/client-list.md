# Plan: user lists (Clients for a Provider, Providers for the Admin)

Status: **all questions answered (2026-10-07), waiting for final approval**. Nothing is built until this is approved.
Closes Epic 3's frontend (see ROADMAP.md). Follows ADR-0004/0005 (acting on behalf), ADR-0006 (Hebrew-only), ADR-0007 (libs, stores).

## Goal

A Provider (or an Admin working on a selected Provider) can see all of that Provider's Clients, find one, and deactivate or reactivate them. The Admin gets the same list for Providers. This is the last missing piece of Epic 3.

## In scope

- Client list for the Provider on screen: the Provider themselves, or the Provider selected in the context bar.
- Provider list for the Admin, in the Admin's own area.
- Search by name or email (debounced, as in the pickers).
- Status filter: הכל / פעילים / לא פעילים, default הכל. Inactive users are shown muted.
- Paging (20 per page).
- Status per row: active / inactive.
- Deactivate and reactivate per row ("הפעלה מחדש" on inactive rows), with a confirmation step for deactivate.
- "עבודה בשמו" on each Client row: selects that Client in the context bar (a shortcut for the picker).
- Loading, empty, no-results and error states.
- A primary button on the list to the existing add-user page.

## Out of scope (later, or never in this POC)

- Editing a user's details (separate plan).
- Deleting users (never, ADR-0003).
- Sorting by column, filters beyond search and status, bulk actions (including "reactivate all"), export.
- A user details page.
- A server-side cache: one indexed query per page is cheap, and invalidation isn't worth it.

## Design read (per the taste skill)

Reading this as: **internal product UI for small-business Providers and one Admin, with a calm minimalist language (minimalist-ui), on the existing Angular + SCSS token system.**

The taste skill excludes data tables from its scope, so only its transferable rules apply (see the "design-skills" decision): skeleton loading instead of spinners, composed empty states, inline errors, one accent and one radius scale, no em-dashes or other AI tells in copy, library-sourced icons only. Dials for this screen: variance 4, motion 3, density 5.

## Screens

### List page (same page in two modes)

```
┌──────────────────────────────────────────────────────────┐
│ לקוחות                                  [הוספת לקוח]     │  title + count, one primary action
│ 12 לקוחות                                                │
│ [חיפוש לפי שם או אימייל........]   [הכל|פעילים|לא פעילים] │
├──────────────────────────────────────────────────────────┤
│ דנה כהן           dana@mail.com   050-1234567  רמת גן    │
│ [פעיל]                         [עבודה בשמו]  [השבתה]      │
├──────────────────────────────────────────────────────────┤
│ יוסי לוי          yossi@mail.com  -            -         │  muted row
│ [לא פעיל]                                [הפעלה מחדש]     │
├──────────────────────────────────────────────────────────┤
│                 ‹ הקודם   עמוד 1 מתוך 2   הבא ›            │
└──────────────────────────────────────────────────────────┘
```

- **Rows, not a heavy table**: one divider between rows only (taste: no border on every side of every row). On desktop the fields sit in aligned columns; on mobile each row stacks (name and status on top, details below, actions at the end).
- **Status badge**: small pastel pill (minimalist-ui). Active = pale green, inactive = neutral grey. No decorative dots.
- **Inactive rows** are muted (lower text contrast), but still readable (WCAG AA).
- **Actions**: "השבתה" opens a confirmation (existing `ui-modal`) that says what happens; "הפעלה מחדש" acts directly. For a Provider, the deactivate confirmation also says their Clients will be blocked too.

### States

| State | What the user sees |
|---|---|
| Loading | skeleton rows in the shape of real rows (no spinner) |
| Empty (no users at all) | a short explanation and the add button |
| No results (search / filter) | "לא נמצאו לקוחות" for the current search, and a way to clear it |
| Error loading | inline message with "נסו שוב" |
| Action failed | inline message on that row |

## Where things live

| Piece | Lib | Why |
|---|---|---|
| `UsersListPageComponent` (both modes) | `feature-users` | next to the add-user page, same domain |
| `ui-icon` + icon SVGs | new `libs/ui/icons` | our own files, copied from Phosphor (MIT), only the icons in use |
| `ui-badge` (status pill) | new `libs/ui/badge` | presentational, reusable (appointment statuses later) |
| `ui-pagination` | new `libs/ui/pagination` | presentational, reusable |
| skeleton row | inside the page (or `ui-skeleton` if it gets reused) | start local, extract when needed |
| data | existing `UsersApiService.list` / `setDeactivated` | no new service |

**Backend**: one small addition, a `status=active|inactive` filter on `GET /auth/users` (omitted = all). Filtering must happen on the server so paging and the total count stay correct. Everything else exists: `page`, `limit`, `search`, `role`, `providerId`, `deactivatedAt`.

**Client-side cache**: the page remembers each response by (filter, search, page), so going back to a combination already seen costs no request. The cache is cleared on `UsersApiService.usersChanged$`, i.e. any add / deactivate / reactivate in this tab. Changes made by other users or tabs show up after the next change or a reload: accepted for the POC.

**Icons**: `<ui-icon name="...">` renders SVGs copied from one professional set (Phosphor). No npm dependency, consistent strokes, and not hand-drawn (taste rule). The hand-drawn eye icon in `ui-input` moves to it in the redesign audit.

## Routes and navigation

| Who | URL | Nav |
|---|---|---|
| Provider | `/provider/clients` | "לקוחות" |
| Admin, with a Provider selected | `/admin/provider/clients` | "לקוחות" under the Provider's section |
| Admin | `/admin/providers` | "נותני שירות" |

The add-user nav items ("הוספת לקוח", "הוספת משתמש") stay in the nav, and the list pages also get a primary button to the same page.

## Steps (each one is reviewed and confirmed before the next starts)

1. **Backend `status` filter** on `GET /auth/users` + API tests.
2. **`ui-icons`**: `<ui-icon>` + the first Phosphor icons (search, row actions, chevrons) + story.
3. **`ui-badge`**: component + story (active / inactive).
4. **`ui-pagination`**: component + story (first, middle, last page; hidden when there is one page).
5. **List page, read-only**: route, nav, title + count, add button, rows, search, status filter, paging, client-side cache, all states. No actions yet.
6. **Row actions**: deactivate (with confirmation) / reactivate, inline action errors, cache cleared on change.
7. **"עבודה בשמו"**: selects the Client in the context bar.
8. **Admin Providers mode**: same page with `mode: 'providers'`, the Provider-specific confirmation text.

## How each step is tested

- Step 1: API tests (filter values, combined with search and paging, Provider can't widen scope).
- Steps 2-4: Storybook stories, checked in the browser.
- Steps 5-8: browser tests like the existing ones (seeded test users, cleaned up after): list shows only the right Provider's Clients, search, filter, paging across 2 pages, cache hit on a repeated filter, empty / no-results / error states, deactivate with confirm then the row and the login are blocked, reactivate, act-as selects the Client, Admin mode, a Provider can never see another Provider's Clients.
- Every step: build, lint, and the existing regression suites.
- `/code-review` on each step's diff before asking to commit.

## Decisions (2026-10-07)

1. Nav: add-user stays in the side nav **and** gets a primary button on the list pages.
2. Inactive users are shown (muted) by default, with a status filter הכל / פעילים / לא פעילים (default הכל), filtered on the server, cached per query in the browser.
3. Reactivation is per row, one user at a time; no "reactivate all". It uses the existing `PATCH /auth/users/:userId { deactivate }` (Admin: anyone; Provider: own Clients only; nobody: themselves), already tested and wired to `usersChanged$`. No new endpoint.
4. Icons: our own `libs/ui/icons` lib with SVGs copied from Phosphor.
5. "עבודה בשמו" shortcut on Client rows: in.
