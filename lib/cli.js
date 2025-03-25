#!/usr/bin/env node

// DOING Modernize cli to esm
// <!--
// order:-40
// -->
import { Command } from 'commander';
import ora from 'ora';
import chalk from 'chalk';
import * as fs from 'node:fs/promises'; // Use fs/promises for async read
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { executeBoardAction, listAvailableActions } from './usecases/actions.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function getPackageJson() {
  try {
    const data = await fs.readFile(path.join(__dirname, '..', 'package.json'), 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error("Error reading package.json:", error);
    return null;
  }
}

const _package = await getPackageJson();
// const { log } = hideLogs();
const spinner = ora('Loading unicorns');

setTimeout(() => {
  spinner.color = 'yellow';
  spinner.text = 'Loading rainbows';
}, 1000);

function actionCancelled() {
  console.log(chalk.bgRed('Action canceled'));
}

const program = new Command();
program.version(_package.version, '-v, --version', 'output the current version');

const actionCmd = program.command('action')
  .description('Manage board actions');

actionCmd
  .command('run <title>')
  .option('-p, --plugin <plugin>', 'Plugin name', 'ExtensionPlugin')
  .option('-t, --task <task>', 'Task filePath:line')
  .option('-w, --working-dir <workingDir>', 'Working directory', '.')
  .option('-c, --config <configPath>', 'Config file path', path.join('.imdone', 'config.yml'))
  .description('Run a board action')
  .action(async (title, {
    plugin = 'ExtensionPlugin',
    task, 
    workingDir, 
    configPath
  }) => {
    spinner.start();
    const action = { plugin, title };
    const [filePath, line] = task ? task.split(':') : [];
    // DOING: Move this CLI command to a usecase
    try {
      await executeBoardAction({
        projectPath: workingDir,
        configPath,
        task: filePath && line && { filePath, line },
        action
      });
    } catch (e) {
      console.error(e);
      actionCancelled();
    } finally {
      spinner.stop();
      process.exit(0);
    }
  });

actionCmd
  .command('list')
  .option('-p, --plugin <plugin>', 'Plugin name', 'ExtensionPlugin')
  .option('-w, --working-dir <workingDir>', 'Working directory')
  .option('-c, --config <configPath>', 'Config file path')
  .description('List available actions')
  .action(async ({ workingDir = path.resolve('.'), configPath, plugin}) => {
    spinner.start();
    try {
      await listAvailableActions(workingDir, configPath, plugin);
    } catch (e) {
    console.error(e);
    actionCancelled();
    } finally {
      spinner.stop();
      process.exit(0);
    }
  });

program.parse();

function hideLogs() {
  const log = console.log;
  const info = console.info;
  const warn = console.warn;
  const logQueue = { warn: [], info: [], log: [] };
  if (!process.env.DEBUG) {
    Object.keys(logQueue).forEach((key) => {
      console[key] = function(...args) {
        logQueue[key].push(args);
      };
    });
  }
  return { log, info, warn, logQueue };
}
