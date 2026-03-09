import { Box, Typography } from "@mui/material";
import { useTheme } from "@mui/material/styles";

interface MetricTextProps {
	label: string;
	value: string;
}

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
