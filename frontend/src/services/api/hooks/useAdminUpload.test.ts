import { useDeleteFittingPosition } from "./useAdminUpload";

describe("useDeleteFittingPosition", () => {
	it("calls DELETE /api/admin/fitting-positions/:id and succeeds", async () => {
		const { wrapper } = makeWrapper();
		const { result } = renderHook(() => useDeleteFittingPosition(), {
			wrapper,
		});
		result.current.mutate({ fittingPositionId: "fit-1", imageId: IMAGE_ID });
		await waitFor(() => expect(result.current.isSuccess).toBe(true));
	});

	it("invalidates fitting-positions and search queries on success", async () => {
		const { wrapper, queryClient } = makeWrapper();
		const spy = vi.spyOn(queryClient, "invalidateQueries");
		const { result } = renderHook(() => useDeleteFittingPosition(), {
			wrapper,
		});
		const fittingPositionId = "fit-1";
		result.current.mutate({ fittingPositionId, imageId: IMAGE_ID });
		await waitFor(() => expect(result.current.isSuccess).toBe(true));
		expect(spy).toHaveBeenCalledWith(
			expect.objectContaining({
				queryKey: queryKeys.images.fittingPositions(IMAGE_ID),
			}),
		);
		expect(spy).toHaveBeenCalledWith(
			expect.objectContaining({
				queryKey: queryKeys.fittingPositions.detail(fittingPositionId),
			}),
		);
		expect(spy).toHaveBeenCalledWith(
			expect.objectContaining({ queryKey: ["search", IMAGE_ID] }),
		);
	});
});

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { createElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { IMAGE_ID, UPLOAD_ID } from "../../../test/handlers";
import { queryKeys } from "../queryKeys";
import {
	useAbortUpload,
	useCompleteUpload,
	useCreateUploadSession,
	useSaveBulkFittingPositions,
} from "./useAdminUpload";

function makeWrapper() {
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false, gcTime: 0 } },
	});
	return {
		wrapper: ({ children }: { children: React.ReactNode }) =>
			createElement(QueryClientProvider, { client: queryClient }, children),
		queryClient,
	};
}

describe("useCreateUploadSession", () => {
	it("calls POST /api/admin/uploads and returns session", async () => {
		const { wrapper } = makeWrapper();
		const { result } = renderHook(() => useCreateUploadSession(), { wrapper });
		result.current.mutate({
			drawingTypeId: 1,
			componentName: "test",
			fileName: "test.svg",
			fileSize: 100,
			expectedChecksum: "abc",
			idempotencyKey: "key-1",
		});
		await waitFor(() => expect(result.current.isSuccess).toBe(true));
		expect(result.current.data?.upload_id).toBe(UPLOAD_ID);
	});
});

describe("useCompleteUpload", () => {
	it("calls POST /api/admin/uploads/:id/complete and returns result", async () => {
		const { wrapper } = makeWrapper();
		const { result } = renderHook(() => useCompleteUpload(), { wrapper });
		result.current.mutate({ uploadId: UPLOAD_ID, idempotencyKey: "key-1" });
		await waitFor(() => expect(result.current.isSuccess).toBe(true));
		expect(result.current.data?.image_id).toBe(IMAGE_ID);
		expect(result.current.data?.state).toBe("completed");
	});

	it("invalidates images list query on success", async () => {
		const { wrapper, queryClient } = makeWrapper();
		const spy = vi.spyOn(queryClient, "invalidateQueries");
		const { result } = renderHook(() => useCompleteUpload(), { wrapper });
		result.current.mutate({ uploadId: UPLOAD_ID, idempotencyKey: "key-1" });
		await waitFor(() => expect(result.current.isSuccess).toBe(true));
		expect(spy).toHaveBeenCalledWith(
			expect.objectContaining({ queryKey: queryKeys.images.all }),
		);
	});
});

describe("useAbortUpload", () => {
	it("calls DELETE /api/admin/uploads/:id", async () => {
		const { wrapper } = makeWrapper();
		const { result } = renderHook(() => useAbortUpload(), { wrapper });
		result.current.mutate(UPLOAD_ID);
		await waitFor(() => expect(result.current.isSuccess).toBe(true));
	});
});

describe("useSaveBulkFittingPositions", () => {
	it("calls POST /api/admin/fitting-positions/bulk and returns counts", async () => {
		const { wrapper } = makeWrapper();
		const { result } = renderHook(() => useSaveBulkFittingPositions(), {
			wrapper,
		});
		result.current.mutate({ imageId: IMAGE_ID, fittingPositions: [] });
		await waitFor(() => expect(result.current.isSuccess).toBe(true));
		expect(result.current.data?.created).toBe(0);
		expect(result.current.data?.updated).toBe(0);
	});

	it("invalidates fitting-positions query on success", async () => {
		const { wrapper, queryClient } = makeWrapper();
		const spy = vi.spyOn(queryClient, "invalidateQueries");
		const { result } = renderHook(() => useSaveBulkFittingPositions(), {
			wrapper,
		});
		result.current.mutate({ imageId: IMAGE_ID, fittingPositions: [] });
		await waitFor(() => expect(result.current.isSuccess).toBe(true));
		expect(spy).toHaveBeenCalledWith(
			expect.objectContaining({
				queryKey: queryKeys.images.fittingPositions(IMAGE_ID),
			}),
		);
	});

	it("invalidates search queries for image on success", async () => {
		const { wrapper, queryClient } = makeWrapper();
		const spy = vi.spyOn(queryClient, "invalidateQueries");
		const { result } = renderHook(() => useSaveBulkFittingPositions(), {
			wrapper,
		});
		result.current.mutate({ imageId: IMAGE_ID, fittingPositions: [] });
		await waitFor(() => expect(result.current.isSuccess).toBe(true));
		expect(spy).toHaveBeenCalledWith(
			expect.objectContaining({ queryKey: ["search", IMAGE_ID] }),
		);
	});
});
