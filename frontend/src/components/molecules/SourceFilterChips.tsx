/**
 * SourceFilterChips.tsx
 *
 * Renders a set of filter chips for toggling data sources in a search or filter UI.
 *
 * - Displays available sources as interactive chips (selectable/deselectable).
 * - Disabled sources are shown with a tooltip and cannot be selected.
 * - Used for filtering search results or data by source type.
 */
import { Chip, Tooltip } from "@mui/material";

interface SourceFilterChipsProps {
	availableSources: string[];
	disabledSources?: string[];
	selectedSources: string[];
	onToggle: (source: string) => void;
}

/**
 * Renders filter chips for available and disabled sources, allowing toggling of selected sources.
 * @param availableSources List of sources that can be toggled
 * @param disabledSources List of sources that are disabled (optional)
 * @param selectedSources List of currently selected sources
 * @param onToggle Callback invoked when a source chip is toggled
 */
function SourceFilterChips({
	availableSources,
	disabledSources = [],
	selectedSources,
	onToggle,
}: SourceFilterChipsProps) {
	return (
		<>
			{availableSources.map((source) => (
				<Chip
					key={source}
					label={source}
					size="small"
					variant={selectedSources.includes(source) ? "filled" : "outlined"}
					color={selectedSources.includes(source) ? "primary" : "default"}
					onClick={() => onToggle(source)}
					aria-pressed={selectedSources.includes(source)}
				/>
			))}
			{disabledSources.map((source) => (
				<Tooltip
					key={source}
					title={`${source.charAt(0).toUpperCase() + source.slice(1)} source is unavailable in the prototype`}
				>
					<span>
						<Chip label={source} size="small" variant="outlined" disabled />
					</span>
				</Tooltip>
			))}
		</>
	);
}

export default SourceFilterChips;
