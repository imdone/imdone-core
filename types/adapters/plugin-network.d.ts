export function pluginNetworkError(host: any, reason: any, detail?: string): Error;
export function pluginRequestTimeout(host: any, deadlineAt?: number): number;
export const PLUGIN_REQUEST_TIMEOUT_MS: 10000;
export const PLUGIN_DISCOVERY_TIMEOUT_MS: 30000;
