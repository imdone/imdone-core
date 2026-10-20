export const PLUGIN_REQUEST_TIMEOUT_MS = 10000;
export const PLUGIN_DISCOVERY_TIMEOUT_MS = 30000;

export function pluginNetworkError(host, reason, detail = '') {
  const error = new Error(`Plugin request to ${host} ${detail || reason.toLowerCase().replaceAll('_', ' ')}. Check network access, proxy/Zscaler settings, and GitHub access, then retry.`);
  error.code = `IMDONE_PLUGIN_${reason}`;
  return error;
}

export function pluginRequestTimeout(host, deadlineAt = Date.now() + PLUGIN_DISCOVERY_TIMEOUT_MS) {
  const remaining = deadlineAt - Date.now();
  if (remaining <= 0) throw pluginNetworkError(host, 'NETWORK_TIMEOUT', 'exceeded the plugin discovery/download time budget');
  return Math.min(PLUGIN_REQUEST_TIMEOUT_MS, remaining);
}
