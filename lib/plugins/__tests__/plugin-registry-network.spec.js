import { afterEach, describe, expect, it, vi } from 'vitest';
import https from 'node:https';
import { EventEmitter } from 'node:events';
import { getAvailablePlugins } from '../plugin-registry.js';

afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

function transport(responses) {
  const requests = [];
  vi.spyOn(https, 'request').mockImplementation((options, callback) => {
    const spec = responses.shift() || { stall: true };
    const request = new EventEmitter();
    const response = new EventEmitter();
    response.statusCode = spec.status ?? 200;
    response.destroy = vi.fn();
    request.destroy = vi.fn(error => { if (error) request.emit('error', error); });
    request.end = () => {
      if (spec.stall) return;
      try {
        if (spec.error) return request.emit('error', new Error('private transport details'));
        callback(response);
        if (spec.aborted) return response.emit('aborted');
        if (spec.responseError) return response.emit('error', new Error('private response details'));
        response.emit('data', Buffer.from(spec.body ?? '[]'));
        if (!spec.bodyStall) response.emit('end');
      } catch (error) { request.emit('error', error); }
    };
    request.write = () => {};
    requests.push({ request, response, options });
    return request;
  });
  return requests;
}

function track(promise) {
  const result = { settled: false };
  promise.then(value => Object.assign(result, { settled: true, value }), error => Object.assign(result, { settled: true, error }));
  return result;
}

describe('plugin registry request boundaries', () => {
  it.each([{ stall: true }, { bodyStall: true }])('bounds stalled headers/body and releases the request: %j', async spec => {
    vi.useFakeTimers();
    const requests = transport([spec]);
    const result = track(getAvailablePlugins());
    await vi.advanceTimersByTimeAsync(10001);
    expect(result.settled).toBe(true);
    expect(result.error?.code).toBe('IMDONE_PLUGIN_NETWORK_TIMEOUT');
    expect(result.error?.message).toMatch(/proxy|Zscaler/);
    expect(requests[0].request.destroy).toHaveBeenCalled();
  });

  it.each([{ status: 403, body: '<html>private proxy response</html>' }, { body: 'invalid private json' }, { body: '{}' }, { body: '[null]' }, { error: true }, { aborted: true }, { responseError: true }])('returns actionable sanitized failures: %j', async spec => {
    transport([spec]);
    const result = await getAvailablePlugins().then(() => null, error => error);
    expect(result?.code).toMatch(/^IMDONE_PLUGIN_/);
    expect(result?.message).toMatch(/network|proxy|Zscaler/);
    expect(result?.message).not.toContain('private');
  });

  it('bounds README lookup using the remaining discovery budget', async () => {
    vi.useFakeTimers();
    transport([{ body: '[{"version":"owner/plugin"}]' }, { stall: true }]);
    const result = track(getAvailablePlugins({ deadlineAt: Date.now() + 200 }));
    await vi.advanceTimersByTimeAsync(201);
    expect(result.error?.code).toBe('IMDONE_PLUGIN_NETWORK_TIMEOUT');
  });

  it('still discovers plugins and renders their readmes', async () => {
    vi.useFakeTimers();
    const requests = transport([{ body: '[{"name":"Example","version":"owner/plugin"}]' }, { body: JSON.stringify({ content: Buffer.from('# Example').toString('base64') }) }]);
    const plugins = await getAvailablePlugins();
    expect(plugins[0].name).toBe('Example');
    expect(plugins[0].content).toContain('Example');
    expect(requests.map(({ options }) => options.hostname)).toEqual(['raw.githubusercontent.com', 'api.github.com']);
    expect(vi.getTimerCount()).toBe(0);
  });
});
