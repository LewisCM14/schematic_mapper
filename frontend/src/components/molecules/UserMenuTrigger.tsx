import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import { IconButton, Tooltip } from "@mui/material";

function UserMenuTrigger() {
	return (
		<Tooltip title="Sign in (available in enterprise deployment)">
			<span>
				<IconButton disabled aria-label="user menu">
					<AccountCircleIcon />
				</IconButton>
			</span>
		</Tooltip>
	);
}

export default UserMenuTrigger;
