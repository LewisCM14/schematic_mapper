import { Box } from "@mui/material";
import type { DrawingType } from "../../services/api/schemas";
import FilterBar from "../molecules/FilterBar";

interface ImageSelectionFiltersProps {
	drawingTypes: DrawingType[];
	selectedTypeId: string | null;
	onTypeChange: (id: string) => void;
}

function ImageSelectionFilters({
	drawingTypes,
	selectedTypeId,
	onTypeChange,
}: ImageSelectionFiltersProps) {
	return (
		<Box sx={{ mt: 3 }}>
			<FilterBar
				drawingTypes={drawingTypes}
				selectedTypeId={selectedTypeId}
				onTypeChange={onTypeChange}
			/>
		</Box>
	);
}

export default ImageSelectionFilters;
