import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import { ErrorBoundary, type FallbackProps } from "react-error-boundary";
import { Route, Routes } from "react-router-dom";
import AdminPage from "./pages/AdminPage";
import ImageSelectionPage from "./pages/ImageSelectionPage";
import ImageViewerPage from "./pages/ImageViewerPage";

function ErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
	return (
		<Alert
			severity="error"
			action={
				<Button color="inherit" size="small" onClick={resetErrorBoundary}>
					Retry
				</Button>
			}
		>
			{error instanceof Error ? error.message : "An unexpected error occurred."}
		</Alert>
	);
}

function App() {
	return (
		<Routes>
			<Route
				path="/"
				element={
					<ErrorBoundary FallbackComponent={ErrorFallback}>
						<ImageSelectionPage />
					</ErrorBoundary>
				}
			/>
			<Route
				path="/viewer/:imageId"
				element={
					<ErrorBoundary FallbackComponent={ErrorFallback}>
						<ImageViewerPage />
					</ErrorBoundary>
				}
			/>
			<Route
				path="/admin"
				element={
					<ErrorBoundary FallbackComponent={ErrorFallback}>
						<AdminPage />
					</ErrorBoundary>
				}
			/>
		</Routes>
	);
}

export default App;
