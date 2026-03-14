/**
 * config.ts
 *
 * Centralized query-cache and operational constants for the Schematic Mapper frontend API layer.
 *
 * - Defines React Query cache policies (staleTime, gcTime) for each resource type.
 * - Contains operational constants for search, pagination, and upload chunking.
 * - All values are tuned for optimal UX and backend efficiency.
 *
 * Update this file to adjust cache durations, search defaults, or upload chunking.
 */

// ── React Query cache policies ───────────────────────────────────────────────
// ── Operational constants ────────────────────────────────────────────────────

/** Drawing types rarely change — cache aggressively. */
export const STALE_TIME_DRAWING_TYPES = 30 * 60 * 1000; // 30 min
export const GC_TIME_DRAWING_TYPES = 60 * 60 * 1000; // 60 min

/** Image list / detail. */
export const STALE_TIME_IMAGE_LIST = 5 * 60 * 1000; // 5 min
export const GC_TIME_IMAGE_LIST = 30 * 60 * 1000; // 30 min
export const STALE_TIME_IMAGE_DETAIL = 15 * 60 * 1000; // 15 min
export const GC_TIME_IMAGE_DETAIL = 60 * 60 * 1000; // 60 min

/** Fitting positions. */
export const STALE_TIME_FITTING_POSITIONS = 5 * 60 * 1000; // 5 min
export const GC_TIME_FITTING_POSITIONS = 30 * 60 * 1000; // 30 min

/** Fitting position detail (live enrichment). */
export const STALE_TIME_FP_DETAIL = 60 * 1000; // 60 s
export const GC_TIME_FP_DETAIL = 15 * 60 * 1000; // 15 min

/** Search results — short-lived. */
export const STALE_TIME_SEARCH = 30 * 1000; // 30 s
export const GC_TIME_SEARCH = 10 * 60 * 1000; // 10 min

// ── Operational constants ────────────────────────────────────────────────────

/** Search query minimum length before dispatching a request. */
export const SEARCH_MIN_QUERY_LENGTH = 2;

/** Default page size for search endpoint. */
export const SEARCH_DEFAULT_LIMIT = 25;

/** Chunk size for resumable uploads (bytes). */
export const UPLOAD_CHUNK_SIZE = 64 * 1024; // 64 KB
