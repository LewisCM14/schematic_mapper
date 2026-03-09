import { IconButton, Tooltip } from "@mui/material";
import type { ReactNode } from "react";

interface IconButtonActionProps {
	icon: ReactNode;
	onClick: () => void;
	ariaLabel: string;
	tooltip?: string;
	disabled?: boolean;
}

function IconButtonAction({
	icon,
	onClick,
	ariaLabel,
	tooltip,
	disabled,
}: IconButtonActionProps) {
	const button = (
		<IconButton
			size="small"
			onClick={onClick}
			aria-label={ariaLabel}
			disabled={disabled}
		>
			{icon}
		</IconButton>
	);
	if (!tooltip) return button;
	// Wrap in span so Tooltip works on disabled buttons
	return (
		<Tooltip title={tooltip}>
			<span>{button}</span>
		</Tooltip>
	);
}

export default IconButtonAction;
