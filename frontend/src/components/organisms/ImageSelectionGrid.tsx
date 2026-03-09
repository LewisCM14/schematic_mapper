import { Button, Grid } from "@mui/material";
import type { Image } from "../../services/api/schemas";
import ImageTileCard from "../molecules/ImageTileCard";

interface ImageSelectionGridProps {
	images: Image[];
	onImageClick: (imageId: string) => void;
	hasNextPage?: boolean;
	isFetchingNextPage?: boolean;
	onLoadMore?: () => void;
}

function ImageSelectionGrid({
	images,
	onImageClick,
	hasNextPage,
	isFetchingNextPage,
	onLoadMore,
}: ImageSelectionGridProps) {
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
