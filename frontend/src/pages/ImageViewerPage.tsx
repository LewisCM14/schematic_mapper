import { Container, Typography } from "@mui/material";
import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";

function ImageViewerPage() {
	const { imageId } = useParams<{ imageId: string }>();
	const navigate = useNavigate();

	useEffect(() => {
		if (!imageId) {
			navigate("/", { replace: true });
		}
	}, [imageId, navigate]);

	if (!imageId) return null;

	return (
		<Container maxWidth="xl" sx={{ mt: 4 }}>
			<Typography variant="h5">Image Viewer</Typography>
			<Typography variant="body2" color="text.secondary">
				Image ID: {imageId}
			</Typography>
		</Container>
	);
}

export default ImageViewerPage;
