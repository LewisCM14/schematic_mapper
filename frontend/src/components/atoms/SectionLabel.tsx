/**
 * SectionLabel.tsx
 *
 * Renders a styled section label for grouping content in the Schematic Mapper frontend.
 *
 * - Uses Material UI Typography with the "overline" variant for visual separation.
 * - Accepts a string as children (the label text).
 * - Used in forms, panels, and dialogs to denote logical sections.
 */
import { Typography } from "@mui/material";

interface SectionLabelProps {
	children: string;
}

/**
 * Renders a section label using the overline typography style.
 * @param children The label text to display
 */
function SectionLabel({ children }: SectionLabelProps) {
	return (
		<Typography variant="overline" color="text.secondary">
			{children}
		</Typography>
	);
}

export default SectionLabel;
