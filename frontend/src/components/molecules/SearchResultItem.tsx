import { Box, ListItemButton, ListItemText, Typography } from "@mui/material";
import type { SearchResultItem } from "../../services/api/schemas";
import TypeBadge from "../atoms/TypeBadge";

interface SearchResultItemProps {
	result: SearchResultItem;
	onSelect: (result: SearchResultItem) => void;
}

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
						<TypeBadge drawingType={result.match_type} />
						<TypeBadge drawingType={result.matched_source} />
					</Box>
				}
			/>
		</ListItemButton>
	);
}

export default SearchResultItemComponent;
