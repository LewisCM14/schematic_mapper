/**
 * POITooltipCard.tsx
 *
 * Renders a styled tooltip card for a point-of-interest (POI) marker on the map.
 *
 * - Shows the component name, label text, and fitting position ID.
 * - Optionally includes a close button for dismissing the tooltip.
 * - Uses Material UI Paper, Chip, and Typography for consistent styling.
 * - Used in map overlays and POI detail popups.
 */
import CloseIcon from "@mui/icons-material/Close";
import { Chip, IconButton, Paper, Typography } from "@mui/material";
import { useTheme } from "@mui/material/styles";

interface POITooltipCardProps {
	labelText: string;
	componentName: string;
	fittingPositionId: string;
	onClose?: () => void;
}

/**
 * Renders a styled tooltip card for a POI marker, showing component, label, and ID.
 * Optionally includes a close button for dismissing the tooltip.
 * @param labelText The label text for the POI
 * @param componentName The component name
 * @param fittingPositionId The unique fitting position ID
 * @param onClose Optional handler for closing the tooltip
 */
function POITooltipCard({
	labelText,
	componentName,
	fittingPositionId,
	onClose,
}: POITooltipCardProps) {
	const theme = useTheme();
	return (
		<Paper
			elevation={5}
			sx={{
				px: 1.25,
				py: 1,
				bgcolor: theme.palette.background.paper,
				border: "1px solid",
				borderColor: theme.palette.divider,
				borderRadius: 1.5,
				minWidth: 160,
				maxWidth: 240,
			}}
		>
			{onClose ? (
				<Paper
					elevation={0}
					sx={{
						display: "flex",
						alignItems: "center",
						justifyContent: "space-between",
						gap: 1,
						bgcolor: "transparent",
					}}
				>
					<Chip
						label={componentName}
						size="small"
						variant="outlined"
						sx={{ mb: 0.75, maxWidth: 180 }}
					/>
					<IconButton
						size="small"
						onClick={onClose}
						aria-label="close tooltip"
						sx={{ ml: "auto", mt: -0.25 }}
					>
						<CloseIcon fontSize="inherit" />
					</IconButton>
				</Paper>
			) : (
				<Chip
					label={componentName}
					size="small"
					variant="outlined"
					sx={{ mb: 0.75, maxWidth: 180 }}
				/>
			)}
			<Typography variant="body2" sx={{ mt: 0.25, fontWeight: 600 }}>
				{labelText}
			</Typography>
			<Typography
				variant="caption"
				display="block"
				sx={{
					mt: 0.35,
					color: "text.secondary",
					fontFamily: theme.typography.monoFontFamily,
				}}
			>
				{fittingPositionId}
			</Typography>
		</Paper>
	);
}

export default POITooltipCard;
