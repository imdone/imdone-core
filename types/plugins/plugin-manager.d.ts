export class PluginManager extends Emitter<[never]> {
    constructor(project: any);
    project: any;
    defaultPlugins: (typeof PersistTagsPlugin | typeof DefaultBoardPropertiesPlugin | typeof DefaultBoardActionsPlugin | typeof ArchivePlugin | typeof EpicPlugin | typeof ExtensionPlugin)[];
    pluginsMap: {};
    pluginPath: string;
    onDevChange(): Promise<void>;
    startDevMode(): Promise<void>;
    watcher: any;
    stopDevMode(): void;
    initDevMode(): void;
    reloadPlugins(): Promise<void>;
    uninstallPlugin(pluginName: any): Promise<any>;
    installPlugin({ name, version }: {
        name: any;
        version: any;
    }): Promise<void>;
    loadPlugins(): Promise<void>;
    loadInstalledPlugins(): Promise<void>;
    loadPluginsNotInstalled(): Promise<void>;
    loadPlugin(path: any): Promise<any>;
    getPackageInfo(path: any): {} | undefined;
    createPlugin(pluginClass: any, path?: undefined): Promise<any>;
    destroyPlugins(): void;
    isPlugin(pluginClass: any): boolean;
    eachPlugin(cb: any): void;
    eachPluginAsync(cb: any): Promise<void>;
    getPlugins(): any[];
    disablePlugin(name: any): void;
    getPluginName(pluginInstance: any): string | undefined;
    getPluginInstance(name: any): any;
    getPlugin(name: any): any;
    getPluginSettings(name: any): any;
    pluginError(method: any, pluginInstance: any, error: any): void;
    onBoardUpdate(lists: any): Promise<any>;
    onBeforeBoardUpdate(): Promise<void>;
    onTaskUpdate(task: any): void;
    onTaskFound(task: any): Promise<void>;
    onBeforeAddTask({ path, list, content, tags, contexts, meta, useCardTemplate }: {
        path: any;
        list: any;
        content: any;
        tags: any;
        contexts: any;
        meta: any;
        useCardTemplate: any;
    }): Promise<{
        path: any;
        content: any;
        tags: any;
        contexts: any;
        meta: any;
    }>;
    onAfterDeleteTask(task: any): Promise<void>;
    getCardProperties(props: any): {};
    getBoardProperties(): Promise<{}>;
    getCardActions(task: any): any[];
    getBoardActions(): any[];
    performCardAction(action: any, task: any): any;
    performBoardAction(action: any, task: any): Promise<any>;
}
import Emitter from 'events';
import PersistTagsPlugin from './persist-tags-plugin.js';
import DefaultBoardPropertiesPlugin from './default-board-properties-plugin.js';
import DefaultBoardActionsPlugin from './default-board-actions-plugin.js';
import ArchivePlugin from './archive-plugin.js';
import EpicPlugin from './epic-plugin.js';
import ExtensionPlugin from './extension-plugin.js';
