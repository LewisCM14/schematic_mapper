import {
	Box,
	Chip,
	CircularProgress,
	Container,
	Typography,
} from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { fetchHealth } from "./services/api/health";

function App() {
	const { data, isLoading, isError } = useQuery({
		queryKey: ["health"],
		queryFn: fetchHealth,
	});

	return (
		<Container maxWidth="sm" sx={{ mt: 8, textAlign: "center" }}>
			<Typography variant="h4" gutterBottom>
				Schematic Mapper
			</Typography>
			<Typography variant="body1" color="text.secondary" gutterBottom>
				API Health Check
			</Typography>
			<Box sx={{ mt: 3 }}>
				{isLoading && <CircularProgress />}
				{isError && <Chip label="API Unreachable" color="error" />}
				{data && (
					<Box sx={{ display: "flex", gap: 2, justifyContent: "center" }}>
						<Chip
							label={`API: ${data.status}`}
							color={data.status === "ok" ? "success" : "error"}
						/>
						<Chip
							label={`Database: ${data.database}`}
							color={data.database === "ok" ? "success" : "error"}
						/>
					</Box>
				)}
			</Box>
		</Container>
	);
}

export default App;
