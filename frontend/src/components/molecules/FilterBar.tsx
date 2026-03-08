import {
	Box,
	FormControl,
	InputLabel,
	MenuItem,
	Select,
	TextField,
} from "@mui/material";
import type { DrawingType } from "../../services/api/schemas";

interface FilterBarProps {
	drawingTypes: DrawingType[];
	selectedTypeId: string | null;
	onTypeChange: (id: string) => void;
	searchValue?: string;
	onSearchChange?: (value: string) => void;
}

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
				<TextField
					size="small"
					label="Search images"
					value={searchValue}
					onChange={(e) => onSearchChange(e.target.value)}
					inputProps={{ "aria-label": "search images" }}
				/>
			)}
		</Box>
	);
}

export default FilterBar;
