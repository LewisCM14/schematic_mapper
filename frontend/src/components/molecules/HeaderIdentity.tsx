/**
 * HeaderIdentity.tsx
 *
 * Renders the application logo, title, and optional context label for the Schematic Mapper header.
 *
 * - Uses AppLogo and Material UI Typography for branding and context.
 * - Used in app bars, page headers, and dialogs for consistent identity.
 */
import { Box, Typography } from "@mui/material";
import AppLogo from "../atoms/AppLogo";

interface HeaderIdentityProps {
	title: string;
	contextLabel?: string;
}

/**
 * Renders the app logo, title, and optional context label for headers.
 * @param title Main title text
 * @param contextLabel Optional context/section label
 */
function HeaderIdentity({ title, contextLabel }: HeaderIdentityProps) {
	return (
		<Box sx={{ display: "flex", alignItems: "center" }}>
			<Box sx={{ mr: 1.5 }}>
				<AppLogo />
			</Box>
			<Box>
				<Typography variant="h6" component="div" sx={{ lineHeight: 1.2 }}>
					{title}
				</Typography>
				{contextLabel && (
					<Typography variant="body2" sx={{ opacity: 0.85, lineHeight: 1.2 }}>
						{contextLabel}
					</Typography>
				)}
			</Box>
		</Box>
	);
}

export default HeaderIdentity;
