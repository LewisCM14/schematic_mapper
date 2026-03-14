/**
 * SearchInput.tsx
 *
 * Reusable search input field with icon adornments and clear button for the Schematic Mapper frontend.
 *
 * - Wraps Material UI TextField for consistent styling and accessibility.
 * - Shows a search icon at the start and a clear button at the end (when value is present).
 * - Supports loading/disabled state and custom label.
 *
 * Use in search bars, filters, and autocomplete components.
 */
import ClearIcon from "@mui/icons-material/Clear";
import SearchIcon from "@mui/icons-material/Search";
import { IconButton, InputAdornment, TextField } from "@mui/material";

interface SearchInputProps {
	value: string;
	onChange: (value: string) => void;
	label?: string;
	loading?: boolean;
	onClear?: () => void;
}

/**
 * Renders a search input with icon and clear button.
 * @param value The current input value
 * @param onChange Handler for input changes
 * @param label Optional label (default: "Search")
 * @param loading Optional loading/disabled state
 * @param onClear Optional handler for clearing the input
 */
function SearchInput({
	value,
	onChange,
	label = "Search",
	loading,
	onClear,
}: SearchInputProps) {
	return (
		<TextField
			fullWidth
			size="small"
			label={label}
			value={value}
			onChange={(e) => onChange(e.target.value)}
			disabled={loading}
			slotProps={{
				input: {
					startAdornment: (
						<InputAdornment position="start">
							<SearchIcon fontSize="small" />
						</InputAdornment>
					),
					endAdornment:
						value && onClear ? (
							<InputAdornment position="end">
								<IconButton
									size="small"
									onClick={onClear}
									aria-label="clear search"
									edge="end"
								>
									<ClearIcon fontSize="small" />
								</IconButton>
							</InputAdornment>
						) : undefined,
				},
			}}
			inputProps={{ "aria-label": label.toLowerCase() }}
		/>
	);
}

export default SearchInput;
