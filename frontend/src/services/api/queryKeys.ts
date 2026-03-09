export const queryKeys = {
	health: ["health"] as const,

	drawingTypes: ["drawing-types"] as const,

	images: {
		all: ["images"] as const,
		list: (filters?: Record<string, unknown>) =>
			["images", "list", filters] as const,
		detail: (imageId: string) => ["images", imageId] as const,
		fittingPositions: (imageId: string) =>
			["images", imageId, "fitting-positions"] as const,
	},

	fittingPositions: {
		detail: (fittingPositionId: string) =>
			["fitting-positions", fittingPositionId, "details"] as const,
	},

	search: (
		imageId: string,
		query: string,
		sources?: string[],
		limit?: number,
	) => ["search", imageId, query.trim().toLowerCase(), sources, limit] as const,
} as const;
