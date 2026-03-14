/**
 * ImageTileCard.tsx
 *
 * Renders a clickable card for an image in a gallery or grid view in the Schematic Mapper frontend.
 *
 * - Shows thumbnail (or skeleton), component name, drawing type badge, and dimensions.
 * - Uses Material UI Card, CardMedia, and TypeBadge for consistent styling.
 * - Calls onClick with the image ID when selected.
 * - Used in image selection and admin pages.
 */
import {
	Box,
	Card,
	CardActionArea,
	CardContent,
	CardMedia,
	Skeleton,
	Typography,
} from "@mui/material";
import type { Image } from "../../services/api/schemas";
import TypeBadge from "../atoms/TypeBadge";

interface ImageTileCardProps {
	image: Image;
	onClick: (imageId: string) => void;
}

/**
 * Renders a clickable card for an image, showing thumbnail, name, type, and dimensions.
 * @param image The image object to display
 * @param onClick Handler called with imageId when the card is clicked
 */
function ImageTileCard({ image, onClick }: ImageTileCardProps) {
	return (
		<Card sx={{ height: "100%" }}>
			<CardActionArea
				onClick={() => onClick(image.image_id)}
				sx={{
					height: "100%",
					display: "flex",
					flexDirection: "column",
					alignItems: "stretch",
				}}
			>
				<Box sx={{ minHeight: 120, display: "flex", alignItems: "stretch" }}>
					{image.thumbnail_url ? (
						<CardMedia
							component="img"
							image={image.thumbnail_url}
							alt={image.component_name}
							sx={{ height: 120, objectFit: "cover" }}
						/>
					) : (
						<Skeleton
							variant="rectangular"
							height={120}
							sx={{ width: "100%" }}
						/>
					)}
				</Box>
				<CardContent>
					<Typography variant="h6" noWrap>
						{image.component_name}
					</Typography>
					<TypeBadge drawingType={image.drawing_type.type_name} />
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
	);
}

export default ImageTileCard;
