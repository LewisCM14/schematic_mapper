import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import SearchOutlinedIcon from "@mui/icons-material/SearchOutlined";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import {
	Alert,
	Box,
	CircularProgress,
	Divider,
	Drawer,
	List,
	Tab,
	Tabs,
	TextField,
	Tooltip,
	Typography,
} from "@mui/material";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import SearchResultItemComponent from "../components/molecules/SearchResultItem";
import type { CanvasMarker } from "../components/organisms/DiagramCanvasViewport";
import DiagramCanvasViewport from "../components/organisms/DiagramCanvasViewport";
import POITooltipCard from "../components/POITooltipCard";
import TopAppHeader from "../components/TopAppHeader";
import ViewerFooterStatusBar from "../components/ViewerFooterStatusBar";
import { useFittingPositionDetails } from "../services/api/hooks/useFittingPositionDetails";
import { useFittingPositions } from "../services/api/hooks/useFittingPositions";
import { useImage } from "../services/api/hooks/useImages";
import { useSearch } from "../services/api/hooks/useSearch";

const DRAWER_WIDTH = 320;

function InfoPanel({
	fittingPositionId,
}: {
	fittingPositionId: string | null;
}) {
	const { data, isLoading, isError } =
		useFittingPositionDetails(fittingPositionId);

	if (!fittingPositionId) {
		return (
			<Box sx={{ p: 2 }}>
				<Typography variant="body2" color="text.secondary">
					Click a marker on the diagram to view details.
				</Typography>
			</Box>
		);
	}

	if (isLoading) {
		return (
			<Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
				<CircularProgress size={28} />
			</Box>
		);
	}

	if (isError || !data) {
		return (
			<Box sx={{ p: 2 }}>
				<Alert severity="error">Failed to load fitting position details.</Alert>
			</Box>
		);
	}

	const isDegraded = data.source_status.asset === "degraded";

	return (
		<Box sx={{ p: 2 }}>
			<Typography variant="subtitle2" gutterBottom>
				{data.label_text}
			</Typography>
			<Typography
				variant="caption"
				color="text.secondary"
				display="block"
				sx={{ mb: 2 }}
			>
				({data.x_coordinate}, {data.y_coordinate})
			</Typography>

			{isDegraded && (
				<Alert
					severity="warning"
					icon={<WarningAmberIcon fontSize="small" />}
					sx={{ mb: 2 }}
				>
					Asset source unavailable — partial data shown.
				</Alert>
			)}

			{data.asset ? (
				<>
					<Typography variant="overline" color="text.secondary">
						Asset Information
					</Typography>
					<Divider sx={{ mb: 1 }} />
					<Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
						<Box>
							<Typography variant="caption" color="text.secondary">
								Record ID
							</Typography>
							<Typography variant="body2">
								{data.asset.asset_record_id}
							</Typography>
						</Box>
						<Box>
							<Typography variant="caption" color="text.secondary">
								High-Level Component
							</Typography>
							<Typography variant="body2">
								{data.asset.high_level_component}
							</Typography>
						</Box>
						<Box>
							<Typography variant="caption" color="text.secondary">
								Sub-System
							</Typography>
							<Typography variant="body2">
								{data.asset.sub_system_name}
							</Typography>
						</Box>
						<Box>
							<Typography variant="caption" color="text.secondary">
								Sub-Component
							</Typography>
							<Typography variant="body2">
								{data.asset.sub_component_name}
							</Typography>
						</Box>
					</Box>
				</>
			) : (
				<Typography variant="body2" color="text.secondary">
					{isDegraded
						? "Asset data could not be retrieved."
						: "No asset record linked to this fitting position."}
				</Typography>
			)}
		</Box>
	);
}

function SearchPanel({
	imageId,
	onSelectFp,
	onSearchMetadata,
}: {
	imageId: string;
	onSelectFp: (fittingPositionId: string, x: number, y: number) => void;
	onSearchMetadata?: (
		sourceStatus: Record<string, string>,
		requestId: string,
		refreshedAt: Date,
	) => void;
}) {
	const [query, setQuery] = useState("");
	const sentinelRef = useRef<HTMLDivElement | null>(null);

	const {
		data,
		isLoading,
		isFetchingNextPage,
		hasNextPage,
		fetchNextPage,
		isError,
	} = useSearch(imageId, query);

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
				<TextField
					fullWidth
					size="small"
					label="Search fitting positions"
					value={query}
					onChange={(e) => setQuery(e.target.value)}
					inputProps={{ "aria-label": "search query" }}
				/>
			</Box>

			{isDegraded && (
				<Alert
					severity="warning"
					icon={<WarningAmberIcon fontSize="small" />}
					sx={{ mx: 1.5, mb: 1 }}
				>
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

function ImageViewerPage() {
	const { imageId } = useParams<{ imageId: string }>();
	const navigate = useNavigate();

	const [selectedFpId, setSelectedFpId] = useState<string | null>(null);
	const [activeTab, setActiveTab] = useState(0);
	const [zoomLevel, setZoomLevel] = useState(1);
	const [sourceStatus, setSourceStatus] = useState<Record<string, string>>({});
	const [requestId, setRequestId] = useState<string | null>(null);
	const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
	const [panToTarget, setPanToTarget] = useState<{
		x: number;
		y: number;
	} | null>(null);

	const { data: image, isLoading, isError } = useImage(imageId ?? "");
	const { data: positions } = useFittingPositions(imageId ?? "");

	const handleMarkerClick = useCallback((fittingPositionId: string) => {
		setSelectedFpId(fittingPositionId);
		setActiveTab(0);
	}, []);

	const handleSearchMetadata = useCallback(
		(status: Record<string, string>, reqId: string, refreshedAt: Date) => {
			setSourceStatus(status);
			setRequestId(reqId);
			setLastRefreshed(refreshedAt);
		},
		[],
	);

	// Build markers for DiagramCanvasViewport
	const canvasMarkers: CanvasMarker[] =
		positions?.map((pos) => ({
			id: pos.fitting_position_id,
			x: pos.x_coordinate,
			y: pos.y_coordinate,
			status: "mapped" as const,
		})) ?? [];

	// Tooltip wrapper for markers in the viewer
	const renderMarkerTooltip = useCallback(
		(markerId: string, children: React.ReactElement) => {
			const pos = positions?.find((p) => p.fitting_position_id === markerId);
			return (
				<Tooltip
					key={markerId}
					title={
						<POITooltipCard
							labelText={pos?.label_text ?? markerId}
							componentName={image?.component_name ?? ""}
							fittingPositionId={markerId}
						/>
					}
					placement="top"
					enterDelay={300}
					arrow
				>
					{children}
				</Tooltip>
			);
		},
		[positions, image],
	);

	useEffect(() => {
		if (!imageId) {
			navigate("/", { replace: true });
		}
	}, [imageId, navigate]);

	if (!imageId) return null;

	return (
		<Box sx={{ display: "flex", flexDirection: "column", height: "100vh" }}>
			<TopAppHeader
				title="Schematic Mapper"
				contextLabel={
					image
						? `${image.component_name} — ${image.drawing_type.type_name}`
						: undefined
				}
			/>
			<Box
				sx={{ display: "flex", flexGrow: 1, overflow: "hidden", minHeight: 0 }}
			>
				{/* LHS Drawer */}
				<Drawer
					variant="permanent"
					sx={{
						width: DRAWER_WIDTH,
						flexShrink: 0,
						"& .MuiDrawer-paper": {
							width: DRAWER_WIDTH,
							boxSizing: "border-box",
							top: 0,
							position: "relative",
							height: "100%",
						},
					}}
				>
					<Box sx={{ borderBottom: 1, borderColor: "divider" }}>
						<Tabs
							value={activeTab}
							onChange={(_e, v: number) => setActiveTab(v)}
							variant="fullWidth"
						>
							<Tab
								icon={<InfoOutlinedIcon fontSize="small" />}
								iconPosition="start"
								label="Information"
								aria-label="information tab"
							/>
							<Tab
								icon={<SearchOutlinedIcon fontSize="small" />}
								iconPosition="start"
								label="Search"
								aria-label="search tab"
							/>
						</Tabs>
					</Box>
					{activeTab === 0 && <InfoPanel fittingPositionId={selectedFpId} />}
					{activeTab === 1 && (
						<SearchPanel
							imageId={imageId}
							onSelectFp={(fpId, x, y) => {
								setSelectedFpId(fpId);
								setActiveTab(0);
								setPanToTarget({ x, y });
							}}
							onSearchMetadata={handleSearchMetadata}
						/>
					)}
				</Drawer>

				{/* Main canvas area */}
				<Box component="main" sx={{ flexGrow: 1, overflow: "auto", p: 3 }}>
					<Box sx={{ mb: 2 }}>
						<Typography variant="h5">
							{image ? image.component_name : "Image Viewer"}
						</Typography>
						{image && (
							<Typography variant="body2" color="text.secondary">
								{image.drawing_type.type_name} — {image.width_px} ×{" "}
								{image.height_px} px
							</Typography>
						)}
					</Box>

					{isLoading && (
						<Box sx={{ display: "flex", justifyContent: "center", mt: 8 }}>
							<CircularProgress />
						</Box>
					)}

					{isError && (
						<Typography color="error">
							Failed to load schematic image.
						</Typography>
					)}

					{image && (
						<DiagramCanvasViewport
							imageSvgUrl={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(image.image_svg)}`}
							markers={canvasMarkers}
							onMarkerClick={handleMarkerClick}
							onZoomChange={setZoomLevel}
							panToTarget={panToTarget}
							selectedMarkerId={selectedFpId}
							renderMarkerWrapper={renderMarkerTooltip}
						/>
					)}
				</Box>
			</Box>
			<ViewerFooterStatusBar
				sourceStatus={sourceStatus}
				requestId={requestId}
				lastRefreshed={lastRefreshed}
				zoomLevel={zoomLevel}
			/>
		</Box>
	);
}

export default ImageViewerPage;
