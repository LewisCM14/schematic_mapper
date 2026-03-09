import { Box, Container, Typography } from "@mui/material";
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
	searchValue: string;
	onSearchChange: (value: string) => void;
	images: Image[];
	onImageClick: (imageId: string) => void;
	hasNextPage?: boolean;
	isFetchingNextPage?: boolean;
	onLoadMore?: () => void;
	showGrid: boolean;
	stateSlot: ReactNode;
}

function ImageSelectionTemplate({
	title,
	description,
	drawingTypes,
	selectedTypeId,
	onTypeChange,
	searchValue,
	onSearchChange,
	images,
	onImageClick,
	hasNextPage,
	isFetchingNextPage,
	onLoadMore,
	showGrid,
	stateSlot,
}: ImageSelectionTemplateProps) {
	return (
		<>
			<TopAppHeader title={title} />
			<Container maxWidth="lg" sx={{ mt: 3 }}>
				<Typography variant="body1" color="text.secondary" gutterBottom>
					{description}
				</Typography>

				<ImageSelectionFilters
					drawingTypes={drawingTypes}
					selectedTypeId={selectedTypeId}
					onTypeChange={onTypeChange}
					searchValue={searchValue}
					onSearchChange={onSearchChange}
				/>

				<Box sx={{ mt: 4 }}>
					{stateSlot}

					{showGrid && images.length > 0 && (
						<ImageSelectionGrid
							images={images}
							onImageClick={onImageClick}
							hasNextPage={hasNextPage}
							isFetchingNextPage={isFetchingNextPage}
							onLoadMore={onLoadMore}
						/>
					)}
				</Box>
			</Container>
		</>
	);
}

export default ImageSelectionTemplate;
