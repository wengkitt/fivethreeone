# Separate `user` and `lifter` tables

We keep Better Auth's `user` table (auth concerns only: email, password hash, sessions) and add a separate `lifter` table (domain concerns: username, unit preferences, plate increment, training maxes) with a 1:1 FK to `user`. This avoids polluting Better Auth's internal schema with domain fields and makes it possible to swap auth providers without touching domain data.

**Considered options:**

- **Single merged table** — simpler queries (no join) but couples domain data to Better Auth's schema expectations, making it harder to upgrade or replace the auth library.
- **Single table with all fields** — same coupling issue, plus Better Auth's plugin system may write to columns we don't control.

**Consequences:**

- Every authenticated request joins `user` + `lifter` on the request's user ID. Negligible cost with D1, but worth noting.
- Dual-login (username ↔ email) requires checking both tables at login time — the backend resolves the username from `lifter` and delegates password verification to Better Auth.
