import { Avatar } from "@mui/material";

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
