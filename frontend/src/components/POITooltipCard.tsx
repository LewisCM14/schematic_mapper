import { Chip, Paper, Typography } from "@mui/material";

interface POITooltipCardProps {
	labelText: string;
	componentName: string;
	fittingPositionId: string;
}

function POITooltipCard({
	labelText,
	componentName,
	fittingPositionId,
}: POITooltipCardProps) {
	return (
		<Paper
			elevation={0}
			sx={{ p: 1, bgcolor: "transparent", minWidth: 160, maxWidth: 240 }}
		>
			<Chip label={componentName} size="small" sx={{ mb: 0.5 }} />
			<Typography variant="body2" sx={{ mt: 0.5 }}>
				{labelText}
			</Typography>
			<Typography
				variant="caption"
				display="block"
				sx={{ mt: 0.25, fontFamily: "IBM Plex Mono, monospace" }}
			>
				{fittingPositionId}
			</Typography>
		</Paper>
	);
}

export default POITooltipCard;
