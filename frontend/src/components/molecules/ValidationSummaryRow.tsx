import { Box, Chip, Typography } from "@mui/material";

interface ValidationSummaryRowProps {
	totalCount: number;
	warningCount?: number;
	errorCount?: number;
}

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
