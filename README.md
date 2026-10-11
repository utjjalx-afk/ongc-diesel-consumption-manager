# ONGC Operations Portal

Local portal for well sites, vehicle diesel logs, maintenance, and crew OT/FDE statements.

## Run

With Node.js 18 or newer installed:

```powershell
npm install
npm start
```

Open http://localhost:3000. Use your existing registered account. Existing primary passwords are automatically migrated to salted hashes on startup; password matching is now case sensitive and old alternative passwords are removed. Restart the server and sign in again after updating.

On a fresh installation without a users database, set `ONGC_ADMIN_PASSWORD` before starting, or use the initial passwords printed once in the server console. Existing accounts are preserved; the environment setting only applies to initial account creation.

```powershell
$env:PORT = '3000'
$env:ONGC_ADMIN_PASSWORD = 'your-initial-password'
npm start
```

## Data

- Diesel, maintenance, and well-site changes are saved atomically in `data/operations_store.json`.
- Crew and jobs are saved in `data/ot_fde_store.json`; an empty job list is preserved.
- Users and approvals are saved in their existing JSON stores.
- `ONGC_DATA_DIR` selects a separate directory for the JSON stores, useful for isolated testing. Source workbooks remain in the configured import locations.
- Default diesel and well-site imports currently use the original local Excel paths in `server.js`. The portal also supports workbook upload; maintenance has a bundled workbook fallback.
- Jobs retain their allocated OT rate when pay changes. Legacy jobs without allocations capture the configured rate on their first startup after this update; older rates cannot be reconstructed from data that never recorded them.
- Sessions are kept in server memory. Restarting the server requires signing in again.

## Checks

```powershell
npm test
```

Tests use disposable stores and verify authentication, admin permissions, selected employee exports, persistence across restart, password migration, overtime boundaries, and historical rates.

The UI includes responsive forms, module grids, table scrolling, dialogs, phone navigation, and an adaptive admin panel. Final visual verification at multiple device widths is still pending because browser approval review reached the account usage limit.
