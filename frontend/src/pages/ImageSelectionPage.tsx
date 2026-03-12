import { Box, CircularProgress } from "@mui/material";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import ImageSelectionTemplate from "../components/templates/ImageSelectionTemplate";
import { useDrawingTypes } from "../services/api/hooks/useDrawingTypes";
import { useImages } from "../services/api/hooks/useImages";

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
	type ImageType = {
		image_id: string;
		drawing_type: {
			drawing_type_id: number;
			type_name: string;
			description: string;
			is_active: boolean;
		};
		component_name: string;
		width_px: number;
		height_px: number;
		uploaded_at: string;
		thumbnail_url: string | null;
	};
	const filteredImages =
		filteredData?.pages.flatMap((p) =>
			p && "results" in p ? (p.results as ImageType[]) : [],
		) ?? [];

	const showGrid = selectedTypeId !== "";
	const images = showGrid ? filteredImages : [];

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
