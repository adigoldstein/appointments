# Frontend routing: nested per-role areas, acting target in the URL

ADR-0004 decided that higher roles act on behalf of lower ones. This records how the frontend is shaped around that.

**Areas are mounted, not duplicated.** Each feature lib exports one route list (`featureProviderRoutes`, `featureClientRoutes`) and the app mounts it in every place that area can be reached from:

```
/admin                                         Admin's own pages
/admin/providers/:providerId/...               Provider area, Admin acting for a Provider
/admin/providers/:providerId/clients/:clientId/...   Client area, two levels down
/provider/...                                  Provider area, the Provider themselves
/provider/clients/:clientId/...                Client area, Provider acting for a Client
/client/...                                    Client area, the Client themselves
```

Because acting always happens *inside* the actor's own top-level area, the existing exact-role `authGuard` on `/admin`, `/provider` and `/client` stays correct — no hierarchical guard is needed. The backend authorizes every target id anyway (ADR-0002/0004); the frontend never relies on routing for security.

**The URL is the only source of the acting target.** `ActingContextService` (`@app/shared/acting-context`) reads `providerId`/`clientId` from the active route and falls back to the logged-in user (a Provider is their own `providerId`; a Client is their own `clientId` and their `providerId`). Pages never read the session user to decide *whose* data to show. We rejected localStorage/sessionStorage for this: the URL survives refresh, works with back/forward and bookmarks, and lets two tabs act for two different Providers without one silently changing the other.

**Pages read the context once, on creation.** Angular normally *reuses* a page when only a route param changes, which would leave it showing the previous Provider after a switch. `ActingContextReuseStrategy` recreates the routed subtree whenever the acting `providerId`/`clientId` changes, and `ActingContextService` updates at `ResolveEnd` (before the new page is constructed), so a page can read `routeProviderId()` in `ngOnInit` without subscribing to changes.

**Pages build links from the context, never from hard-coded role prefixes.** `providerBaseUrl()`/`clientBaseUrl()` give the right prefix for whoever is looking (`/provider` for the Provider, `/admin/providers/<id>` for an Admin). Nav items are defined per area with relative paths and resolved against that base.

**The picker is a context bar under the header**, visible to Admins and Providers: `Admin › [Provider ▾] › [Client ▾] ✕`. Switching the Provider keeps the current Provider-area sub-page; clearing a level goes back up one level.

**Onboarding while acting**: when an Admin enters a Provider who hasn't completed onboarding, they land on the settings form with a Skip option. A skip is remembered for that browser tab only; the Provider still has to complete onboarding themselves.

**Revisit if**: an area needs genuinely different pages per actor (e.g. Admin-only tools inside the Provider area). Prefer an `ActingContextService`-based `@if` inside the shared page first; split routes only if that gets unwieldy.
