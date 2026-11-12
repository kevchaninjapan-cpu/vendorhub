/**
 * RETIRED - do not use.
 *
 * This script built the `suburbs` table by grouping DVR `situation_name`
 * values, which are STREET addresses, and labelled every row "Auckland".
 * That produced defect 7: 7,460 street names posing as suburbs.
 *
 * Suburbs now come from the LINZ "NZ Suburbs and Localities" layer, loaded
 * by the 20261014_linz_suburbs_* migrations. The old script is kept in
 * .patch-backups if you ever need to look at it.
 */

console.error(
  "seed-suburbs.ts is retired. Suburbs come from the LINZ suburbs layer - see supabase/migrations/20261014_linz_suburbs_*.sql"
);
process.exit(1);