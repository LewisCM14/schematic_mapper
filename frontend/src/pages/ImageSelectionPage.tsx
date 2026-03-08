import {
	Box,
	Card,
	CardActionArea,
	CardContent,
	CircularProgress,
	Container,
	Grid,
	Typography,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useImages } from "../services/api/hooks/useImages";

function ImageSelectionPage() {
	const navigate = useNavigate();
	const { data: images, isLoading, isError } = useImages();

	return (
		<Container maxWidth="lg" sx={{ mt: 6 }}>
			<Typography variant="h4" gutterBottom>
				Schematic Mapper
			</Typography>
			<Typography variant="body1" color="text.secondary" gutterBottom>
				Select a schematic drawing to view
			</Typography>

			<Box sx={{ mt: 4 }}>
				{isLoading && (
					<Box sx={{ display: "flex", justifyContent: "center", mt: 8 }}>
						<CircularProgress />
					</Box>
				)}

				{isError && (
					<Typography color="error">
						Failed to load images. Please check the API is running.
					</Typography>
				)}

				{images && images.length === 0 && (
					<Typography color="text.secondary">
						No schematic drawings found. Run{" "}
						<code>python manage.py seed_phase3</code> to seed the database.
					</Typography>
				)}

				{images && images.length > 0 && (
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
	);
}

export default ImageSelectionPage;
