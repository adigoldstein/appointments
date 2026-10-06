# Thin app with a feature-shell lib; NgRx Signal Store for app-wide state

**Thin app.** Following Nx's guidance that an application should be "primarily a composition layer", `apps/frontend` holds only bootstrap and wiring: `main.ts`, `app.config.ts`, `app.routes.ts`, `index.html` and global styles. Routes stay in the app (they are exactly that wiring); everything else lives in libs.

**`libs/feature-shell`** holds the app's layout: `ShellComponent`, the context bar, and `ShellNavigationService` (what the side nav shows). It is deliberately app-specific — one shell per app, in the Nx "feature-shell" sense — not a generic reusable component; the reusable parts already live in `ui/*` (`ui-header`, `ui-autocomplete`) and `shared/*`. We don't expect a second frontend app in this monorepo; if one appears it gets its own shell built from the same pieces. Services used only by the shell sit next to it (Angular style guide: group closely related files by feature).

**App-wide state is NgRx Signal Store** (`@ngrx/signals`), in `shared` libs so every feature can inject it:

- `SessionStore` (`@app/shared/auth`) — tokens and the logged-in user, persisted to localStorage (replaces `AuthStorageService`).
- `ActingContextStore` (`@app/shared/acting-context`) — the selected Provider/Client and everything derived from it, persisted per tab to sessionStorage (replaces `ActingContextService`; behavior per ADR-0005).

We chose Signal Store over plain signal services for one consistent shape (`withState` → `withComputed` → `withMethods` → `withHooks`), state that changes only through `patchState` in store methods, and because it is the current Angular standard worth practicing. Conventions: persistence is a single `effect` in `withHooks`, never inside methods; injected dependencies and internal helpers are private store members (`_`-prefixed, e.g. `_router`), so a store's public API is only its state, computeds and methods.

**Not everything becomes a store.** Stateless services stay plain `@Injectable`s: HTTP clients (`UsersApiService`, `ProviderSettingsService`, `AuthApiService`) and pure derivations (`ShellNavigationService`). Component-local UI state (e.g. whether the side nav is open) stays a `signal` in the component.

**Revisit if**: a store grows cross-cutting concerns (loading/error per request, entity collections) — that's the point to adopt `withEntities` / custom `signalStoreFeature`s rather than hand-rolling them per store.
