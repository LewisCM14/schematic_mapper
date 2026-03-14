/**
 * AppLogo.tsx
 *
 * Simple avatar-based logo for the Schematic Mapper application.
 *
 * - Uses Material UI Avatar for consistent sizing and theming.
 * - Displays the "SM" monogram in the primary color scheme.
 * - Used in app bars, navigation, and branding locations.
 *
 * Accessible via aria-label for screen readers.
 */
import { Avatar } from "@mui/material";

/**
 * Renders the Schematic Mapper logo as a styled avatar.
 */
function AppLogo() {
	return (
		<Avatar
			sx={{
				width: 32,
				height: 32,
				bgcolor: "primary.dark",
				fontSize: "0.75rem",
				fontWeight: 700,
			}}
			aria-label="Schematic Mapper logo"
		>
			SM
		</Avatar>
	);
}

export default AppLogo;
