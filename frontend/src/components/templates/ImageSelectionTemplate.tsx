/**
 * ImageSelectionTemplate.tsx
 *
 * Provides a layout template for the image selection workflow, including header, filters, grid, and admin access.
 *
 * - Renders the top app header, description, filter bar, and image grid.
 * - Supports admin upload access and custom state slot rendering.
 * - Used for selecting images to map or annotate.
 */
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

/**
 * Renders the image selection workflow template with header, filters, grid, and admin access.
 * @param title The page title
 * @param description Description text for the workflow
 * @param drawingTypes Array of available drawing types
 * @param selectedTypeId The currently selected drawing type ID
 * @param onTypeChange Handler for drawing type changes
 * @param images Array of images to display
 * @param onImageClick Handler for image selection
 * @param hasNextPage Whether there are more images to load (optional)
 * @param isFetchingNextPage Whether the next page is loading (optional)
 * @param onLoadMore Handler for loading more images (optional)
 * @param onOpenAdmin Handler for opening the admin upload (optional)
 * @param showGrid Whether to show the image grid
 * @param stateSlot Custom React node for state display
 * @param imagesLoading Whether images are loading (optional)
 * @param imagesError Whether there was an error loading images (optional)
 * @param imagesErrorMessage Error message for image loading (optional)
 */
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
