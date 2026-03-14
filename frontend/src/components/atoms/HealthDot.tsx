/**
 * HealthDot.tsx
 *
 * Small colored status indicator dot for health/status displays in the Schematic Mapper frontend.
 *
 * - Accepts a status prop ("ok", "degraded", "error") and colors the dot accordingly.
 * - Uses Material UI theme palette for consistent color coding.
 * - Accessible via aria-label for screen readers.
 *
 * Use in status banners, health checks, and inline indicators.
 */
import { Box } from "@mui/material";
import { useTheme } from "@mui/material/styles";

interface HealthDotProps {
	status: "ok" | "degraded" | "error";
}

/**
 * Renders a small colored dot representing health/status.
 * @param status "ok" | "degraded" | "error" (controls color)
 */
function HealthDot({ status }: HealthDotProps) {
	const theme = useTheme();

	const color =
		status === "ok"
			? theme.palette.success.main
			: status === "degraded"
				? theme.palette.warning.main
				: theme.palette.error.main;

	return (
		<Box
			aria-label={`status: ${status}`}
			sx={{
				width: 10,
				height: 10,
				borderRadius: "50%",
				backgroundColor: color,
				flexShrink: 0,
			}}
		/>
	);
}

export default HealthDot;
