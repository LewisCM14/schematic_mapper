/**
 * AuthProvider.tsx
 *
 * Provides authentication and user role information to the React app using the Context API.
 *
 * - Fetches the current user's identity and role from the backend (/api/user).
 * - Makes user info, loading, and error state available to all components via a context.
 * - Use the `useAuth()` hook in any component to access the current user, loading, and error state.
 *
 * Usage:
 *   1. Wrap your app in <AuthProvider> (usually in App.tsx).
 *   2. Call `const { user, loading, error } = useAuth()` in any component to get user info.
 *
 * Example:
 *   <AuthProvider>
 *     <App />
 *   </AuthProvider>
 *
 *   // In a component:
 *   const { user, loading, error } = useAuth();
 *   if (loading) return <Spinner />;
 *   if (user?.user_role === "admin") { ... }
 *
 * This pattern helps manage authentication state in a single place and makes it easy to show/hide UI based on user roles.
 */
import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { fetchUserInfo } from "../services/api/user";
import type { UserInfo } from "../services/api/user";

/**
 * The shape of the authentication context value.
 * - user: The current user's info (or null if not loaded or not authenticated)
 * - loading: True while user info is being fetched
 * - error: Any error message from fetching user info
 */
interface AuthContextValue {
	user: UserInfo | null;
	loading: boolean;
	error: string | null;
}

// Create the context with an initial value of undefined (enforced by the provider)
const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/**
 * AuthProvider component
 *
 * Fetches user info from the backend and provides it to all child components.
 * Should wrap your entire app (in App.tsx).
 */
export function AuthProvider({ children }: { children: ReactNode }) {
	const [user, setUser] = useState<UserInfo | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let isMounted = true;
		setLoading(true);
		fetchUserInfo()
			.then((data) => {
				if (isMounted) {
					setUser(data);
					setError(null);
				}
			})
			.catch((err) => {
				if (isMounted) {
					setUser(null);
					setError(err instanceof Error ? err.message : String(err));
				}
			})
			.finally(() => {
				if (isMounted) setLoading(false);
			});
		return () => {
			isMounted = false;
		};
	}, []);

	return (
		<AuthContext.Provider value={{ user, loading, error }}>
			{children}
		</AuthContext.Provider>
	);
}

/**
 * useAuth hook
 *
 * Returns the current authentication context (user, loading, error).
 * Must be used inside a component wrapped by <AuthProvider>.
 */
export function useAuth() {
	const ctx = useContext(AuthContext);
	if (ctx === undefined) {
		throw new Error("useAuth must be used within an AuthProvider");
	}
	return ctx;
}
