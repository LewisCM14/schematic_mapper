/**
 * FilterBar.tsx
 *
 * Combined filter/search bar for image lists in the Schematic Mapper frontend.
 *
 * - Provides a dropdown for drawing type selection and an optional search input.
 * - Uses Material UI FormControl, Select, and a custom SearchInput for consistent UX.
 * - Used in image galleries and admin pages to filter and search images.
 */
import { Box, FormControl, InputLabel, MenuItem, Select } from "@mui/material";
import type { DrawingType } from "../../services/api/schemas";
import SearchInput from "../atoms/SearchInput";

interface FilterBarProps {
	drawingTypes: DrawingType[];
	selectedTypeId: string | null;
	onTypeChange: (id: string) => void;
	searchValue?: string;
	onSearchChange?: (value: string) => void;
}

/**
 * Renders a filter/search bar for image lists.
 * Includes a drawing type dropdown and optional search input.
 * @param drawingTypes List of available drawing types
 * @param selectedTypeId Currently selected drawing type ID
 * @param onTypeChange Handler for drawing type selection
 * @param searchValue Current search input value (optional)
 * @param onSearchChange Handler for search input changes (optional)
 */
function FilterBar({
	drawingTypes,
	selectedTypeId,
	onTypeChange,
	searchValue = "",
	onSearchChange,
}: FilterBarProps) {
	return (
		<Box sx={{ display: "flex", gap: 2, alignItems: "flex-start" }}>
			<FormControl size="small" sx={{ minWidth: 200 }}>
				<InputLabel id="drawing-type-label">Drawing Type</InputLabel>
				<Select
					labelId="drawing-type-label"
					label="Drawing Type"
					value={selectedTypeId ?? ""}
					onChange={(e) => onTypeChange(e.target.value as string)}
					inputProps={{ "aria-label": "drawing type" }}
				>
					{drawingTypes.map((dt) => (
						<MenuItem
							key={dt.drawing_type_id}
							value={String(dt.drawing_type_id)}
						>
							{dt.type_name}
						</MenuItem>
					))}
				</Select>
			</FormControl>
			{onSearchChange !== undefined && (
				<SearchInput
					value={searchValue}
					onChange={onSearchChange}
					label="Search images"
					onClear={() => onSearchChange("")}
				/>
			)}
		</Box>
	);
}

export default FilterBar;
