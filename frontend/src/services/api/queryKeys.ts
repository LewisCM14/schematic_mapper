/**
 * queryKeys.ts
 *
 * Centralized definitions for all React Query cache keys used in the Schematic Mapper frontend.
 *
 * - Ensures consistent, type-safe cache keys for all API queries and mutations.
 * - Keys are grouped by resource (health, drawingTypes, images, fittingPositions, search).
 * - Use these keys in useQuery/useMutation hooks to avoid typos and enable cache sharing/invalidation.
 * - All keys are defined as const tuples for maximum type safety and auto-completion.
 *
 * Update this file whenever new API endpoints are added or cache structure changes.
 */
export const queryKeys = {
	// Health check endpoint
	health: ["health"] as const,

	// Drawing types (list)
	drawingTypes: ["drawing-types"] as const,

	// Image-related queries (list, detail, fitting positions)
	images: {
		all: ["images"] as const,
		list: (filters?: Record<string, unknown>) =>
			["images", "list", filters] as const,
		detail: (imageId: string) => ["images", imageId] as const,
		fittingPositions: (imageId: string) =>
			["images", imageId, "fitting-positions"] as const,
	},

	// Fitting position detail queries
	fittingPositions: {
		detail: (fittingPositionId: string) =>
			["fitting-positions", fittingPositionId, "details"] as const,
	},

	// Search queries (by image, query, sources, limit)
	search: (
		imageId: string,
		query: string,
		sources?: string[],
		limit?: number,
	) => ["search", imageId, query.trim().toLowerCase(), sources, limit] as const,
} as const;
