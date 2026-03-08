import PlaceIcon from "@mui/icons-material/Place";
import {
	Box,
	CircularProgress,
	Container,
	IconButton,
	Tooltip,
	Typography,
} from "@mui/material";
import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useFittingPositions } from "../services/api/hooks/useFittingPositions";
import { useImage } from "../services/api/hooks/useImages";

function ImageViewerPage() {
	const { imageId } = useParams<{ imageId: string }>();
	const navigate = useNavigate();

	const { data: image, isLoading, isError } = useImage(imageId ?? "");
	const { data: positions } = useFittingPositions(imageId ?? "");

	useEffect(() => {
		if (!imageId) {
			navigate("/", { replace: true });
		}
	}, [imageId, navigate]);

	if (!imageId) return null;

	return (
		<Container maxWidth="xl" sx={{ mt: 4 }}>
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
					{positions?.map((pos) => (
						<Tooltip key={pos.fitting_position_id} title={pos.label_text} arrow>
							<IconButton
								size="small"
								sx={{
									position: "absolute",
									left: pos.x_coordinate,
									top: pos.y_coordinate,
									transform: "translate(-50%, -100%)",
									color: "primary.main",
									padding: 0,
									"&:hover": { color: "primary.dark" },
								}}
								aria-label={pos.label_text}
							>
								<PlaceIcon fontSize="medium" />
							</IconButton>
						</Tooltip>
					))}
				</Box>
			)}
		</Container>
	);
}

export default ImageViewerPage;
