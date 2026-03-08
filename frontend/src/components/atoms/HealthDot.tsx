import { Box } from "@mui/material";
import { useTheme } from "@mui/material/styles";

interface HealthDotProps {
	status: "ok" | "degraded" | "error";
}

function HealthDot({ status }: HealthDotProps) {
	const theme = useTheme();

	const color =
		status === "ok"
			? theme.palette.success.main
			: status === "degraded"
				? theme.palette.warning.main
				: theme.palette.error.main;

	return (
		<Box
			aria-label={`status: ${status}`}
			sx={{
				width: 10,
				height: 10,
				borderRadius: "50%",
				backgroundColor: color,
				flexShrink: 0,
			}}
		/>
	);
}

export default HealthDot;
