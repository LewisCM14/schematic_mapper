import { Chip } from "@mui/material";

interface StatusChipProps {
	status: "ok" | "degraded" | "error";
}

const COLOR_MAP = {
	ok: "success",
	degraded: "warning",
	error: "error",
} as const;

function StatusChip({ status }: StatusChipProps) {
	return <Chip label={status} size="small" color={COLOR_MAP[status]} />;
}

export default StatusChip;
