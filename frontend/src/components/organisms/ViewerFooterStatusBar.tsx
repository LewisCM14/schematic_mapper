/**
 * ViewerFooterStatusBar.tsx
 *
 * Displays a footer status bar with source health, request ID, refresh time, and zoom level.
 *
 * - Shows health indicators for each data source.
 * - Displays request ID, last refreshed time, and current zoom level.
 * - Used at the bottom of the viewer for real-time status feedback.
 */
import { Box, Paper } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import MetricText from "../atoms/MetricText";
import SourceHealthGroup from "../molecules/SourceHealthGroup";

interface ViewerFooterStatusBarProps {
	sourceStatus: Record<string, string>;
	requestId: string | null;
	lastRefreshed: Date | null;
	zoomLevel: number;
}

/**
 * Formats a Date as a relative time string (e.g., "just now", "2 min ago").
 * @param date The date to format
 * @returns Human-readable relative time string
 */
export function formatRelativeTime(date: Date): string {
	const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);
	if (diffSec < 10) return "just now";
	if (diffSec < 60) return `${diffSec}s ago`;
	const diffMin = Math.floor(diffSec / 60);
	if (diffMin < 60) return `${diffMin} min ago`;
	const diffHr = Math.floor(diffMin / 60);
	return `${diffHr} hr ago`;
}

/**
 * Renders a footer status bar with source health, request ID, refresh time, and zoom level.
 * @param sourceStatus Record of source statuses (ok, degraded, error)
 * @param requestId The current request ID (or null)
 * @param lastRefreshed The last refreshed time (or null)
 * @param zoomLevel The current zoom level
 */
export default function ViewerFooterStatusBar({
	sourceStatus,
	requestId,
	lastRefreshed,
	zoomLevel,
}: ViewerFooterStatusBarProps) {
	const theme = useTheme();

	return (
		<Paper
			square
			elevation={0}
			sx={{
				backgroundColor: theme.palette.footer.bg,
				color: theme.palette.footer.text,
				px: 2,
				py: 0.75,
				display: "flex",
				alignItems: "center",
				gap: 2,
				flexShrink: 0,
			}}
		>
			<Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
				{Object.entries(sourceStatus).map(([source, status]) => (
					<SourceHealthGroup
						key={source}
						sourceName={source}
						status={status as "ok" | "degraded" | "error"}
					/>
				))}
			</Box>

			<Box sx={{ flex: 1 }} />

			{requestId && <MetricText label="req:" value={requestId} />}

			{lastRefreshed && (
				<MetricText
					label="refreshed"
					value={formatRelativeTime(lastRefreshed)}
				/>
			)}

			<MetricText label="" value={`${zoomLevel.toFixed(1)}×`} />
		</Paper>
	);
}
