/**
 * main.tsx
 *
 * Application bootstrap for the Schematic Mapper frontend (React).
 *
 * - Sets up the React root and renders the application into the #root element.
 * - Wraps the app with providers for React Query, React Router, Material UI theme, and StrictMode.
 * - Ensures consistent baseline CSS and theme across the app.
 * - Throws a clear error if the root element is missing (should never happen in a valid index.html).
 *
 * Providers:
 *   - StrictMode: Highlights potential problems in development.
 *   - ThemeProvider: Applies the custom Material UI theme.
 *   - CssBaseline: Resets and normalizes CSS for cross-browser consistency.
 *   - BrowserRouter: Enables client-side routing.
 *   - QueryClientProvider: Enables TanStack React Query for data fetching/caching.
 *
 * Entry point for the entire frontend application.
 */
import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider } from "@mui/material/styles";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.tsx";
import theme from "./theme.ts";

// Create a single React Query client instance for the app
const queryClient = new QueryClient();

// Get the root DOM element where the app will be mounted
const rootElement = document.getElementById("root");

if (!rootElement) {
	// Fail fast if the root element is missing (should not happen in production)
	throw new Error("Root element not found");
}

// Render the React application, wrapping with all required providers
createRoot(rootElement).render(
	<StrictMode>
		{/* Material UI theme and CSS baseline */}
		<ThemeProvider theme={theme}>
			<CssBaseline />
			{/* React Router for client-side navigation */}
			<BrowserRouter>
				{/* React Query for data fetching and caching */}
				<QueryClientProvider client={queryClient}>
					<App />
				</QueryClientProvider>
			</BrowserRouter>
		</ThemeProvider>
	</StrictMode>,
);
