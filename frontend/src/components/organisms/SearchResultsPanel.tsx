import { Alert, Box, CircularProgress, List, Typography } from "@mui/material";
import { useEffect, useRef, useState } from "react";
import { useSearch } from "../../services/api/hooks/useSearch";
import SearchInput from "../atoms/SearchInput";
import SearchResultItemComponent from "../molecules/SearchResultItem";
import SourceFilterChips from "../molecules/SourceFilterChips";

const AVAILABLE_SOURCES = ["internal", "asset"] as const;

interface SearchResultsPanelProps {
	imageId: string;
	onSelectFp: (fittingPositionId: string, x: number, y: number) => void;
	query?: string;
	onQueryChange?: (value: string) => void;
	activeSources?: string[];
	onActiveSourcesChange?: (value: string[]) => void;
	onSearchMetadata?: (
		sourceStatus: Record<string, string>,
		requestId: string,
		refreshedAt: Date,
	) => void;
}

function SearchResultsPanel({
	imageId,
	onSelectFp,
	query: controlledQuery,
	onQueryChange,
	activeSources: controlledSources,
	onActiveSourcesChange,
	onSearchMetadata,
}: SearchResultsPanelProps) {
	const [internalQuery, setInternalQuery] = useState("");
	const [internalActiveSources, setInternalActiveSources] = useState<string[]>([
		...AVAILABLE_SOURCES,
	]);
	const query = controlledQuery ?? internalQuery;
	const setQuery = onQueryChange ?? setInternalQuery;
	const activeSources = controlledSources ?? internalActiveSources;
	const setActiveSources = onActiveSourcesChange ?? setInternalActiveSources;
	const sentinelRef = useRef<HTMLDivElement | null>(null);

	const toggleSource = (source: string) => {
		setActiveSources(
			activeSources.includes(source)
				? activeSources.filter((s) => s !== source)
				: [...activeSources, source],
		);
	};

	const {
		data,
		isLoading,
		isFetchingNextPage,
		hasNextPage,
		fetchNextPage,
		isError,
	} = useSearch(imageId, query, activeSources);

	// Infinite scroll: observe sentinel element
	useEffect(() => {
		const el = sentinelRef.current;
		if (!el || !hasNextPage) return;
		const observer = new IntersectionObserver(
			([entry]) => {
				if (entry.isIntersecting && !isFetchingNextPage) {
					fetchNextPage();
				}
			},
			{ threshold: 0.1 },
		);
		observer.observe(el);
		return () => observer.disconnect();
	}, [hasNextPage, isFetchingNextPage, fetchNextPage]);

	useEffect(() => {
		if (!data || !onSearchMetadata) return;
		const lastPage = data.pages[data.pages.length - 1];
		if (!lastPage) return;
		onSearchMetadata(lastPage.source_status, lastPage.request_id, new Date());
	}, [data, onSearchMetadata]);

	const allResults = data?.pages.flatMap((p) => p.results) ?? [];
	const isDegraded = data?.pages[0]?.source_status.asset === "degraded";

	return (
		<Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
			<Box sx={{ p: 1.5 }}>
				<SearchInput
					value={query}
					onChange={setQuery}
					label="Search fitting positions"
					onClear={() => setQuery("")}
				/>
			</Box>

			<Box sx={{ display: "flex", gap: 0.5, px: 1.5, pb: 1 }}>
				<SourceFilterChips
					availableSources={[...AVAILABLE_SOURCES]}
					selectedSources={activeSources}
					onToggle={toggleSource}
					disabledSources={["sensor"]}
				/>
			</Box>

			{isDegraded && (
				<Alert severity="warning" sx={{ mx: 1.5, mb: 1 }}>
					Asset source unavailable — results may be incomplete.
				</Alert>
			)}

			{isError && (
				<Alert severity="error" sx={{ mx: 1.5, mb: 1 }}>
					Search failed.
				</Alert>
			)}

			{query.length > 0 && query.length < 2 && (
				<Typography
					variant="caption"
					color="text.secondary"
					sx={{ px: 2, py: 1 }}
				>
					Enter at least 2 characters to search.
				</Typography>
			)}

			{isLoading && query.length >= 2 && (
				<Box sx={{ display: "flex", justifyContent: "center", mt: 2 }}>
					<CircularProgress size={24} />
				</Box>
			)}

			{!isLoading &&
				query.length >= 2 &&
				allResults.length === 0 &&
				!isError && (
					<Typography
						variant="body2"
						color="text.secondary"
						sx={{ px: 2, py: 1 }}
					>
						No results found.
					</Typography>
				)}

			<Box sx={{ overflow: "auto", flexGrow: 1 }}>
				<List dense disablePadding>
					{allResults.map((item) => (
						<SearchResultItemComponent
							key={item.fitting_position_id}
							result={item}
							onSelect={(r) =>
								onSelectFp(
									r.fitting_position_id,
									r.x_coordinate,
									r.y_coordinate,
								)
							}
						/>
					))}
				</List>

				{/* Sentinel for infinite scroll */}
				<div ref={sentinelRef} />

				{isFetchingNextPage && (
					<Box sx={{ display: "flex", justifyContent: "center", py: 1 }}>
						<CircularProgress size={20} />
					</Box>
				)}
			</Box>
		</Box>
	);
}

export default SearchResultsPanel;
