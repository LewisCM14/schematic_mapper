import { Box } from "@mui/material";
import type { DrawingType } from "../../services/api/schemas";
import FilterBar from "../molecules/FilterBar";

interface ImageSelectionFiltersProps {
	drawingTypes: DrawingType[];
	selectedTypeId: string | null;
	onTypeChange: (id: string) => void;
	searchValue: string;
	onSearchChange: (value: string) => void;
}

function ImageSelectionFilters({
	drawingTypes,
	selectedTypeId,
	onTypeChange,
	searchValue,
	onSearchChange,
}: ImageSelectionFiltersProps) {
	return (
		<Box sx={{ mt: 3 }}>
			<FilterBar
				drawingTypes={drawingTypes}
				selectedTypeId={selectedTypeId}
				onTypeChange={onTypeChange}
				searchValue={searchValue}
				onSearchChange={onSearchChange}
			/>
		</Box>
	);
}

export default ImageSelectionFilters;
