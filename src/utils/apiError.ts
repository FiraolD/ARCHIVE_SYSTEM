export interface ApiErrorDetails {
  status?: number;
  error?: string;
  message?: string;
  data?: Record<string, unknown>;
}

/** Safely extracts common fields from Axios-style errors without trusting the payload shape. */
export const getApiErrorDetails = (value: unknown): ApiErrorDetails => {
  if (typeof value !== 'object' || value === null) return {};

  const candidate = value as Record<string, unknown>;
  const response = typeof candidate.response === 'object' && candidate.response !== null
    ? candidate.response as Record<string, unknown>
    : undefined;
  const rawData = response && typeof response.data === 'object' && response.data !== null
    ? response.data as Record<string, unknown>
    : undefined;
  const error = typeof rawData?.error === 'string' ? rawData.error : undefined;
  const responseMessage = typeof rawData?.message === 'string' ? rawData.message : undefined;
  const message = typeof candidate.message === 'string' ? candidate.message : undefined;
  const status = typeof response?.status === 'number' ? response.status : undefined;

  return {
    status,
    error,
    message: error ?? responseMessage ?? message,
    data: rawData,
  };
};
