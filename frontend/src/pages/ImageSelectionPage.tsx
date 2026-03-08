import {
	Box,
	Button,
	CircularProgress,
	Container,
	Grid,
	Typography,
} from "@mui/material";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import FilterBar from "../components/molecules/FilterBar";
import ImageTileCard from "../components/molecules/ImageTileCard";
import TopAppHeader from "../components/TopAppHeader";
import { useImages } from "../services/api/hooks/useImages";

function ImageSelectionPage() {
	const navigate = useNavigate();
	const [selectedTypeId, setSelectedTypeId] = useState<number | "">("");
	const [searchText, setSearchText] = useState("");

	// Fetch all images unfiltered to derive available drawing types
	const { data: allData, isLoading: typesLoading } = useImages();
	const allImages = allData?.pages.flatMap((p) => p.results) ?? [];

	// Derive unique drawing types from the unfiltered list
	const drawingTypes = Array.from(
		new Map(
			allImages.map((img) => [
				img.drawing_type.drawing_type_id,
				img.drawing_type,
			]),
		).values(),
	);

	// Fetch images filtered by selected drawing type and optional search text
	const {
		data: filteredData,
		isLoading: imagesLoading,
		isError,
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
	const isLoading = typesLoading || (showGrid && imagesLoading);

	return (
		<>
			<TopAppHeader title="Schematic Mapper" />
			<Container maxWidth="lg" sx={{ mt: 3 }}>
				<Typography variant="body1" color="text.secondary" gutterBottom>
					Select a drawing type to browse available schematics.
				</Typography>

				<Box sx={{ mt: 3 }}>
					<FilterBar
						drawingTypes={drawingTypes}
						selectedTypeId={
							selectedTypeId !== "" ? String(selectedTypeId) : null
						}
						onTypeChange={(id) => setSelectedTypeId(Number(id))}
						searchValue={searchText}
						onSearchChange={setSearchText}
					/>
				</Box>

				<Box sx={{ mt: 4 }}>
					{!showGrid && !typesLoading && (
						<Typography color="text.secondary">
							Select a drawing type above to view available schematics.
						</Typography>
					)}

					{isLoading && (
						<Box sx={{ display: "flex", justifyContent: "center", mt: 8 }}>
							<CircularProgress />
						</Box>
					)}

					{showGrid && isError && (
						<Typography color="error">
							Failed to load images. Please check the API is running.
						</Typography>
					)}

					{showGrid && !isLoading && images.length === 0 && !isError && (
						<Typography color="text.secondary">
							No schematic drawings found for this drawing type.
						</Typography>
					)}

					{showGrid && images.length > 0 && (
						<>
							<Grid container spacing={3}>
								{images.map((image) => (
									<Grid key={image.image_id} size={{ xs: 12, sm: 6, md: 4 }}>
										<ImageTileCard
											image={image}
											onClick={(id) => navigate(`/viewer/${id}`)}
										/>
									</Grid>
								))}
							</Grid>

							{hasNextPage && (
								<Box sx={{ display: "flex", justifyContent: "center", mt: 3 }}>
									<Button
										variant="outlined"
										onClick={() => fetchNextPage()}
										disabled={isFetchingNextPage}
									>
										{isFetchingNextPage ? "Loading…" : "Load more"}
									</Button>
								</Box>
							)}
						</>
					)}
				</Box>
			</Container>
		</>
	);
}

export default ImageSelectionPage;
