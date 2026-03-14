/**
 * POIMarkerCluster.tsx
 *
 * Renders a circular cluster marker for points-of-interest (POI) on a map, showing the count of clustered markers.
 *
 * - Uses Material UI Box and Typography for consistent styling.
 * - Fully accessible: keyboard and screen reader support.
 * - Color and style are theme-driven for map integration.
 * - Memoized for performance in large map views.
 *
 * Use in map overlays to represent multiple POIs at the same location/zoom.
 */
import { Box, Typography } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { memo } from "react";

interface POIMarkerClusterProps {
	count: number;
	onClick?: () => void;
}

/**
 * Renders a circular cluster marker for map POIs, showing the count of clustered markers.
 * Fully accessible and memoized for performance.
 * @param count Number of markers in the cluster
 * @param onClick Optional click handler for cluster interaction
 */
const POIMarkerCluster = memo(function POIMarkerCluster({
	count,
	onClick,
}: POIMarkerClusterProps) {
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
});

export default POIMarkerCluster;
