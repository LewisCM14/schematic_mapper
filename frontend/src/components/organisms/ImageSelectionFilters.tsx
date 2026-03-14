/**
 * ImageSelectionFilters.tsx
 *
 * Provides a filter bar for selecting drawing types in the image selection workflow.
 *
 * - Wraps the FilterBar molecule with layout and props for drawing type selection.
 * - Used in image selection dialogs or panels to filter images by type.
 */
import { Box } from "@mui/material";
import type { DrawingType } from "../../services/api/schemas";
import FilterBar from "../molecules/FilterBar";

interface ImageSelectionFiltersProps {
	drawingTypes: DrawingType[];
	selectedTypeId: string | null;
	onTypeChange: (id: string) => void;
}

/**
 * Renders a filter bar for selecting drawing types in the image selection workflow.
 * @param drawingTypes Array of available drawing types
 * @param selectedTypeId The currently selected drawing type ID
 * @param onTypeChange Handler for when the drawing type changes
 */
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
