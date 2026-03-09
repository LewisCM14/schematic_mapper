import { AppBar, Box, Toolbar } from "@mui/material";
import StatusChip from "../atoms/StatusChip";
import HeaderIdentity from "../molecules/HeaderIdentity";

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
				<Box sx={{ flexGrow: 1 }}>
					<HeaderIdentity title={title} contextLabel={contextLabel} />
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
