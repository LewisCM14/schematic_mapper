import { AppBar, Box, Toolbar, Typography } from "@mui/material";
import AppLogo from "../atoms/AppLogo";

interface TopAppHeaderProps {
	title: string;
	contextLabel?: string;
}

function TopAppHeader({ title, contextLabel }: TopAppHeaderProps) {
	return (
		<AppBar position="static" color="primary">
			<Toolbar>
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
			</Toolbar>
		</AppBar>
	);
}

export default TopAppHeader;
