import { Box, Typography } from "@mui/material";
import HealthDot from "../atoms/HealthDot";

interface SourceHealthGroupProps {
	sourceName: string;
	status: "ok" | "degraded" | "error";
}

function SourceHealthGroup({ sourceName, status }: SourceHealthGroupProps) {
	return (
		<Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
			<HealthDot status={status} />
			<Typography variant="caption">{sourceName}</Typography>
		</Box>
	);
}

export default SourceHealthGroup;
