import { AppBar, Box, Toolbar, Typography } from "@mui/material";
import AppLogo from "../atoms/AppLogo";
import StatusChip from "../atoms/StatusChip";

interface TopAppHeaderProps {
	title: string;
	contextLabel?: string;
	sourceStatus?: Record<string, string>;
}

function TopAppHeader({
	title,
	contextLabel,
	sourceStatus,
}: TopAppHeaderProps) {
	return (
		<AppBar position="static" color="primary">
			<Toolbar>
				<Box sx={{ mr: 1.5 }}>
					<AppLogo />
				</Box>
				<Box sx={{ flexGrow: 1 }}>
					<Typography variant="h6" component="div" sx={{ lineHeight: 1.2 }}>
						{title}
					</Typography>
					{contextLabel && (
						<Typography variant="body2" sx={{ opacity: 0.85, lineHeight: 1.2 }}>
							{contextLabel}
						</Typography>
					)}
				</Box>
				{sourceStatus &&
					Object.entries(sourceStatus).map(([source, status]) => (
						<Box key={source} sx={{ ml: 1 }} aria-label={`${source} ${status}`}>
							<StatusChip status={status as "ok" | "degraded" | "error"} />
						</Box>
					))}
			</Toolbar>
		</AppBar>
	);
}

export default TopAppHeader;
