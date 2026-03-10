import { Box, Typography } from "@mui/material";
import { useTheme } from "@mui/material/styles";

interface POIMarkerClusterProps {
	count: number;
	onClick?: () => void;
}

function POIMarkerCluster({ count, onClick }: POIMarkerClusterProps) {
	const theme = useTheme();
	return (
		<Box
			onClick={onClick}
			role="button"
			tabIndex={0}
			aria-label={`${count} markers clustered`}
			onKeyDown={(e) => {
				if (e.key === "Enter" || e.key === " ") onClick?.();
			}}
			sx={{
				width: 32,
				height: 32,
				borderRadius: "50%",
				backgroundColor: theme.palette.map.poi.cluster,
				color: theme.palette.common.white,
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				cursor: onClick ? "pointer" : "default",
				userSelect: "none",
			}}
		>
			<Typography variant="caption" sx={{ fontWeight: 700, color: "inherit" }}>
				{count}
			</Typography>
		</Box>
	);
}

export default POIMarkerCluster;
