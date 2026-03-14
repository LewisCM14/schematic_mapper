/**
 * IconButtonAction.tsx
 *
 * Reusable icon button with optional tooltip for actions in the Schematic Mapper frontend.
 *
 * - Wraps Material UI IconButton and Tooltip for consistent UX.
 * - Supports disabled state, accessibility via aria-label, and tooltips for clarity.
 * - Tooltip is always shown, even for disabled buttons (via span wrapper workaround).
 *
 * Use for all icon-only action buttons in toolbars, lists, and dialogs.
 */
import { IconButton, Tooltip } from "@mui/material";
import type { ReactNode } from "react";

interface IconButtonActionProps {
	icon: ReactNode;
	onClick: () => void;
	ariaLabel: string;
	tooltip?: string;
	disabled?: boolean;
}

/**
 * Renders an icon button with optional tooltip and accessibility features.
 * Tooltip is shown even when the button is disabled.
 * @param icon The icon to display inside the button
 * @param onClick Click handler
 * @param ariaLabel Accessible label for screen readers
 * @param tooltip Optional tooltip text
 * @param disabled Optional disabled state
 */
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
