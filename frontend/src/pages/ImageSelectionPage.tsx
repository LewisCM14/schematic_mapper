/**
 * ImageSelectionPage.tsx
 *
 * Displays the main page for selecting a drawing type and browsing available schematic images.
 *
 * - Fetches drawing types and images, manages selection state, and renders the image selection template.
 * - Used as the main entry point for users to browse and select schematics.
 */
import { Box, CircularProgress } from "@mui/material";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import ImageSelectionTemplate from "../components/templates/ImageSelectionTemplate";
import { useDrawingTypes } from "../services/api/hooks/useDrawingTypes";
import { useImages } from "../services/api/hooks/useImages";

/**
 * Renders the image selection page for browsing and selecting schematic images by drawing type.
 * Handles fetching, selection, and navigation logic.
 */
function ImageSelectionPage() {
	const navigate = useNavigate();
	const [selectedTypeId, setSelectedTypeId] = useState<number | "">("");

	// Fetch drawing types from dedicated endpoint
	const { data: drawingTypes = [], isLoading: typesLoading } =
		useDrawingTypes();

	useEffect(() => {
		if (selectedTypeId === "" && drawingTypes.length > 0) {
			setSelectedTypeId(drawingTypes[0].drawing_type_id);
		}
	}, [drawingTypes, selectedTypeId]);

	// Fetch images filtered by selected drawing type
	const {
		data: filteredData,
		isLoading: imagesLoading,
		isError: imagesError,
		hasNextPage,
		fetchNextPage,
		isFetchingNextPage,
	} = useImages(selectedTypeId !== "" ? selectedTypeId : undefined, undefined);
	const filteredImages =
		(
			filteredData?.pages as
				| import("../services/api/schemas").ImageListPage[]
				| undefined
		)?.flatMap((p) => p.results) ?? [];

	const showGrid = selectedTypeId !== "";
	const images = showGrid
		? filteredImages
		: ([] as import("../services/api/schemas").Image[]);

	const stateSlot = (
		<>
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
			images={images}
			onImageClick={(id) => navigate(`/viewer/${id}`)}
			hasNextPage={hasNextPage}
			isFetchingNextPage={isFetchingNextPage}
			onLoadMore={() => fetchNextPage()}
			onOpenAdmin={() => navigate("/admin")}
			showGrid={showGrid}
			stateSlot={stateSlot}
			imagesLoading={showGrid && imagesLoading}
			imagesError={showGrid && imagesError}
			imagesErrorMessage="Failed to load images. Please check the API is running."
		/>
	);
}

export default ImageSelectionPage;
