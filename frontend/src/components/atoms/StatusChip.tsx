/**
 * StatusChip.tsx
 *
 * Renders a small color-coded status chip for health/status indicators in the Schematic Mapper frontend.
 *
 * - Accepts a status prop ("ok", "degraded", "error") and maps to a Material UI color.
 * - Uses the Chip component for compact, labeled status display.
 * - Used in tables, banners, and inline status indicators.
 */
import { Chip } from "@mui/material";

interface StatusChipProps {
	status: "ok" | "degraded" | "error";
}

const COLOR_MAP = {
	ok: "success",
	degraded: "warning",
	error: "error",
} as const;

/**
 * Renders a color-coded status chip for a given status value.
 * @param status "ok" | "degraded" | "error" (controls color and label)
 */
function StatusChip({ status }: StatusChipProps) {
	return <Chip label={status} size="small" color={COLOR_MAP[status]} />;
}

export default StatusChip;
