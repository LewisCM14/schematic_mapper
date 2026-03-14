/**
 * ImageViewerPage.tsx
 *
 * Displays the main viewer page for a schematic image, including search, navigation, and interactive canvas.
 *
 * - Handles URL state, marker/rectangle selection, zoom, and search/filter logic.
 * - Integrates with the viewer template, fitting position data, and navigation.
 * - Used as the main interactive viewer for schematic images and their mapped positions.
 */
import { Snackbar, Tooltip } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import POITooltipCard from "../components/molecules/POITooltipCard";
import type {
	CanvasMarker,
	CanvasRectangle,
} from "../components/organisms/DiagramCanvasViewport";
import ImageViewerTemplate from "../components/templates/ImageViewerTemplate";
import { useFittingPositions } from "../services/api/hooks/useFittingPositions";
import { useImage } from "../services/api/hooks/useImages";

const DRAWER_WIDTH = 320;
const UUID_RE =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DEFAULT_SEARCH_SOURCES = ["internal", "asset"] as const;

function normalizeSearchSources(value: string[] | string | null | undefined) {
	const values = Array.isArray(value)
		? value
		: typeof value === "string"
			? value.split(",")
			: [];
	const normalized = values.filter(
		(source): source is (typeof DEFAULT_SEARCH_SOURCES)[number] =>
			DEFAULT_SEARCH_SOURCES.includes(
				source as (typeof DEFAULT_SEARCH_SOURCES)[number],
			),
	);
	return normalized.length > 0 ? normalized : [...DEFAULT_SEARCH_SOURCES];
}

function formatZoomParam(value: number) {
	return value.toFixed(2).replace(/\.0+$|(?<=\.[0-9])0+$/g, "");
}

/**
 * Renders the schematic image viewer page with search, navigation, and interactive canvas.
 * Handles URL state, marker/rectangle selection, zoom, and search/filter logic.
 */
function ImageViewerPage() {
	const { imageId } = useParams<{ imageId: string }>();
	const navigate = useNavigate();
	const theme = useTheme();
	const [searchParams, setSearchParams] = useSearchParams();
	const isValidUuid = imageId != null && UUID_RE.test(imageId);
	const sharedFpId = searchParams.get("fp");
	const sharedSearchQuery = searchParams.get("q") ?? "";
	const sharedSearchSources = useMemo(
		() => normalizeSearchSources(searchParams.get("src")),
		[searchParams],
	);
	const sharedZoomLevel = useMemo(() => {
		const value = Number(searchParams.get("z"));
		return Number.isFinite(value) && value > 0 ? value : null;
	}, [searchParams]);

	const [selectedFpId, setSelectedFpId] = useState<string | null>(null);
	const [activeTab, setActiveTab] = useState(0);
	const [zoomLevel, setZoomLevel] = useState(sharedZoomLevel ?? 1);
	const [sourceStatus, setSourceStatus] = useState<Record<string, string>>({});
	const [requestId, setRequestId] = useState<string | null>(null);
	const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
	const [panToTarget, setPanToTarget] = useState<{
		x: number;
		y: number;
	} | null>(null);
	const [pinnedTooltipId, setPinnedTooltipId] = useState<string | null>(null);
	const lastUrlHandledPoiRef = useRef<string | null>(null);
	const requestedZoomAppliedRef = useRef(sharedZoomLevel == null);

	const {
		data: image,
		isLoading,
		isError,
	} = useImage(isValidUuid ? imageId : "");
	const { data: positions } = useFittingPositions(isValidUuid ? imageId : "");

	const updateViewerUrl = useCallback(
		(updates: {
			fp?: string | null;
			q?: string | null;
			src?: string[] | null;
			z?: number | null;
		}) => {
			setSearchParams(
				(prev) => {
					const nextParams = new URLSearchParams(prev);
					if ("fp" in updates) {
						if (updates.fp) {
							nextParams.set("fp", updates.fp);
						} else {
							nextParams.delete("fp");
						}
					}
					if ("q" in updates) {
						const nextQuery = updates.q?.trim() ?? "";
						if (nextQuery) {
							nextParams.set("q", nextQuery);
						} else {
							nextParams.delete("q");
						}
					}
					if ("src" in updates) {
						const normalizedSources = normalizeSearchSources(
							updates.src ?? null,
						);
						const isDefaultSourceSelection =
							normalizedSources.length === DEFAULT_SEARCH_SOURCES.length &&
							DEFAULT_SEARCH_SOURCES.every((source) =>
								normalizedSources.includes(source),
							);
						if (isDefaultSourceSelection) {
							nextParams.delete("src");
						} else {
							nextParams.set("src", normalizedSources.join(","));
						}
					}
					if ("z" in updates) {
						if (
							updates.z == null ||
							!Number.isFinite(updates.z) ||
							updates.z <= 0 ||
							Math.abs(updates.z - 1) < 0.01
						) {
							nextParams.delete("z");
						} else {
							nextParams.set("z", formatZoomParam(updates.z));
						}
					}
					return nextParams;
				},
				{ replace: true },
			);
		},
		[setSearchParams],
	);

	const handleMarkerClick = useCallback(
		(fittingPositionId: string) => {
			setSelectedFpId(fittingPositionId);
			setActiveTab(1);
			setPinnedTooltipId(null);
			lastUrlHandledPoiRef.current = fittingPositionId;
			updateViewerUrl({ fp: fittingPositionId });
		},
		[updateViewerUrl],
	);

	const handleSearchMetadata = useCallback(
		(status: Record<string, string>, reqId: string, refreshedAt: Date) => {
			setSourceStatus(status);
			setRequestId(reqId);
			setLastRefreshed(refreshedAt);
		},
		[],
	);

	const handleSelectFp = useCallback(
		(fpId: string, x: number, y: number) => {
			setSelectedFpId(fpId);
			setActiveTab(1);
			setPanToTarget({ x, y });
			setPinnedTooltipId(fpId);
			lastUrlHandledPoiRef.current = fpId;
			updateViewerUrl({ fp: fpId });
		},
		[updateViewerUrl],
	);

	const handleSearchQueryChange = useCallback(
		(value: string) => {
			updateViewerUrl({ q: value });
		},
		[updateViewerUrl],
	);

	const handleSearchSourcesChange = useCallback(
		(value: string[]) => {
			updateViewerUrl({ src: value });
		},
		[updateViewerUrl],
	);

	const handleZoomChange = useCallback(
		(value: number) => {
			if (sharedZoomLevel != null && !requestedZoomAppliedRef.current) {
				if (Math.abs(value - sharedZoomLevel) < 0.01) {
					requestedZoomAppliedRef.current = true;
				} else {
					return;
				}
			}
			setZoomLevel(value);
			updateViewerUrl({ z: value });
		},
		[sharedZoomLevel, updateViewerUrl],
	);

	useEffect(() => {
		requestedZoomAppliedRef.current = sharedZoomLevel == null;
		if (sharedZoomLevel != null) {
			setZoomLevel(sharedZoomLevel);
		}
	}, [sharedZoomLevel]);

	useEffect(() => {
		if (!sharedFpId) {
			lastUrlHandledPoiRef.current = null;
			setSelectedFpId(null);
			setPinnedTooltipId(null);
			setPanToTarget(null);
			return;
		}

		if (selectedFpId !== sharedFpId) {
			setSelectedFpId(sharedFpId);
			setActiveTab(1);
		}

		if (lastUrlHandledPoiRef.current === sharedFpId) {
			return;
		}

		const position = positions?.find(
			(item) => item.fitting_position_id === sharedFpId,
		);
		if (!position) {
			return;
		}

		setPanToTarget({
			x: position.x_coordinate,
			y: position.y_coordinate,
		});
		setPinnedTooltipId(sharedFpId);
		setActiveTab(1);
		lastUrlHandledPoiRef.current = sharedFpId;
	}, [positions, selectedFpId, sharedFpId]);

	// Build markers for DiagramCanvasViewport
	const canvasMarkers: CanvasMarker[] = useMemo(
		() =>
			positions
				?.filter((pos) => pos.width <= 0 || pos.height <= 0)
				.map((pos) => ({
					id: pos.fitting_position_id,
					x: pos.x_coordinate,
					y: pos.y_coordinate,
					status: "mapped" as const,
				})) ?? [],
		[positions],
	);

	const canvasRectangles: CanvasRectangle[] = useMemo(
		() =>
			positions
				?.filter((pos) => pos.width > 0 && pos.height > 0)
				.map((pos) => ({
					id: pos.fitting_position_id,
					x: pos.x_coordinate - pos.width / 2,
					y: pos.y_coordinate - pos.height / 2,
					width: pos.width,
					height: pos.height,
					status: "mapped" as const,
				})) ?? [],
		[positions],
	);

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
					placement="top-start"
					enterDelay={300}
					arrow
					slotProps={{
						tooltip: {
							sx: {
								bgcolor: "transparent",
								p: 0,
								m: 0,
								boxShadow: "none",
								maxWidth: "none",
							},
						},
						arrow: {
							sx: {
								color: theme.palette.background.paper,
								"&::before": {
									border: "1px solid",
									borderColor: theme.palette.divider,
									boxSizing: "border-box",
								},
							},
						},
					}}
				>
					{children}
				</Tooltip>
			);
		},
		[positions, image, theme],
	);

	const pinnedTooltipContent = useMemo(() => {
		if (!pinnedTooltipId) return null;
		const pos = positions?.find(
			(item) => item.fitting_position_id === pinnedTooltipId,
		);
		return (
			<POITooltipCard
				labelText={pos?.label_text ?? pinnedTooltipId}
				componentName={image?.component_name ?? ""}
				fittingPositionId={pinnedTooltipId}
				onClose={() => setPinnedTooltipId(null)}
			/>
		);
	}, [image, pinnedTooltipId, positions]);

	const [noticeOpen, setNoticeOpen] = useState(false);

	useEffect(() => {
		if (!imageId) {
			navigate("/", { replace: true });
		} else if (!isValidUuid) {
			setNoticeOpen(true);
			const timer = setTimeout(() => {
				navigate("/", { replace: true });
			}, 3000);
			return () => clearTimeout(timer);
		}
	}, [imageId, isValidUuid, navigate]);

	useEffect(() => {
		if (isError && imageId) {
			setNoticeOpen(true);
			const timer = setTimeout(() => {
				navigate("/", { replace: true });
			}, 3000);
			return () => clearTimeout(timer);
		}
	}, [isError, imageId, navigate]);

	if (!imageId) return null;

	return (
		<>
			<ImageViewerTemplate
				title="Schematic Mapper"
				contextLabel={
					image
						? `${image.component_name} — ${image.drawing_type.type_name}`
						: undefined
				}
				onBack={() => navigate("/")}
				drawerWidth={DRAWER_WIDTH}
				imageId={imageId}
				selectedFpId={selectedFpId}
				onSelectFp={handleSelectFp}
				searchQuery={sharedSearchQuery}
				onSearchQueryChange={handleSearchQueryChange}
				activeSources={sharedSearchSources}
				onActiveSourcesChange={handleSearchSourcesChange}
				onSearchMetadata={handleSearchMetadata}
				activeTab={activeTab}
				onTabChange={setActiveTab}
				heading={image ? image.component_name : "Image Viewer"}
				subheading={
					image
						? `${image.drawing_type.type_name} — ${image.width_px} × ${image.height_px} px`
						: undefined
				}
				isLoading={isLoading}
				isError={isError}
				imageSvgUrl={
					image
						? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(image.image_svg)}`
						: undefined
				}
				markers={canvasMarkers}
				rectangles={canvasRectangles}
				pinnedTooltipId={pinnedTooltipId}
				pinnedTooltipContent={pinnedTooltipContent}
				onMarkerClick={handleMarkerClick}
				requestedZoomScale={sharedZoomLevel}
				onZoomChange={handleZoomChange}
				panToTarget={panToTarget}
				selectedMarkerId={selectedFpId}
				renderMarkerWrapper={renderMarkerTooltip}
				sourceStatus={sourceStatus}
				requestId={requestId}
				lastRefreshed={lastRefreshed}
				zoomLevel={zoomLevel}
			/>
			<Snackbar
				open={noticeOpen}
				autoHideDuration={3000}
				message="Image not found — returning to selection"
				anchorOrigin={{ vertical: "top", horizontal: "center" }}
			/>
		</>
	);
}

export default ImageViewerPage;
