import { FormControl, InputLabel, MenuItem, Select } from "@mui/material";
import type { DrawingType } from "../../services/api/schemas";

interface FilterBarProps {
	drawingTypes: DrawingType[];
	selectedTypeId: string | null;
	onTypeChange: (id: string) => void;
}

function FilterBar({
	drawingTypes,
	selectedTypeId,
	onTypeChange,
}: FilterBarProps) {
	return (
		<FormControl fullWidth size="small">
			<InputLabel id="drawing-type-label">Drawing Type</InputLabel>
			<Select
				labelId="drawing-type-label"
				label="Drawing Type"
				value={selectedTypeId ?? ""}
				onChange={(e) => onTypeChange(e.target.value as string)}
				inputProps={{ "aria-label": "drawing type" }}
			>
				{drawingTypes.map((dt) => (
					<MenuItem key={dt.drawing_type_id} value={String(dt.drawing_type_id)}>
						{dt.type_name}
					</MenuItem>
				))}
			</Select>
		</FormControl>
	);
}

export default FilterBar;
