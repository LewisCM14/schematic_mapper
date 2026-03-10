import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import { lazy, Suspense } from "react";
import { ErrorBoundary, type FallbackProps } from "react-error-boundary";
import { Route, Routes } from "react-router-dom";

const ImageSelectionPage = lazy(() => import("./pages/ImageSelectionPage"));
const ImageViewerPage = lazy(() => import("./pages/ImageViewerPage"));
const AdminUploadMappingPage = lazy(
	() => import("./pages/AdminUploadMappingPage"),
);

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

function PageLoader() {
	return (
		<Box sx={{ display: "flex", justifyContent: "center", mt: 8 }}>
			<CircularProgress />
		</Box>
	);
}

function App() {
	return (
		<Suspense fallback={<PageLoader />}>
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
							<AdminUploadMappingPage />
						</ErrorBoundary>
					}
				/>
			</Routes>
		</Suspense>
	);
}

export default App;
