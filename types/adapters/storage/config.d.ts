export function load(projectPath: any, configPath?: string): Promise<Config | undefined>;
export function save(config: any, projectPath: any): Promise<void>;
export function loadForFilePath(filePath: any): Promise<Config | undefined>;
export function loadYamlConfig(filePath: any): Promise<{} | undefined>;
export function findImdonePath(cwd: any): Promise<string>;
import { Config } from '../../config.js';
