import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
	abortUpload,
	type BulkFittingPositionItem,
	type CreateUploadSessionParams,
	completeUpload,
	createUploadSession,
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
	return useMutation({
		mutationFn: ({
			uploadId,
			idempotencyKey,
		}: {
			uploadId: string;
			idempotencyKey: string;
		}) => completeUpload(uploadId, idempotencyKey),
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
		},
	});
}
