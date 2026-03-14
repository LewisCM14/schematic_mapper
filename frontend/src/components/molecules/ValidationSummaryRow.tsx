/**
 * ValidationSummaryRow.tsx
 *
 * Displays a summary row for validation results, including total, warning, and error counts.
 *
 * - Shows the total number of positions.
 * - Optionally displays warning and error chips if counts are greater than zero.
 * - Used in validation panels or summary sections to provide quick feedback.
 */
import { Box, Chip, Typography } from "@mui/material";

interface ValidationSummaryRowProps {
	totalCount: number;
	warningCount?: number;
	errorCount?: number;
}

/**
 * Renders a summary row for validation results, showing total, warning, and error counts.
 * @param totalCount The total number of positions
 * @param warningCount The number of warnings (optional, default 0)
 * @param errorCount The number of errors (optional, default 0)
 */
function ValidationSummaryRow({
	totalCount,
	warningCount = 0,
	errorCount = 0,
}: ValidationSummaryRowProps) {
	return (
		<Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
			<Typography variant="caption">{totalCount} positions</Typography>
			{warningCount > 0 && (
				<Chip label={`${warningCount} warnings`} size="small" color="warning" />
			)}
			{errorCount > 0 && (
				<Chip label={`${errorCount} errors`} size="small" color="error" />
			)}
		</Box>
	);
}

export default ValidationSummaryRow;
