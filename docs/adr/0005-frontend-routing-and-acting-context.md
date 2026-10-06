# Frontend: fixed per-area routes, acting target held as state

ADR-0004 decided that higher roles act on behalf of lower ones. This records how the frontend is shaped around that.

**The acting target is state, not URL.** The context bar under the header holds the selection: an Admin picks a Provider (and optionally one of that Provider's Clients); a Provider picks one of their Clients. Picking never navigates — you stay on the page you're on and it reloads for the new target, so an Admin can add a client, switch Provider in the dropdown, and add another without leaving the page. An indicator ("פועל עבור: …") always shows who the screen is working on. `ActingContextStore` (`@app/shared/acting-context`, an NgRx Signal Store — ADR-0007) owns the selection and derives everything else from it plus the logged-in user.

*Changed 2026-10-06:* the first version put the target in the URL (`/admin/providers/:providerId/...`). We moved to state because switching from the dropdown is the primary workflow and ids in the address bar added nothing to it. What the URL gave for free we keep where it matters: the selection is stored in **sessionStorage**, so a refresh keeps it and each browser tab has its own; it is dropped on logout or when a different user logs in. We accepted losing back-button history of selections and shareable deep links to a target.

**Areas are mounted, not duplicated**, at fixed URLs with no ids:

```
/admin/...             Admin's own pages
/admin/provider/...    Provider pages, for the selected Provider
/admin/client/...      Client pages, for the selected Client
/provider/...          the Provider's own pages
/provider/client/...   Client pages, for the Provider's selected Client
/client/...            the Client's own pages
```

Each feature lib exports one route list (`featureProviderRoutes`, `featureClientRoutes`) that the app mounts in every place it is reachable from. Acting always happens inside the actor's own top-level area, so the exact-role `authGuard` on each one stays correct; `requireProviderGuard`/`requireClientGuard` send a selection-dependent area back one level when nothing is selected. The backend authorizes every target id anyway (ADR-0002/0004).

**One rule for "which Provider do I send".** `providerIdForRequest()` is the selected Provider for an Admin and `null` for everyone else (the backend derives a Provider's own id from the token and rejects it if sent). Components ask the service instead of branching on role themselves.

**Pages read the context once and still follow a switch.** The shell renders the router outlet inside a one-item `@for` keyed on `pageKey()`, so changing the target re-creates the page on screen. The key only includes the Client on Client pages, so picking a Client never wipes a half-filled Provider page. A switch also re-runs the current route's guards (same-URL navigation with `onSameUrlNavigation: 'reload'`; the onboarding-gated route uses `runGuardsAndResolvers: 'always'`), so e.g. switching to a not-yet-onboarded Provider lands on their settings form.

**Nav is sectioned by target**: the actor's own links, then the selected Provider's pages under that Provider's name, then the selected Client's. Items are defined per area with relative paths and resolved against the area's base URL.

**Onboarding while acting**: when an Admin works on a Provider who hasn't completed onboarding, they land on the settings form with a Skip option. A skip is remembered for that browser tab only; the Provider still has to complete onboarding themselves.

**Revisit if**: deep links to a specific target become a real need (e.g. linking from an email to "Provider X's settings"). That could be added as an optional `?providerId=` that seeds the selection, without going back to ids in every route.
