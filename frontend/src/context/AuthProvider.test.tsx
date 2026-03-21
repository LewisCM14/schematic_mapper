import { render, screen, waitFor } from "@testing-library/react";
import { AuthProvider, useAuth } from "./AuthProvider";
import type { UserInfo } from "../services/api/user";
import { fetchUserInfo } from "../services/api/user";

import { vi, type MockedFunction } from "vitest";
vi.mock("../services/api/user", () => ({
	fetchUserInfo: vi.fn(),
}));

function TestComponent() {
	const { user, loading, error } = useAuth();
	if (loading) return <div>Loading...</div>;
	if (error) return <div>Error: {error}</div>;
	if (!user) return <div>No user</div>;
	return (
		<div>
			<span data-testid="identity">{user.user_identity}</span>
			<span data-testid="role">{user.user_role}</span>
		</div>
	);
}

describe("AuthProvider", () => {
	afterEach(() => {
		vi.clearAllMocks();
	});

	it("renders user info when fetch succeeds", async () => {
		(fetchUserInfo as MockedFunction<typeof fetchUserInfo>).mockResolvedValue({
			user_identity: "testuser",
			user_role: "admin",
		} as UserInfo);
		render(
			<AuthProvider>
				<TestComponent />
			</AuthProvider>,
		);
		expect(screen.getByText("Loading...")).toBeInTheDocument();
		await waitFor(() => {
			expect(screen.getByTestId("identity")).toHaveTextContent("testuser");
			expect(screen.getByTestId("role")).toHaveTextContent("admin");
		});
	});

	it("renders error if fetch fails", async () => {
		(fetchUserInfo as MockedFunction<typeof fetchUserInfo>).mockRejectedValue(
			new Error("fail"),
		);
		render(
			<AuthProvider>
				<TestComponent />
			</AuthProvider>,
		);
		expect(screen.getByText("Loading...")).toBeInTheDocument();
		await waitFor(() => {
			expect(screen.getByText(/Error: fail/)).toBeInTheDocument();
		});
	});
});
