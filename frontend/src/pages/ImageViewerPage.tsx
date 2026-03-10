import { Snackbar, Tooltip } from "@mui/material";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import POITooltipCard from "../components/molecules/POITooltipCard";
import type { CanvasMarker } from "../components/organisms/DiagramCanvasViewport";
import ImageViewerTemplate from "../components/templates/ImageViewerTemplate";
import { useFittingPositions } from "../services/api/hooks/useFittingPositions";
import { useImage } from "../services/api/hooks/useImages";

const DRAWER_WIDTH = 320;
const UUID_RE =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function ImageViewerPage() {
	const { imageId } = useParams<{ imageId: string }>();
	const navigate = useNavigate();
	const isValidUuid = imageId != null && UUID_RE.test(imageId);

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

	const {
		data: image,
		isLoading,
		isError,
	} = useImage(isValidUuid ? imageId : "");
	const { data: positions } = useFittingPositions(isValidUuid ? imageId : "");

	const handleMarkerClick = useCallback((fittingPositionId: string) => {
		setSelectedFpId(fittingPositionId);
		setActiveTab(1);
	}, []);

	const handleSearchMetadata = useCallback(
		(status: Record<string, string>, reqId: string, refreshedAt: Date) => {
			setSourceStatus(status);
			setRequestId(reqId);
			setLastRefreshed(refreshedAt);
		},
		[],
	);

	const handleSelectFp = useCallback((fpId: string, x: number, y: number) => {
		setSelectedFpId(fpId);
		setActiveTab(1);
		setPanToTarget({ x, y });
	}, []);

	// Build markers for DiagramCanvasViewport
	const canvasMarkers: CanvasMarker[] = useMemo(
		() =>
			positions?.map((pos) => ({
				id: pos.fitting_position_id,
				x: pos.x_coordinate,
				y: pos.y_coordinate,
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
				drawerWidth={DRAWER_WIDTH}
				imageId={imageId}
				selectedFpId={selectedFpId}
				onSelectFp={handleSelectFp}
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
				onMarkerClick={handleMarkerClick}
				onZoomChange={setZoomLevel}
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
