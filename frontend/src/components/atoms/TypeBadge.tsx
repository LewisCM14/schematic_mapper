/**
 * TypeBadge.tsx
 *
 * Renders a small outlined badge for displaying a drawing type label in the Schematic Mapper frontend.
 *
 * - Uses Material UI Chip for consistent styling.
 * - Used in image lists, detail views, and filters to show drawing type.
 */
import { Chip } from "@mui/material";

interface TypeBadgeProps {
	drawingType: string;
}

/**
 * Renders an outlined badge for a drawing type label.
 * @param drawingType The drawing type string to display
 */
function TypeBadge({ drawingType }: TypeBadgeProps) {
	return <Chip label={drawingType} size="small" variant="outlined" />;
}

export default TypeBadge;
