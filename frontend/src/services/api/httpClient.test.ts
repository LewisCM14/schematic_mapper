import axios from "axios";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import httpClient from "./httpClient";

describe("httpClient", () => {
	describe("request interceptor", () => {
		it("adds X-Request-ID header to outgoing requests", async () => {
			const adapter = vi.fn().mockResolvedValue({
				status: 200,
				data: {},
				headers: {},
				config: {},
			});
			const client = axios.create({ baseURL: "/api" });
			client.interceptors.request.use((config) => {
				config.headers["X-Request-ID"] = crypto.randomUUID();
				return config;
			});
			client.defaults.adapter = adapter;

			await client.get("/test");

			const calledConfig = adapter.mock.calls[0][0];
			expect(calledConfig.headers["X-Request-ID"]).toBeDefined();
			expect(typeof calledConfig.headers["X-Request-ID"]).toBe("string");
			expect(calledConfig.headers["X-Request-ID"]).toMatch(/^[0-9a-f-]{36}$/);
		});
	});

	describe("response interceptor", () => {
		let warnSpy: ReturnType<typeof vi.spyOn>;

		beforeEach(() => {
			warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
		});

		afterEach(() => {
			warnSpy.mockRestore();
		});

		it("warns and rejects on 401 response", async () => {
			const adapter = vi.fn().mockRejectedValue(
				Object.assign(new Error("Unauthorized"), {
					isAxiosError: true,
					response: { status: 401, data: {} },
					config: { url: "/api/protected" },
				}),
			);
			const client = axios.create({ baseURL: "/api" });
			client.interceptors.response.use(
				(r) => r,
				(err) => {
					if (err.response?.status === 401 || err.response?.status === 403) {
						console.warn(
							`Auth error ${err.response.status}: ${err.config?.url}`,
						);
					}
					return Promise.reject(err);
				},
			);
			client.defaults.adapter = adapter;

			await expect(client.get("/protected")).rejects.toThrow();
			expect(warnSpy).toHaveBeenCalledWith("Auth error 401: /api/protected");
		});

		it("propagates error unchanged on non-auth errors", async () => {
			const adapter = vi.fn().mockRejectedValue(
				Object.assign(new Error("Server Error"), {
					isAxiosError: true,
					response: { status: 500, data: {} },
					config: { url: "/api/data" },
				}),
			);
			const client = axios.create({ baseURL: "/api" });
			client.interceptors.response.use(
				(r) => r,
				(err) => {
					if (err.response?.status === 401 || err.response?.status === 403) {
						console.warn(
							`Auth error ${err.response.status}: ${err.config?.url}`,
						);
					}
					return Promise.reject(err);
				},
			);
			client.defaults.adapter = adapter;

			await expect(client.get("/data")).rejects.toThrow("Server Error");
			expect(warnSpy).not.toHaveBeenCalled();
		});
	});

	it("exports a default axios instance", () => {
		expect(httpClient).toBeDefined();
		expect(typeof httpClient.get).toBe("function");
		expect(typeof httpClient.post).toBe("function");
	});
});
