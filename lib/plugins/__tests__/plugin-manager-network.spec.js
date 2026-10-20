import { afterEach, expect, it, vi } from 'vitest';
import { PluginManager } from '../plugin-manager.js';
import { appContext } from '../../context/ApplicationContext.js';

const original = appContext().pluginRegistry;
afterEach(() => { appContext().pluginRegistry = original; vi.useRealTimers(); });

it('preserves automatic installation and shares one deadline with discovery and downloads', async () => {
  vi.useFakeTimers();
  const now = Date.now();
  const plugin = { name: 'Example', version: 'owner/plugin' };
  const getAvailablePlugins = vi.fn().mockResolvedValue([plugin]);
  appContext().pluginRegistry = { getAvailablePlugins };
  const manager = new PluginManager({ path: '/unused', config: { plugins: { Example: {} } } });
  manager.installPlugin = vi.fn().mockResolvedValue(undefined);
  await manager.loadPluginsNotInstalled();
  expect(getAvailablePlugins).toHaveBeenCalledWith({ deadlineAt: now + 30000 });
  expect(manager.installPlugin).toHaveBeenCalledWith(plugin, { deadlineAt: now + 30000 });
});

it('does not start another download after the shared budget expires', async () => {
  vi.useFakeTimers();
  const now = Date.now();
  appContext().pluginRegistry = { getAvailablePlugins: async () => [{ name: 'One' }, { name: 'Two' }] };
  const manager = new PluginManager({ path: '/unused', config: { plugins: { One: {}, Two: {} } } });
  manager.installPlugin = vi.fn(async () => { vi.setSystemTime(now + 30001); });
  await expect(manager.loadPluginsNotInstalled()).rejects.toMatchObject({ code: 'IMDONE_PLUGIN_NETWORK_TIMEOUT' });
  expect(manager.installPlugin).toHaveBeenCalledTimes(1);
});
