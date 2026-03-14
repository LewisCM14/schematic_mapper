/**
 * useAdminUpload.ts
 *
 * React Query mutation hooks for all admin upload and fitting position operations in the Schematic Mapper frontend.
 *
 * - Encapsulates all upload-related mutations (create session, upload chunk, complete, abort).
 * - Handles cache invalidation and prefetching for image and fitting position data after mutations.
 * - Ensures UI stays in sync with backend state after admin actions.
 *
 * Use these hooks in admin upload and mapping pages for robust, type-safe mutation flows.
 */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
	abortUpload,
	type BulkFittingPositionItem,
	type CreateUploadSessionParams,
	completeUpload,
	createUploadSession,
	deleteFittingPosition,
	fetchImage,
	saveBulkFittingPositions,
	uploadChunk,
} from "../endpoints";
import { queryKeys } from "../queryKeys";

/**
 * Mutation hook to create a new upload session (admin image upload).
 */
export function useCreateUploadSession() {
	return useMutation({
		mutationFn: (params: CreateUploadSessionParams) =>
			createUploadSession(params),
	});
}

/**
 * Mutation hook to upload a single chunk to an in-progress upload session.
 */
export function useUploadChunk() {
	return useMutation({
		mutationFn: ({
			uploadId,
			partNumber,
			chunkData,
		}: {
			uploadId: string;
			partNumber: number;
			chunkData: string;
		}) => uploadChunk(uploadId, partNumber, chunkData),
	});
}

/**
 * Mutation hook to complete an upload session (finalize and commit image).
 * Invalidates image list and prefetches the new image detail on success.
 */
export function useCompleteUpload() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({
			uploadId,
			idempotencyKey,
		}: {
			uploadId: string;
			idempotencyKey: string;
		}) => completeUpload(uploadId, idempotencyKey),
		onSuccess: (result) => {
			queryClient.invalidateQueries({ queryKey: queryKeys.images.all });
			void queryClient.prefetchQuery({
				queryKey: queryKeys.images.detail(result.image_id),
				queryFn: () => fetchImage(result.image_id),
			});
		},
	});
}

/**
 * Mutation hook to abort (cancel) an in-progress upload session.
 */
export function useAbortUpload() {
	return useMutation({
		mutationFn: (uploadId: string) => abortUpload(uploadId),
	});
}

/**
 * Mutation hook to save (bulk upsert) fitting positions for an image.
 * Invalidates fitting positions, search, and fitting-positions caches on success.
 */
export function useSaveBulkFittingPositions() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({
			imageId,
			fittingPositions,
		}: {
			imageId: string;
			fittingPositions: BulkFittingPositionItem[];
		}) => saveBulkFittingPositions(imageId, fittingPositions),
		onSuccess: (_data, variables) => {
			queryClient.invalidateQueries({
				queryKey: queryKeys.images.fittingPositions(variables.imageId),
			});
			queryClient.invalidateQueries({
				queryKey: ["search", variables.imageId],
			});
			queryClient.invalidateQueries({
				queryKey: ["fitting-positions"],
			});
		},
	});
}

/**
 * Mutation hook to delete a fitting position from an image.
 * Invalidates fitting positions, fitting position detail, and search caches on success.
 */
export function useDeleteFittingPosition() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({
			fittingPositionId,
		}: {
			fittingPositionId: string;
			imageId: string;
		}) => deleteFittingPosition(fittingPositionId),
		onSuccess: (_data, variables) => {
			queryClient.invalidateQueries({
				queryKey: queryKeys.images.fittingPositions(variables.imageId),
			});
			queryClient.invalidateQueries({
				queryKey: queryKeys.fittingPositions.detail(
					variables.fittingPositionId,
				),
			});
			queryClient.invalidateQueries({
				queryKey: ["search", variables.imageId],
			});
		},
	});
}
