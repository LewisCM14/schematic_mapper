import { IconButton, Tooltip } from "@mui/material";
import type { ReactNode } from "react";

interface IconButtonActionProps {
	icon: ReactNode;
	onClick: () => void;
	ariaLabel: string;
	tooltip?: string;
}

function IconButtonAction({
	icon,
	onClick,
	ariaLabel,
	tooltip,
}: IconButtonActionProps) {
	const button = (
		<IconButton size="small" onClick={onClick} aria-label={ariaLabel}>
			{icon}
		</IconButton>
	);
	return tooltip ? <Tooltip title={tooltip}>{button}</Tooltip> : button;
}

export default IconButtonAction;
