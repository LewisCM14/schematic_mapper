import {
	Alert,
	Box,
	Chip,
	CircularProgress,
	List,
	Tooltip,
	Typography,
} from "@mui/material";
import { useEffect, useRef, useState } from "react";
import { useSearch } from "../../services/api/hooks/useSearch";
import SearchInput from "../atoms/SearchInput";
import SearchResultItemComponent from "../molecules/SearchResultItem";

const AVAILABLE_SOURCES = ["internal", "asset"] as const;

interface SearchResultsPanelProps {
	imageId: string;
	onSelectFp: (fittingPositionId: string, x: number, y: number) => void;
	onSearchMetadata?: (
		sourceStatus: Record<string, string>,
		requestId: string,
		refreshedAt: Date,
	) => void;
}

function SearchResultsPanel({
	imageId,
	onSelectFp,
	onSearchMetadata,
}: SearchResultsPanelProps) {
	const [query, setQuery] = useState("");
	const [activeSources, setActiveSources] = useState<string[]>([
		...AVAILABLE_SOURCES,
	]);
	const sentinelRef = useRef<HTMLDivElement | null>(null);

	const toggleSource = (source: string) => {
		setActiveSources((prev) =>
			prev.includes(source)
				? prev.filter((s) => s !== source)
				: [...prev, source],
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
				{AVAILABLE_SOURCES.map((source) => (
					<Chip
						key={source}
						label={source}
						size="small"
						variant={activeSources.includes(source) ? "filled" : "outlined"}
						color={activeSources.includes(source) ? "primary" : "default"}
						onClick={() => toggleSource(source)}
						aria-pressed={activeSources.includes(source)}
					/>
				))}
				<Tooltip title="Sensor source is unavailable in the prototype">
					<span>
						<Chip label="sensor" size="small" variant="outlined" disabled />
					</span>
				</Tooltip>
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
