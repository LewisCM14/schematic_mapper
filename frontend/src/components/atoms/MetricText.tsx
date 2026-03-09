import { Box, Typography } from "@mui/material";

interface MetricTextProps {
	label: string;
	value: string;
}

function MetricText({ label, value }: MetricTextProps) {
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
			<Typography variant="caption">{value}</Typography>
		</Box>
	);
}

export default MetricText;
