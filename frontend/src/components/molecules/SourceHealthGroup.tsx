/**
 * SourceHealthGroup.tsx
 *
 * Displays a health indicator and label for a data source.
 *
 * - Shows a colored HealthDot representing the source's status (ok, degraded, error).
 * - Displays the source name next to the indicator.
 * - Used in dashboards or lists to summarize source health at a glance.
 */
import { Box, Typography } from "@mui/material";
import HealthDot from "../atoms/HealthDot";

interface SourceHealthGroupProps {
	sourceName: string;
	status: "ok" | "degraded" | "error";
}

/**
 * Renders a health indicator and label for a data source.
 * @param sourceName The name of the data source
 * @param status The health status ("ok", "degraded", or "error")
 */
function SourceHealthGroup({ sourceName, status }: SourceHealthGroupProps) {
	return (
		<Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
			<HealthDot status={status} />
			<Typography variant="caption">{sourceName}</Typography>
		</Box>
	);
}

export default SourceHealthGroup;
