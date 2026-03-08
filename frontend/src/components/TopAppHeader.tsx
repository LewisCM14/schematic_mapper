import { AppBar, Avatar, Box, Toolbar, Typography } from "@mui/material";

interface TopAppHeaderProps {
	title: string;
	contextLabel?: string;
}

function TopAppHeader({ title, contextLabel }: TopAppHeaderProps) {
	return (
		<AppBar position="static" color="primary">
			<Toolbar>
				<Avatar
					sx={{
						width: 32,
						height: 32,
						bgcolor: "primary.dark",
						fontSize: "0.75rem",
						fontWeight: 700,
						mr: 1.5,
					}}
				>
					SM
				</Avatar>
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
