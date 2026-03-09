import { Chip, Tooltip } from "@mui/material";

interface SourceFilterChipsProps {
	availableSources: string[];
	disabledSources?: string[];
	selectedSources: string[];
	onToggle: (source: string) => void;
}

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
