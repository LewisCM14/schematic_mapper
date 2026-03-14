/**
 * UserMenuTrigger.tsx
 *
 * Renders a disabled user menu icon button with a tooltip.
 *
 * - Indicates where user sign-in functionality would be available in enterprise deployments.
 * - Uses Material UI IconButton and Tooltip for consistent UI.
 * - Currently disabled; serves as a placeholder for future authentication features.
 */
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import { IconButton, Tooltip } from "@mui/material";

/**
 * Renders a disabled user menu icon button with a tooltip, as a placeholder for sign-in.
 */
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
