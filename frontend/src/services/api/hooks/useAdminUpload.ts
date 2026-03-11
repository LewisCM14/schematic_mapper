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

export function useCreateUploadSession() {
	return useMutation({
		mutationFn: (params: CreateUploadSessionParams) =>
			createUploadSession(params),
	});
}

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

export function useAbortUpload() {
	return useMutation({
		mutationFn: (uploadId: string) => abortUpload(uploadId),
	});
}

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
				queryKey: queryKeys.fittingPositions.detail(variables.fittingPositionId),
			});
			queryClient.invalidateQueries({
				queryKey: ["search", variables.imageId],
			});
		},
	});
}
