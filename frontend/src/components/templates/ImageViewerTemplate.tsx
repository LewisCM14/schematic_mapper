/**
 * ImageViewerTemplate.tsx
 *
 * Provides a layout template for the image viewer, including header, left drawer, canvas, and footer status bar.
 *
 * - Renders the top app header, left drawer for search/details, main canvas, and footer status bar.
 * - Handles loading, error, and content display states.
 * - Used for viewing and interacting with schematic images and fitting positions.
 */
import { Box, CircularProgress, Typography } from "@mui/material";
import type { ReactNode } from "react";
import type {
	CanvasMarker,
	CanvasRectangle,
} from "../organisms/DiagramCanvasViewport";
import DiagramCanvasViewport from "../organisms/DiagramCanvasViewport";
import TopAppHeader from "../organisms/TopAppHeader";
import ViewerFooterStatusBar from "../organisms/ViewerFooterStatusBar";
import ViewerLeftDrawer from "../organisms/ViewerLeftDrawer";

interface ImageViewerTemplateProps {
	title: string;
	contextLabel?: string;
	onBack?: () => void;
	drawerWidth: number;
	imageId: string;
	selectedFpId: string | null;
	onSelectFp: (fpId: string, x: number, y: number) => void;
	searchQuery?: string;
	onSearchQueryChange?: (value: string) => void;
	activeSources?: string[];
	onActiveSourcesChange?: (value: string[]) => void;
	onSearchMetadata?: (
		sourceStatus: Record<string, string>,
		requestId: string,
		refreshedAt: Date,
	) => void;
	activeTab: number;
	onTabChange: (tab: number) => void;
	heading: string;
	subheading?: string;
	isLoading: boolean;
	isError: boolean;
	imageSvgUrl?: string;
	markers: CanvasMarker[];
	rectangles?: CanvasRectangle[];
	pinnedTooltipId?: string | null;
	pinnedTooltipContent?: ReactNode;
	requestedZoomScale?: number | null;
	onMarkerClick: (id: string) => void;
	onZoomChange: (zoom: number) => void;
	panToTarget: { x: number; y: number } | null;
	selectedMarkerId: string | null;
	renderMarkerWrapper?: (
		markerId: string,
		children: React.ReactElement,
	) => ReactNode;
	sourceStatus: Record<string, string>;
	requestId: string | null;
	lastRefreshed: Date | null;
	zoomLevel: number;
}

/**
 * Renders the image viewer template with header, left drawer, canvas, and footer status bar.
 * Handles loading, error, and content display states.
 *
 * @param title The page title
 * @param contextLabel Optional context label for the header
 * @param onBack Optional handler for back navigation
 * @param drawerWidth Width of the left drawer
 * @param imageId The ID of the image being viewed
 * @param selectedFpId The currently selected fitting position ID
 * @param onSelectFp Handler for selecting a fitting position
 * @param searchQuery Controlled search query (optional)
 * @param onSearchQueryChange Handler for search query changes (optional)
 * @param activeSources Controlled list of active sources (optional)
 * @param onActiveSourcesChange Handler for source filter changes (optional)
 * @param onSearchMetadata Handler for search metadata updates (optional)
 * @param activeTab Index of the active tab
 * @param onTabChange Handler for tab changes
 * @param heading Main heading text
 * @param subheading Optional subheading text
 * @param isLoading Whether the image is loading
 * @param isError Whether there was an error loading the image
 * @param imageSvgUrl URL of the SVG image to display (optional)
 * @param markers Array of marker objects to render
 * @param rectangles Array of rectangles to render (optional)
 * @param pinnedTooltipId ID of the marker/rectangle to show a pinned tooltip for (optional)
 * @param pinnedTooltipContent Content to display in the pinned tooltip (optional)
 * @param requestedZoomScale Programmatically requested zoom scale (optional)
 * @param onMarkerClick Handler for marker click events
 * @param onZoomChange Handler for zoom scale changes
 * @param panToTarget Coordinates to pan to (optional)
 * @param selectedMarkerId ID of the currently selected marker (optional)
 * @param renderMarkerWrapper Function to wrap marker buttons (optional)
 * @param sourceStatus Record of source statuses (ok, degraded, error)
 * @param requestId The current request ID (or null)
 * @param lastRefreshed The last refreshed time (or null)
 * @param zoomLevel The current zoom level
 */
function ImageViewerTemplate({
	title,
	contextLabel,
	onBack,
	drawerWidth,
	imageId,
	selectedFpId,
	onSelectFp,
	searchQuery,
	onSearchQueryChange,
	activeSources,
	onActiveSourcesChange,
	onSearchMetadata,
	activeTab,
	onTabChange,
	heading,
	subheading,
	isLoading,
	isError,
	imageSvgUrl,
	markers,
	rectangles = [],
	pinnedTooltipId = null,
	pinnedTooltipContent,
	requestedZoomScale = null,
	onMarkerClick,
	onZoomChange,
	panToTarget,
	selectedMarkerId,
	renderMarkerWrapper,
	sourceStatus,
	requestId,
	lastRefreshed,
	zoomLevel,
}: ImageViewerTemplateProps) {
	return (
		<Box sx={{ display: "flex", flexDirection: "column", height: "100vh" }}>
			<TopAppHeader
				title={title}
				contextLabel={contextLabel}
				onBack={onBack}
				sourceStatus={
					Object.keys(sourceStatus).length > 0 ? sourceStatus : undefined
				}
			/>
			<Box
				sx={{ display: "flex", flexGrow: 1, overflow: "hidden", minHeight: 0 }}
			>
				<ViewerLeftDrawer
					width={drawerWidth}
					imageId={imageId}
					selectedFpId={selectedFpId}
					onSelectFp={onSelectFp}
					searchQuery={searchQuery}
					onSearchQueryChange={onSearchQueryChange}
					activeSources={activeSources}
					onActiveSourcesChange={onActiveSourcesChange}
					onSearchMetadata={onSearchMetadata}
					activeTab={activeTab}
					onTabChange={onTabChange}
				/>

				<Box component="main" sx={{ flexGrow: 1, overflow: "auto", p: 3 }}>
					<Box sx={{ mb: 2 }}>
						<Typography variant="h5">{heading}</Typography>
						{subheading && (
							<Typography variant="body2" color="text.secondary">
								{subheading}
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

					{imageSvgUrl && (
						<DiagramCanvasViewport
							imageSvgUrl={imageSvgUrl}
							markers={markers}
							rectangles={rectangles}
							showMappedRectangles={false}
							interactiveMappedRectangles
							pinnedTooltipId={pinnedTooltipId}
							pinnedTooltipContent={pinnedTooltipContent}
							requestedZoomScale={requestedZoomScale}
							onMarkerClick={onMarkerClick}
							onZoomChange={onZoomChange}
							panToTarget={panToTarget}
							selectedMarkerId={selectedMarkerId}
							renderMarkerWrapper={renderMarkerWrapper}
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

export default ImageViewerTemplate;
