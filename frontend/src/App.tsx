/**
 * App.tsx
 *
 * Main application entry point for the Schematic Mapper frontend (React).
 *
 * - Sets up top-level routing for all pages (image selection, viewer, admin upload).
 * - Uses React Router v6 for client-side navigation.
 * - Implements code-splitting with React.lazy and Suspense for performance.
 * - Wraps each route in an ErrorBoundary for robust error handling.
 * - Uses Material UI for UI components and consistent styling.
 *
 * Key routes:
 *   /           → ImageSelectionPage
 *   /viewer/:id → ImageViewerPage
 *   /admin      → AdminUploadMappingPage
 *
 * All routes are lazy-loaded and display a loading spinner while loading.
 * Any uncaught error in a page is shown as a dismissible alert with retry.
 */

import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import { lazy, Suspense } from "react";
import { ErrorBoundary, type FallbackProps } from "react-error-boundary";
import { Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthProvider";

const ImageSelectionPage = lazy(() => import("./pages/ImageSelectionPage"));
const ImageViewerPage = lazy(() => import("./pages/ImageViewerPage"));
const AdminUploadMappingPage = lazy(
	() => import("./pages/AdminUploadMappingPage"),
);

import { ProtectedRoute } from "./routes/ProtectedRoute";

/**
 * Fallback UI for error boundaries.
 * Displays an error alert with a retry button when a child component throws.
 * @param error The error thrown by a child component
 * @param resetErrorBoundary Function to reset the error boundary state
 */
export function ErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
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

/**
 * Loader UI shown while a page is being lazy-loaded.
 * Displays a centered Material UI spinner.
 */
export function PageLoader() {
	return (
		<Box sx={{ display: "flex", justifyContent: "center", mt: 8 }}>
			<CircularProgress />
		</Box>
	);
}

/**
 * Main application component.
 * Sets up all routes and error boundaries for the Schematic Mapper frontend.
 *
 * - Uses React Router v6 for navigation.
 * - Each page is lazy-loaded for performance.
 * - ErrorBoundary ensures user-friendly error handling per route.
 * - PageLoader is shown while loading each page.
 */
function App() {
	return (
		<AuthProvider>
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
								<ProtectedRoute requiredRole="admin">
									<AdminUploadMappingPage />
								</ProtectedRoute>
							</ErrorBoundary>
						}
					/>
				</Routes>
			</Suspense>
		</AuthProvider>
	);
}

export default App;
