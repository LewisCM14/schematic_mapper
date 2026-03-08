import {
	Box,
	Card,
	CardActionArea,
	CardContent,
	CircularProgress,
	Container,
	FormControl,
	Grid,
	InputLabel,
	MenuItem,
	Select,
	Typography,
} from "@mui/material";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import TopAppHeader from "../components/TopAppHeader";
import { useImages } from "../services/api/hooks/useImages";

function ImageSelectionPage() {
	const navigate = useNavigate();
	const [selectedTypeId, setSelectedTypeId] = useState<number | "">("");

	// Fetch all images unfiltered to derive available drawing types
	const { data: allImages, isLoading: typesLoading } = useImages();

	// Derive unique drawing types from the unfiltered list
	const drawingTypes = Array.from(
		new Map(
			(allImages ?? []).map((img) => [
				img.drawing_type.drawing_type_id,
				img.drawing_type,
			]),
		).values(),
	);

	// Fetch images filtered by selected drawing type
	const {
		data: filteredImages,
		isLoading: imagesLoading,
		isError,
	} = useImages(selectedTypeId !== "" ? selectedTypeId : undefined);

	// Only show tile grid after a type has been selected and data is ready
	const showGrid = selectedTypeId !== "";
	const images = showGrid ? (filteredImages ?? []) : [];
	const isLoading = typesLoading || (showGrid && imagesLoading);

	return (
		<>
			<TopAppHeader title="Schematic Mapper" />
			<Container maxWidth="lg" sx={{ mt: 3 }}>
			<Typography variant="body1" color="text.secondary" gutterBottom>
				Select a drawing type to browse available schematics.
			</Typography>

			<Box sx={{ mt: 3, maxWidth: 320 }}>
				<FormControl fullWidth size="small">
					<InputLabel id="drawing-type-label">Drawing Type</InputLabel>
					<Select
						labelId="drawing-type-label"
						label="Drawing Type"
						value={selectedTypeId}
						onChange={(e) => setSelectedTypeId(e.target.value as number | "")}
						inputProps={{ "aria-label": "drawing type" }}
					>
						{drawingTypes.map((dt) => (
							<MenuItem key={dt.drawing_type_id} value={dt.drawing_type_id}>
								{dt.type_name}
							</MenuItem>
						))}
					</Select>
				</FormControl>
			</Box>

			<Box sx={{ mt: 4 }}>
				{!showGrid && !typesLoading && (
					<Typography color="text.secondary">
						Select a drawing type above to view available schematics.
					</Typography>
				)}

				{isLoading && (
					<Box sx={{ display: "flex", justifyContent: "center", mt: 8 }}>
						<CircularProgress />
					</Box>
				)}

				{showGrid && isError && (
					<Typography color="error">
						Failed to load images. Please check the API is running.
					</Typography>
				)}

				{showGrid && !isLoading && images.length === 0 && !isError && (
					<Typography color="text.secondary">
						No schematic drawings found for this drawing type.
					</Typography>
				)}

				{showGrid && images.length > 0 && (
					<Grid container spacing={3}>
						{images.map((image) => (
							<Grid key={image.image_id} size={{ xs: 12, sm: 6, md: 4 }}>
								<Card>
									<CardActionArea
										onClick={() => navigate(`/viewer/${image.image_id}`)}
									>
										<CardContent>
											<Typography variant="h6" noWrap>
												{image.component_name}
											</Typography>
											<Typography
												variant="body2"
												color="text.secondary"
												sx={{ mt: 0.5 }}
											>
												{image.drawing_type.type_name}
											</Typography>
											<Typography
												variant="caption"
												color="text.disabled"
												sx={{ mt: 1, display: "block" }}
											>
												{image.width_px} × {image.height_px} px
											</Typography>
										</CardContent>
									</CardActionArea>
								</Card>
							</Grid>
						))}
					</Grid>
				)}
			</Box>
		</Container>
		</>
	);
}

export default ImageSelectionPage;
