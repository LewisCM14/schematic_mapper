import { Box, CircularProgress, Typography } from "@mui/material";
import type { ReactNode } from "react";
import type { CanvasMarker } from "../organisms/DiagramCanvasViewport";
import DiagramCanvasViewport from "../organisms/DiagramCanvasViewport";
import TopAppHeader from "../organisms/TopAppHeader";
import ViewerFooterStatusBar from "../organisms/ViewerFooterStatusBar";
import ViewerLeftDrawer from "../organisms/ViewerLeftDrawer";

interface ImageViewerTemplateProps {
	title: string;
	contextLabel?: string;
	drawerWidth: number;
	imageId: string;
	selectedFpId: string | null;
	onSelectFp: (fpId: string, x: number, y: number) => void;
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

function ImageViewerTemplate({
	title,
	contextLabel,
	drawerWidth,
	imageId,
	selectedFpId,
	onSelectFp,
	onSearchMetadata,
	activeTab,
	onTabChange,
	heading,
	subheading,
	isLoading,
	isError,
	imageSvgUrl,
	markers,
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
			<TopAppHeader title={title} contextLabel={contextLabel} />
			<Box
				sx={{ display: "flex", flexGrow: 1, overflow: "hidden", minHeight: 0 }}
			>
				<ViewerLeftDrawer
					width={drawerWidth}
					imageId={imageId}
					selectedFpId={selectedFpId}
					onSelectFp={onSelectFp}
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
