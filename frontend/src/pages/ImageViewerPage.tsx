import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import PlaceIcon from "@mui/icons-material/Place";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import {
	Alert,
	Box,
	CircularProgress,
	Divider,
	Drawer,
	IconButton,
	Tab,
	Tabs,
	Tooltip,
	Typography,
} from "@mui/material";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useFittingPositionDetails } from "../services/api/hooks/useFittingPositionDetails";
import { useFittingPositions } from "../services/api/hooks/useFittingPositions";
import { useImage } from "../services/api/hooks/useImages";

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

function ImageViewerPage() {
	const { imageId } = useParams<{ imageId: string }>();
	const navigate = useNavigate();

	const [selectedFpId, setSelectedFpId] = useState<string | null>(null);
	const [activeTab, setActiveTab] = useState(0);

	const { data: image, isLoading, isError } = useImage(imageId ?? "");
	const { data: positions } = useFittingPositions(imageId ?? "");

	useEffect(() => {
		if (!imageId) {
			navigate("/", { replace: true });
		}
	}, [imageId, navigate]);

	if (!imageId) return null;

	const handleMarkerClick = (fittingPositionId: string) => {
		setSelectedFpId(fittingPositionId);
		setActiveTab(0);
	};

	return (
		<Box sx={{ display: "flex", height: "100vh", overflow: "hidden" }}>
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
					</Tabs>
				</Box>
				{activeTab === 0 && <InfoPanel fittingPositionId={selectedFpId} />}
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
					<Typography color="error">Failed to load schematic image.</Typography>
				)}

				{image && (
					<Box
						sx={{
							position: "relative",
							display: "inline-block",
							border: "1px solid",
							borderColor: "divider",
							borderRadius: 1,
							overflow: "hidden",
						}}
					>
						{/* SVG schematic */}
						<Box
							component="img"
							src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(image.image_svg)}`}
							alt={image.component_name}
							sx={{ display: "block" }}
						/>

						{/* POI marker pins */}
						{positions?.map((pos) => {
							const isSelected = pos.fitting_position_id === selectedFpId;
							return (
								<Tooltip
									key={pos.fitting_position_id}
									title={pos.label_text}
									arrow
								>
									<IconButton
										size="small"
										onClick={() => handleMarkerClick(pos.fitting_position_id)}
										sx={{
											position: "absolute",
											left: pos.x_coordinate,
											top: pos.y_coordinate,
											transform: "translate(-50%, -100%)",
											color: isSelected ? "error.main" : "primary.main",
											padding: 0,
											"&:hover": { color: "primary.dark" },
										}}
										aria-label={pos.label_text}
									>
										<PlaceIcon fontSize="medium" />
									</IconButton>
								</Tooltip>
							);
						})}
					</Box>
				)}
			</Box>
		</Box>
	);
}

export default ImageViewerPage;
