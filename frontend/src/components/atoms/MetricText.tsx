/**
 * MetricText.tsx
 *
 * Displays a labeled metric/value pair in a compact, inline style for dashboards and status bars.
 *
 * - Uses Material UI Typography for consistent text styling.
 * - Value is rendered in a monospaced font for alignment and clarity.
 * - Designed for use in health/status panels, metrics, and inline summaries.
 */
import { Box, Typography } from "@mui/material";
import { useTheme } from "@mui/material/styles";

interface MetricTextProps {
	label: string;
	value: string;
}

/**
 * Renders a label and value as a compact metric display.
 * Value is shown in a monospaced font for easy scanning.
 * @param label The label for the metric
 * @param value The value to display (string)
 */
function MetricText({ label, value }: MetricTextProps) {
	const theme = useTheme();
	return (
		<Box
			sx={{
				display: "inline-flex",
				alignItems: "baseline",
				gap: 0.5,
			}}
		>
			<Typography variant="caption" color="text.secondary">
				{label}
			</Typography>
			<Typography
				variant="caption"
				sx={{ fontFamily: theme.typography.monoFontFamily }}
			>
				{value}
			</Typography>
		</Box>
	);
}

export default MetricText;
