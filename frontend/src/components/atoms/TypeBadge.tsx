import { Chip } from "@mui/material";

interface TypeBadgeProps {
	drawingType: string;
}

function TypeBadge({ drawingType }: TypeBadgeProps) {
	return <Chip label={drawingType} size="small" variant="outlined" />;
}

export default TypeBadge;
