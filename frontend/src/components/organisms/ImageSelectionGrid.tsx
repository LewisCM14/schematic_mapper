/**
 * ImageSelectionGrid.tsx
 *
 * Displays a grid of image tiles for selection, with loading, error, and pagination states.
 *
 * - Shows images as cards in a responsive grid layout.
 * - Handles loading skeletons, error alerts, and empty states.
 * - Supports pagination with a "Load more" button.
 * - Used in image selection dialogs or panels.
 */
import { Alert, Button, Grid, Skeleton, Typography } from "@mui/material";
import type { Image } from "../../services/api/schemas";
import ImageTileCard from "../molecules/ImageTileCard";

interface ImageSelectionGridProps {
	images: Image[];
	onImageClick: (imageId: string) => void;
	hasNextPage?: boolean;
	isFetchingNextPage?: boolean;
	onLoadMore?: () => void;
	isLoading?: boolean;
	isError?: boolean;
	errorMessage?: string;
}

/**
 * Renders a grid of image tiles for selection, with loading, error, and pagination states.
 * @param images Array of images to display
 * @param onImageClick Handler for when an image is clicked
 * @param hasNextPage Whether there are more images to load (optional)
 * @param isFetchingNextPage Whether the next page is currently loading (optional)
 * @param onLoadMore Handler for loading more images (optional)
 * @param isLoading Whether images are currently loading (optional)
 * @param isError Whether there was an error loading images (optional)
 * @param errorMessage Error message to display (optional)
 */
function ImageSelectionGrid({
	images,
	onImageClick,
	hasNextPage,
	isFetchingNextPage,
	onLoadMore,
	isLoading,
	isError,
	errorMessage,
}: ImageSelectionGridProps) {
	if (isError) {
		return (
			<Alert severity="error">{errorMessage || "Failed to load images"}</Alert>
		);
	}

	if (isLoading && images.length === 0) {
		return (
			<Grid container spacing={3}>
				{[0, 1, 2].map((i) => (
					<Grid key={i} size={{ xs: 12, sm: 6, md: 4 }}>
						<Skeleton
							variant="rectangular"
							height={200}
							sx={{ borderRadius: 1 }}
						/>
					</Grid>
				))}
			</Grid>
		);
	}

	if (images.length === 0) {
		return (
			<Typography color="text.secondary">
				No images found for the selected filters.
			</Typography>
		);
	}

	return (
		<>
			<Grid container spacing={3}>
				{images.map((image) => (
					<Grid key={image.image_id} size={{ xs: 12, sm: 6, md: 4 }}>
						<ImageTileCard image={image} onClick={onImageClick} />
					</Grid>
				))}
			</Grid>

			{hasNextPage && onLoadMore && (
				<Button
					variant="outlined"
					onClick={onLoadMore}
					disabled={isFetchingNextPage}
					sx={{ display: "flex", mx: "auto", mt: 3 }}
				>
					{isFetchingNextPage ? "Loading…" : "Load more"}
				</Button>
			)}
		</>
	);
}

export default ImageSelectionGrid;
