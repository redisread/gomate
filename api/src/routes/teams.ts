/**
 * Teams Routes - Compatibility Layer
 *
 * This file re-exports from the modular teams structure for backward compatibility.
 * All implementations have been moved to api/src/routes/teams/ directory.
 *
 * New structure:
 * - index.ts      # Router composition
 * - queries.ts    # GET endpoints
 * - mutations.ts  # POST/PUT/DELETE endpoints
 * - membership.ts # Member lifecycle routes
 * - status.ts     # Status transition routes
 * - utils.ts      # Shared utilities
 *
 * Following Cursor thermo-nuclear-code-quality-review principle:
 * Original file was 1315 lines, split into modules <600 lines each.
 */

export { default } from "./teams/index";
export { teamsRoute } from "./teams/index";
