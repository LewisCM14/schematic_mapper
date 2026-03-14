/**
 * DetailFieldRow.tsx
 *
 * Renders a label/value pair for detail views in the Schematic Mapper frontend.
 *
 * - Uses Material UI Typography for consistent styling.
 * - Displays a placeholder dash if value is null.
 * - Used in side panels, dialogs, and detail cards.
 */
import { Box, Typography } from "@mui/material";

interface DetailFieldRowProps {
	label: string;
	value: string | null;
}

/**
 * Renders a label and value as a row in a detail view.
 * Shows a dash if value is null.
 * @param label The field label
 * @param value The field value (string or null)
 */
function DetailFieldRow({ label, value }: DetailFieldRowProps) {
	return (
		<Box>
			<Typography variant="caption" color="text.secondary">
				{label}
			</Typography>
			<Typography variant="body2">{value ?? "—"}</Typography>
		</Box>
	);
}

export default DetailFieldRow;
