import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import MenuIcon from "@mui/icons-material/Menu";
import { AppBar, Box, Toolbar } from "@mui/material";
import IconButtonAction from "../atoms/IconButtonAction";
import StatusChip from "../atoms/StatusChip";
import HeaderIdentity from "../molecules/HeaderIdentity";
import UserMenuTrigger from "../molecules/UserMenuTrigger";

interface TopAppHeaderProps {
	title: string;
	contextLabel?: string;
	sourceStatus?: Record<string, string>;
	onBack?: () => void;
}

function TopAppHeader({
	title,
	contextLabel,
	sourceStatus,
	onBack,
}: TopAppHeaderProps) {
	return (
		<AppBar position="static" color="primary">
			<Toolbar>
				{onBack ? (
					<IconButtonAction
						icon={<ArrowBackIcon />}
						onClick={onBack}
						ariaLabel="back to image selection"
						tooltip="Back to image selection"
					/>
				) : (
					<IconButtonAction
						icon={<MenuIcon />}
						onClick={() => {}}
						ariaLabel="navigation menu"
						tooltip="Navigation (available in enterprise deployment)"
						disabled
					/>
				)}
				<Box sx={{ flexGrow: 1, ml: 1 }}>
					<HeaderIdentity title={title} contextLabel={contextLabel} />
				</Box>
				{sourceStatus &&
					Object.entries(sourceStatus).map(([source, status]) => (
						<Box key={source} sx={{ ml: 1 }} aria-label={`${source} ${status}`}>
							<StatusChip status={status as "ok" | "degraded" | "error"} />
						</Box>
					))}
				<IconButtonAction
					icon={<HelpOutlineIcon />}
					onClick={() => {}}
					ariaLabel="help"
					tooltip="Help (available in enterprise deployment)"
					disabled
				/>
				<UserMenuTrigger />
			</Toolbar>
		</AppBar>
	);
}

export default TopAppHeader;
