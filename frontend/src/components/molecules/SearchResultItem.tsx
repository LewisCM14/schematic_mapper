/**
 * SearchResultItem.tsx
 *
 * Renders a clickable list item representing a single search result.
 *
 * - Displays the result label, component name, match type, and matched source.
 * - Highlights match type with a colored chip (exact, prefix, or default).
 * - Invokes the provided onSelect callback when clicked.
 * - Used in search result lists and autocomplete dropdowns.
 */
import {
	Box,
	Chip,
	ListItemButton,
	ListItemText,
	Typography,
} from "@mui/material";
import type { SearchResultItem } from "../../services/api/schemas";

interface SearchResultItemProps {
	result: SearchResultItem;
	onSelect: (result: SearchResultItem) => void;
}

/**
 * Renders a clickable list item for a search result, showing label, component, match type, and source.
 * @param result The search result data to display
 * @param onSelect Callback invoked when the item is clicked
 */
function SearchResultItemComponent({
	result,
	onSelect,
}: SearchResultItemProps) {
	return (
		<ListItemButton onClick={() => onSelect(result)}>
			<ListItemText
				primary={result.label_text}
				secondaryTypographyProps={{ component: "span" }}
				secondary={
					<Box
						component="span"
						sx={{ display: "flex", gap: 0.5, flexWrap: "wrap", mt: 0.5 }}
					>
						<Typography
							component="span"
							variant="caption"
							color="text.secondary"
							sx={{ display: "block", width: "100%" }}
						>
							{result.component_name}
						</Typography>
						<Chip
							label={result.match_type}
							size="small"
							color={
								result.match_type === "exact"
									? "success"
									: result.match_type === "prefix"
										? "info"
										: "default"
							}
						/>
						<Typography
							component="span"
							variant="caption"
							color="text.secondary"
						>
							via {result.matched_source}
						</Typography>
					</Box>
				}
			/>
		</ListItemButton>
	);
}

export default SearchResultItemComponent;
