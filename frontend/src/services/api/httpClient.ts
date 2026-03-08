import axios, { type AxiosError } from "axios";

const httpClient = axios.create({
	baseURL: "/api",
	headers: { "Content-Type": "application/json" },
});

httpClient.interceptors.request.use((config) => {
	config.headers["X-Request-ID"] = crypto.randomUUID();
	return config;
});

httpClient.interceptors.response.use(
	(response) => response,
	(error: AxiosError) => {
		if (
			error.response?.status === 401 ||
			error.response?.status === 403
		) {
			console.warn(
				`Auth error ${error.response.status}: ${error.config?.url}`,
			);
			return Promise.resolve(error.response);
		}
		return Promise.reject(error);
	},
);

export default httpClient;
