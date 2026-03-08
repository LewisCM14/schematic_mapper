import { Box, Chip, Paper, Typography } from "@mui/material";
import { useTheme } from "@mui/material/styles";

interface ViewerFooterStatusBarProps {
	sourceStatus: Record<string, string>;
	requestId: string | null;
	lastRefreshed: Date | null;
	zoomLevel: number;
}

function formatRelativeTime(date: Date): string {
	const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);
	if (diffSec < 10) return "just now";
	if (diffSec < 60) return `${diffSec}s ago`;
	const diffMin = Math.floor(diffSec / 60);
	if (diffMin < 60) return `${diffMin} min ago`;
	const diffHr = Math.floor(diffMin / 60);
	return `${diffHr} hr ago`;
}

function statusChipColor(
	status: string,
): "success" | "warning" | "error" | "default" {
	if (status === "ok") return "success";
	if (status === "degraded") return "warning";
	if (status === "error") return "error";
	return "default";
}

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
					<Chip
						key={source}
						label={`${source}: ${status}`}
						size="small"
						color={statusChipColor(status)}
						sx={{ height: 20, fontSize: "0.65rem" }}
					/>
				))}
			</Box>

			<Box sx={{ flex: 1 }} />

			{requestId && (
				<Typography
					variant="caption"
					sx={{
						fontFamily: theme.typography.monoFontFamily,
						color: theme.palette.footer.text,
						opacity: 0.7,
					}}
				>
					req: {requestId}
				</Typography>
			)}

			{lastRefreshed && (
				<Typography
					variant="caption"
					sx={{ color: theme.palette.footer.text, opacity: 0.7 }}
				>
					refreshed {formatRelativeTime(lastRefreshed)}
				</Typography>
			)}

			<Typography
				variant="caption"
				sx={{ color: theme.palette.footer.text, opacity: 0.7 }}
			>
				{zoomLevel.toFixed(1)}×
			</Typography>
		</Paper>
	);
}
