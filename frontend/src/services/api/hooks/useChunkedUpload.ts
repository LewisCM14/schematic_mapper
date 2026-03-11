/**
 * Orchestrates the multi-step chunked upload workflow:
 * create session → upload chunks → finalize.
 */

import { useState } from "react";
import axios from "axios";
import { UPLOAD_CHUNK_SIZE } from "../config";
import { arrayBufferToBase64, sha256Hex } from "../fileUtils";
import {
	useAbortUpload,
	useCompleteUpload,
	useCreateUploadSession,
	useUploadChunk,
} from "./useAdminUpload";

export interface ChunkedUploadState {
	progress: number;
	error: string | null;
	uploadId: string | null;
	completedImageId: string | null;
	isUploading: boolean;
	showAbort: boolean;
}

export interface ChunkedUploadActions {
	/** Run the full create → chunk → finalize flow. */
	start: (params: {
		drawingTypeId: number;
		componentName: string;
		file: File;
		idempotencyKey: string;
	}) => Promise<void>;
	/** Abort an in-progress upload session. */
	abort: () => Promise<void>;
	/** Reset local state for a new upload. */
	reset: () => void;
}

export function useChunkedUpload(): [ChunkedUploadState, ChunkedUploadActions] {
	const [progress, setProgress] = useState(0);
	const [error, setError] = useState<string | null>(null);
	const [uploadId, setUploadId] = useState<string | null>(null);
	const [completedImageId, setCompletedImageId] = useState<string | null>(null);

	const createSession = useCreateUploadSession();
	const uploadChunkMut = useUploadChunk();
	const completeUploadMut = useCompleteUpload();
	const abortUploadMut = useAbortUpload();

	const isUploading =
		createSession.isPending ||
		uploadChunkMut.isPending ||
		completeUploadMut.isPending;

	function getUploadErrorMessage(error: unknown): string {
		if (axios.isAxiosError(error)) {
			const apiError = error.response?.data;
			if (
				apiError &&
				typeof apiError === "object" &&
				"error" in apiError &&
				typeof apiError.error === "string"
			) {
				return apiError.error;
			}
		}
		return error instanceof Error ? error.message : "Upload failed";
	}

	async function start({
		drawingTypeId,
		componentName,
		file,
		idempotencyKey,
	}: {
		drawingTypeId: number;
		componentName: string;
		file: File;
		idempotencyKey: string;
	}): Promise<void> {
		setError(null);
		setProgress(0);

		try {
			const buffer = await file.arrayBuffer();
			const checksum = await sha256Hex(buffer);

			const session = await createSession.mutateAsync({
				drawingTypeId,
				componentName,
				fileName: file.name,
				fileSize: file.size,
				expectedChecksum: checksum,
				idempotencyKey,
			});
			setUploadId(session.upload_id);

			const totalChunks = Math.ceil(buffer.byteLength / UPLOAD_CHUNK_SIZE);
			for (let i = 0; i < totalChunks; i++) {
				const start = i * UPLOAD_CHUNK_SIZE;
				const end = Math.min(start + UPLOAD_CHUNK_SIZE, buffer.byteLength);
				const chunk = buffer.slice(start, end);
				const chunkB64 = arrayBufferToBase64(chunk);
				await uploadChunkMut.mutateAsync({
					uploadId: session.upload_id,
					partNumber: i + 1,
					chunkData: chunkB64,
				});
				setProgress(Math.round(((i + 1) / totalChunks) * 90));
			}

			const result = await completeUploadMut.mutateAsync({
				uploadId: session.upload_id,
				idempotencyKey,
			});
			setCompletedImageId(result.image_id);
			setProgress(100);
		} catch (err) {
			setError(getUploadErrorMessage(err));
		}
	}

	async function abort(): Promise<void> {
		if (!uploadId) return;
		await abortUploadMut.mutateAsync(uploadId);
		setUploadId(null);
		setProgress(0);
		setError(null);
	}

	function reset(): void {
		setUploadId(null);
		setProgress(0);
		setError(null);
		setCompletedImageId(null);
	}

	return [
		{
			progress,
			error,
			uploadId,
			completedImageId,
			isUploading,
			showAbort: Boolean(uploadId),
		},
		{ start, abort, reset },
	];
}
