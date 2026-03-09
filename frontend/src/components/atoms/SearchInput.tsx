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
