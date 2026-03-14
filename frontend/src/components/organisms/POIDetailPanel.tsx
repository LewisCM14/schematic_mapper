/**
 * POIDetailPanel.tsx
 *
 * Displays detailed information for a selected fitting position (POI) on the diagram.
 *
 * - Fetches and shows fitting position details, including asset info and coordinates.
 * - Handles loading, error, and degraded data states.
 * - Used in side panels or dialogs for POI inspection.
 */
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import {
	Alert,
	Box,
	CircularProgress,
	Divider,
	Typography,
} from "@mui/material";
import { useFittingPositionDetails } from "../../services/api/hooks/useFittingPositionDetails";
import SectionLabel from "../atoms/SectionLabel";
import DetailFieldRow from "../molecules/DetailFieldRow";

interface POIDetailPanelProps {
	fittingPositionId: string | null;
}

/**
 * Renders a detail panel for a selected fitting position (POI), showing asset and coordinate info.
 * Handles loading, error, and degraded data states.
 * @param fittingPositionId The ID of the fitting position to display details for
 */
function POIDetailPanel({ fittingPositionId }: POIDetailPanelProps) {
	const { data, isLoading, isError } =
		useFittingPositionDetails(fittingPositionId);

	if (!fittingPositionId) {
		return (
			<Box sx={{ p: 2 }}>
				<Typography variant="body2" color="text.secondary">
					Click a marker on the diagram to view details.
				</Typography>
			</Box>
		);
	}

	if (isLoading) {
		return (
			<Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
				<CircularProgress size={28} />
			</Box>
		);
	}

	if (isError || !data) {
		return (
			<Box sx={{ p: 2 }}>
				<Alert severity="error">Failed to load fitting position details.</Alert>
			</Box>
		);
	}

	const isDegraded = data.source_status.asset === "degraded";

	return (
		<Box sx={{ p: 2 }}>
			<Typography variant="subtitle2" gutterBottom>
				{data.label_text}
			</Typography>
			<Typography
				variant="caption"
				color="text.secondary"
				display="block"
				sx={{ mb: 2 }}
			>
				({data.x_coordinate}, {data.y_coordinate})
			</Typography>

			{isDegraded && (
				<Alert
					severity="warning"
					icon={<WarningAmberIcon fontSize="small" />}
					sx={{ mb: 2 }}
				>
					Asset source unavailable — partial data shown.
				</Alert>
			)}

			{data.asset ? (
				<>
					<SectionLabel>Asset Information</SectionLabel>
					<Divider sx={{ mb: 1 }} />
					<Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
						<DetailFieldRow
							label="Record ID"
							value={data.asset.asset_record_id}
						/>
						<DetailFieldRow
							label="High-Level Component"
							value={data.asset.high_level_component}
						/>
						<DetailFieldRow
							label="Sub-System"
							value={data.asset.sub_system_name}
						/>
						<DetailFieldRow
							label="Sub-Component"
							value={data.asset.sub_component_name}
						/>
					</Box>
				</>
			) : (
				<Typography variant="body2" color="text.secondary">
					{isDegraded
						? "Asset data could not be retrieved."
						: "No asset record linked to this fitting position."}
				</Typography>
			)}
		</Box>
	);
}

export default POIDetailPanel;
