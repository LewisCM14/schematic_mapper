import { render, screen } from "@testing-library/react";
import { vi, type Mock } from "vitest";
import { ProtectedRoute } from "./ProtectedRoute";
import { useAuth } from "../context/AuthProvider";

// Mock useAuth
vi.mock("../context/AuthProvider", () => ({
	useAuth: vi.fn(),
}));

function TestChild() {
	return <div>Protected Content</div>;
}

describe("ProtectedRoute", () => {
	afterEach(() => {
		vi.clearAllMocks();
	});

	it("renders loader when loading", () => {
		(useAuth as Mock).mockReturnValue({
			loading: true,
			error: undefined,
			user: undefined,
		});
		render(
			<ProtectedRoute requiredRole="admin">
				<TestChild />
			</ProtectedRoute>,
		);
		expect(screen.getByRole("progressbar")).toBeInTheDocument();
	});

	it("renders error if useAuth returns error", () => {
		(useAuth as Mock).mockReturnValue({
			loading: false,
			error: "fail",
			user: undefined,
		});
		render(
			<ProtectedRoute requiredRole="admin">
				<TestChild />
			</ProtectedRoute>,
		);
		expect(screen.getByText("fail")).toBeInTheDocument();
	});

	it("denies access if user is not present", () => {
		(useAuth as Mock).mockReturnValue({
			loading: false,
			error: null,
			user: null,
		});
		render(
			<ProtectedRoute requiredRole="admin">
				<TestChild />
			</ProtectedRoute>,
		);
		expect(screen.getByText(/Access denied/i)).toBeInTheDocument();
	});

	it("denies access if user role does not match", () => {
		(useAuth as Mock).mockReturnValue({
			loading: false,
			error: null,
			user: { user_identity: "bob", user_role: "viewer" },
		});
		render(
			<ProtectedRoute requiredRole="admin">
				<TestChild />
			</ProtectedRoute>,
		);
		expect(screen.getByText(/Access denied/i)).toBeInTheDocument();
	});

	it("renders children if user role matches", () => {
		(useAuth as Mock).mockReturnValue({
			loading: false,
			error: null,
			user: { user_identity: "alice", user_role: "admin" },
		});
		render(
			<ProtectedRoute requiredRole="admin">
				<TestChild />
			</ProtectedRoute>,
		);
		expect(screen.getByText("Protected Content")).toBeInTheDocument();
	});

	it("allows viewer if requiredRole is viewer", () => {
		(useAuth as Mock).mockReturnValue({
			loading: false,
			error: null,
			user: { user_identity: "eve", user_role: "viewer" },
		});
		render(
			<ProtectedRoute requiredRole="viewer">
				<TestChild />
			</ProtectedRoute>,
		);
		expect(screen.getByText("Protected Content")).toBeInTheDocument();
	});
});
