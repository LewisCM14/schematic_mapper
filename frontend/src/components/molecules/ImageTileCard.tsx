import {
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

function ImageTileCard({ image, onClick }: ImageTileCardProps) {
	return (
		<Card>
			<CardActionArea onClick={() => onClick(image.image_id)}>
				{image.thumbnail_url ? (
					<CardMedia
						component="img"
						image={image.thumbnail_url}
						height={120}
						alt={image.component_name}
					/>
				) : (
					<Skeleton variant="rectangular" height={120} />
				)}
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
