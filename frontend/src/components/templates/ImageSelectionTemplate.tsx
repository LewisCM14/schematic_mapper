import { Box, Button, Typography } from "@mui/material";
import type { ReactNode } from "react";
import type { DrawingType, Image } from "../../services/api/schemas";
import ImageSelectionFilters from "../organisms/ImageSelectionFilters";
import ImageSelectionGrid from "../organisms/ImageSelectionGrid";
import TopAppHeader from "../organisms/TopAppHeader";

interface ImageSelectionTemplateProps {
	title: string;
	description: string;
	drawingTypes: DrawingType[];
	selectedTypeId: string | null;
	onTypeChange: (id: string) => void;
	images: Image[];
	onImageClick: (imageId: string) => void;
	hasNextPage?: boolean;
	isFetchingNextPage?: boolean;
	onLoadMore?: () => void;
	onOpenAdmin?: () => void;
	showGrid: boolean;
	stateSlot: ReactNode;
	imagesLoading?: boolean;
	imagesError?: boolean;
	imagesErrorMessage?: string;
}

function ImageSelectionTemplate({
	title,
	description,
	drawingTypes,
	selectedTypeId,
	onTypeChange,
	images,
	onImageClick,
	hasNextPage,
	isFetchingNextPage,
	onLoadMore,
	onOpenAdmin,
	showGrid,
	stateSlot,
	imagesLoading,
	imagesError,
	imagesErrorMessage,
}: ImageSelectionTemplateProps) {
	return (
		<>
			<TopAppHeader title={title} />
			<Box sx={{ width: "100%", px: { xs: 2, md: 3 }, py: 3 }}>
				<Box
					sx={{
						display: "flex",
						justifyContent: "space-between",
						alignItems: { xs: "flex-start", sm: "center" },
						gap: 2,
						flexWrap: "wrap",
						mb: 2,
					}}
				>
					<Typography variant="body1" color="text.secondary">
						{description}
					</Typography>
					<Button variant="contained" onClick={onOpenAdmin}>
						Open Admin Upload
					</Button>
				</Box>

				<ImageSelectionFilters
					drawingTypes={drawingTypes}
					selectedTypeId={selectedTypeId}
					onTypeChange={onTypeChange}
				/>

				<Box sx={{ mt: 4 }}>
					{stateSlot}

					{showGrid && (
						<ImageSelectionGrid
							images={images}
							onImageClick={onImageClick}
							hasNextPage={hasNextPage}
							isFetchingNextPage={isFetchingNextPage}
							onLoadMore={onLoadMore}
							isLoading={imagesLoading}
							isError={imagesError}
							errorMessage={imagesErrorMessage}
						/>
					)}
				</Box>
			</Box>
		</>
	);
}

export default ImageSelectionTemplate;
