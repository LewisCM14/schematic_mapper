import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import axios from "axios";
import { describe, expect, it, vi } from "vitest";
import { getUploadErrorMessage, useChunkedUpload } from "./useChunkedUpload";

// Helper to create a fake File
function makeFile(content = "abc", name = "file.txt") {
	return new File([content], name, { type: "text/plain" });
}

describe("useChunkedUpload", () => {
	function wrapper({ children }: { children: React.ReactNode }) {
		const client = new QueryClient({
			defaultOptions: { queries: { retry: false, gcTime: 0 } },
		});
		return (
			<QueryClientProvider client={client}>{children}</QueryClientProvider>
		);
	}

	it("reset sets all state to initial values", () => {
		const { result } = renderHook(() => useChunkedUpload(), { wrapper });
		act(() => {
			result.current[1].reset();
		});
		expect(result.current[0].progress).toBe(0);
		expect(result.current[0].error).toBe(null);
		expect(result.current[0].uploadId).toBe(null);
		expect(result.current[0].completedImageId).toBe(null);
	});

	it("getUploadErrorMessage handles axios error branch", () => {
		const error = {
			isAxiosError: true,
			response: { data: { error: "api error message" } },
		};
		const orig = axios.isAxiosError;
		axios.isAxiosError = (() => true) as unknown as typeof axios.isAxiosError;
		const msg = getUploadErrorMessage(error);
		expect(msg).toBe("api error message");
		axios.isAxiosError = orig;
	});

	it("getUploadErrorMessage handles Error instance fallback", () => {
		const err = new Error("fail msg");
		const orig = axios.isAxiosError;
		axios.isAxiosError = (() => false) as unknown as typeof axios.isAxiosError;
		expect(getUploadErrorMessage(err)).toBe("fail msg");
		axios.isAxiosError = orig;
	});

	it("getUploadErrorMessage handles unknown fallback", () => {
		const orig = axios.isAxiosError;
		axios.isAxiosError = (() => false) as unknown as typeof axios.isAxiosError;
		expect(getUploadErrorMessage(123)).toBe("Upload failed");
		axios.isAxiosError = orig;
	});

	it("abort does nothing if no uploadId", async () => {
		const { result } = renderHook(() => useChunkedUpload(), { wrapper });
		// Should not throw
		await act(async () => {
			await result.current[1].abort();
		});
		expect(result.current[0].uploadId).toBe(null);
	});

	it("isUploading reflects mutation state", () => {
		// We can't easily mock the mutation hooks, but we can check the default
		const { result } = renderHook(() => useChunkedUpload(), { wrapper });
		expect(result.current[0].isUploading).toBe(false);
	});

	it("start sets error on failure", async () => {
		vi.mock("./useAdminUpload", async () => {
			const actual =
				await vi.importActual<typeof import("./useAdminUpload")>(
					"./useAdminUpload",
				);
			return {
				...actual,
				useCreateUploadSession: () => ({
					isPending: false,
					mutateAsync: vi.fn().mockRejectedValue(new Error("fail")),
				}),
				useUploadChunk: () => ({
					isPending: false,
					mutateAsync: vi.fn(),
				}),
				useCompleteUpload: () => ({
					isPending: false,
					mutateAsync: vi.fn(),
				}),
				useAbortUpload: () => ({
					isPending: false,
					mutateAsync: vi.fn(),
				}),
			};
		});
		// Mock sha256Hex to avoid SubtleCrypto error
		vi.mock("../fileUtils", async () => {
			const actual =
				await vi.importActual<typeof import("../fileUtils")>("../fileUtils");
			return {
				...actual,
				sha256Hex: vi.fn().mockResolvedValue("checksum"),
			};
		});
		// Mock file.arrayBuffer to return a valid buffer
		const file = makeFile();
		file.arrayBuffer = async () => new ArrayBuffer(3);
		const { result } = renderHook(() => useChunkedUpload(), { wrapper });
		await act(async () => {
			await result.current[1].start({
				drawingTypeId: 1,
				componentName: "c",
				file,
				idempotencyKey: "k",
			});
		});
		expect(result.current[0].error).toBe("fail");
		vi.resetModules();
	});
});
