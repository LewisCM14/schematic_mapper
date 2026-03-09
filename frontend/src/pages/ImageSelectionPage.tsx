import { Box, CircularProgress, Typography } from "@mui/material";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import ImageSelectionTemplate from "../components/templates/ImageSelectionTemplate";
import { useDrawingTypes } from "../services/api/hooks/useDrawingTypes";
import { useImages } from "../services/api/hooks/useImages";

function ImageSelectionPage() {
	const navigate = useNavigate();
	const [selectedTypeId, setSelectedTypeId] = useState<number | "">("");
	const [searchText, setSearchText] = useState("");

	// Fetch drawing types from dedicated endpoint
	const { data: drawingTypes = [], isLoading: typesLoading } =
		useDrawingTypes();

	// Fetch images filtered by selected drawing type and optional search text
	const {
		data: filteredData,
		isLoading: imagesLoading,
		isError: imagesError,
		hasNextPage,
		fetchNextPage,
		isFetchingNextPage,
	} = useImages(
		selectedTypeId !== "" ? selectedTypeId : undefined,
		searchText || undefined,
	);
	const filteredImages = filteredData?.pages.flatMap((p) => p.results) ?? [];

	// Only show tile grid after a type has been selected and data is ready
	const showGrid = selectedTypeId !== "";
	const images = showGrid ? filteredImages : [];

	const stateSlot = (
		<>
			{!showGrid && !typesLoading && (
				<Typography color="text.secondary">
					Select a drawing type above to view available schematics.
				</Typography>
			)}

			{typesLoading && (
				<Box sx={{ display: "flex", justifyContent: "center", mt: 8 }}>
					<CircularProgress />
				</Box>
			)}
		</>
	);

	return (
		<ImageSelectionTemplate
			title="Schematic Mapper"
			description="Select a drawing type to browse available schematics."
			drawingTypes={drawingTypes}
			selectedTypeId={selectedTypeId !== "" ? String(selectedTypeId) : null}
			onTypeChange={(id) => setSelectedTypeId(Number(id))}
			searchValue={searchText}
			onSearchChange={setSearchText}
			images={images}
			onImageClick={(id) => navigate(`/viewer/${id}`)}
			hasNextPage={hasNextPage}
			isFetchingNextPage={isFetchingNextPage}
			onLoadMore={() => fetchNextPage()}
			showGrid={showGrid}
			stateSlot={stateSlot}
			imagesLoading={showGrid && imagesLoading}
			imagesError={showGrid && imagesError}
			imagesErrorMessage="Failed to load images. Please check the API is running."
		/>
	);
}

export default ImageSelectionPage;
