import type React from "react";
import Alert from "@mui/material/Alert";

import { useAuth } from "../context/AuthProvider";
import { PageLoader } from "../App";

/**
 * ProtectedRoute
 *
 * Restricts access to children based on user role.
 * Only allows access to users with the required role (e.g., "admin").
 *
 * Props:
 *   - requiredRole: "admin" | "viewer" (default: "admin")
 *   - children: ReactNode (the protected content)
 *
 * Usage:
 *   <ProtectedRoute requiredRole="admin">...</ProtectedRoute>
 */
export function ProtectedRoute({
	requiredRole = "admin",
	children,
}: {
	requiredRole?: "admin" | "viewer";
	children: React.ReactNode;
}) {
	const { user, loading, error } = useAuth();
	if (loading) return <PageLoader />;
	if (error) {
		return (
			<Alert severity="error" sx={{ mt: 8 }}>
				{error}
			</Alert>
		);
	}
	if (!user || user.user_role !== requiredRole) {
		return (
			<Alert severity="error" sx={{ mt: 8 }}>
				Access denied:{" "}
				{requiredRole.charAt(0).toUpperCase() + requiredRole.slice(1)}s only
			</Alert>
		);
		// Optionally, redirect:
		// return <Navigate to="/" replace />;
	}
	return <>{children}</>;
}
