import https from 'node:https';
import { renderMarkdown } from '../adapters/markdown.js';
import { PLUGIN_DISCOVERY_TIMEOUT_MS, pluginNetworkError, pluginRequestTimeout } from '../adapters/plugin-network.js';

export async function getAvailablePlugins({ deadlineAt = Date.now() + PLUGIN_DISCOVERY_TIMEOUT_MS } = {}) {
  const plugins = await fetchJson('https://raw.githubusercontent.com/imdone/imdone-plugins/main/index.json', deadlineAt);
  if (!Array.isArray(plugins)) throw pluginNetworkError('raw.githubusercontent.com', 'INVALID_RESPONSE', 'returned an invalid plugin index');
  for (const plugin of plugins) {
    if (!plugin || typeof plugin.version !== 'string' || !plugin.version) {
      throw pluginNetworkError('raw.githubusercontent.com', 'INVALID_RESPONSE', 'returned an invalid plugin entry');
    }
    const readme = await fetchJson(`https://api.github.com/repos/${plugin.version}/readme`, deadlineAt);
    if (readme?.content !== undefined && typeof readme.content !== 'string') {
      throw pluginNetworkError('api.github.com', 'INVALID_RESPONSE', 'returned an invalid plugin README');
    }
    plugin.content = renderMarkdown(readme?.content ? Buffer.from(readme.content, 'base64').toString('utf8') : '');
  }
  return plugins;
}

async function fetchJson(url, deadlineAt) {
  const target = new URL(url);
  const timeoutMs = pluginRequestTimeout(target.hostname, deadlineAt);
  return new Promise((resolve, reject) => {
    let settled = false;
    let request;
    let response;
    const finish = (error, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (error) {
        reject(error);
        response?.destroy();
        request?.destroy();
      } else resolve(value);
    };
    const timer = setTimeout(() => finish(pluginNetworkError(target.hostname, 'NETWORK_TIMEOUT', `timed out after ${timeoutMs}ms`)), timeoutMs);
    try {
      request = https.request({
        hostname: target.hostname,
        port: 443,
        path: target.pathname + target.search,
        method: 'GET',
        headers: { 'User-Agent': 'imdone', 'Cache-Control': 'no-cache' },
      }, res => {
        response = res;
        const failure = () => finish(pluginNetworkError(target.hostname, 'NETWORK_ERROR', 'failed while receiving the response'));
        res.on('error', failure);
        res.on('aborted', failure);
        res.on('close', () => { if (!settled) failure(); });
        if (res.statusCode < 200 || res.statusCode >= 300) {
          finish(pluginNetworkError(target.hostname, 'HTTP_ERROR', `returned HTTP ${res.statusCode}`));
          return;
        }
        const chunks = [];
        res.on('data', chunk => chunks.push(chunk));
        res.on('end', () => {
          try { finish(null, JSON.parse(Buffer.concat(chunks).toString('utf8'))); }
          catch { finish(pluginNetworkError(target.hostname, 'INVALID_RESPONSE', 'returned invalid JSON')); }
        });
      });
      request.on('error', () => finish(pluginNetworkError(target.hostname, 'NETWORK_ERROR', 'could not connect')));
      request.end();
    } catch {
      finish(pluginNetworkError(target.hostname, 'NETWORK_ERROR', 'could not start the request'));
    }
  });
}
