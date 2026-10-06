# Hebrew-only UI

The app is Israel-only, and everything a user reads is in Hebrew, right to left (`<html lang="he" dir="rtl">`). There is no i18n layer and no English UI — decided 2026-10-06, after the app had already grown Hebrew-first without the choice being written down.

**What this covers**: all visible text — labels, buttons, navigation, placeholders, validation and error messages, empty states — and all values offered for *selection*. Reference data is shown by its Hebrew name: a city is displayed as `hebrewName`, never `englishName`.

**Exceptions — values that are inherently Latin stay as they are**: email addresses, passwords, URLs, and anything else that is only ever written in Latin characters. Those fields render left to right (`dir="ltr"`) inside the RTL page so they display correctly.

**Consequences**:

- Backend error messages stay in English: the API is developer-facing. Whatever reaches the user is mapped to Hebrew in the frontend. A raw backend `message` must not be shown to the user as-is (the provider settings page currently does this — fix when touched).
- Code, comments, commit messages and docs stay in English; this decision is about the UI only.
- Scaffold placeholder text in English (the "… feature" overview cards) is replaced with Hebrew as those pages are built.

**Revisit if**: the app needs to serve non-Hebrew speakers. That means introducing Angular i18n (or a translation library) and switching direction per locale — a cross-cutting change best made before many more pages exist.
