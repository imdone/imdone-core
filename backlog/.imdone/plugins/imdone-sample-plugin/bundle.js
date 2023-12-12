'use strict';

var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

function getDefaultExportFromCjs (x) {
	return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
}

var plugin = {exports: {}};

(function (module, exports) {
var __awaiter = (commonjsGlobal && commonjsGlobal.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Plugin = void 0;
class Plugin {
    constructor(project) {
        this.project = project;
        this.unimplWarning = {};
    }
    destroy() { }
    onBeforeAddTask(request) {
        return __awaiter(this, void 0, void 0, function* () {
            this.unimplemented('onBeforeAddTask()');
            const { path, list, content, meta, tags, contexts } = request;
            return { path, content, meta, tags, contexts };
        });
    }
    onBeforeBoardUpdate() {
        this.unimplemented('onBeforeBoardUpdate()');
    }
    onBoardUpdate(lists) {
        this.unimplemented('onBoardUpdate(lists: Array<List>)');
    }
    onTaskUpdate(task) {
        this.unimplemented('onTaskUpdate(task: Task)');
    }
    onAfterDeleteTask(task) {
        this.unimplemented('onAfterDeleteTask(task: Task)');
    }
    getCardProperties(task) {
        this.unimplemented('getCardProperties(task: Task)');
        return {};
    }
    getCardActions(task) {
        this.unimplemented('getCardActions(task: Task)');
        return [];
    }
    getBoardActions() {
        this.unimplemented('getBoardActions()');
        return [];
    }
    getSettingsSchema() {
        this.unimplemented('getSettingsSchema()');
        return null;
    }
    getSettings() {
        return null;
    }
    unimplemented(signature) {
        if (this.unimplWarning[signature])
            return;
        console.info(`${this.constructor.name}.${signature} is not implemented.`);
        this.unimplWarning[signature] = true;
    }
}
exports.Plugin = Plugin;
(module).exports = Plugin;
}(plugin, plugin.exports));

var Plugin = /*@__PURE__*/getDefaultExportFromCjs(plugin.exports);

var settings = {};

Object.defineProperty(settings, "__esModule", { value: true });
var Settings_1 = settings.Settings = ArrayProperty_1 = settings.ArrayProperty = settings.ArrayItems = StringProperty_1 = settings.StringProperty = settings.NumberProperty = settings.BooleanProperty = settings.Property = void 0;
class Property {
    constructor(type) {
        this.type = type;
    }
    setTitle(title) {
        this.title = title;
        return this;
    }
    setDescription(description) {
        this.description = description;
        return this;
    }
}
settings.Property = Property;
class BooleanProperty extends Property {
    constructor() {
        super('boolean');
    }
    setDefault(_default) {
        this.default = _default;
        return this;
    }
    setTitle(title) {
        this.title = title;
        return this;
    }
    setDescription(description) {
        this.description = description;
        return this;
    }
}
settings.BooleanProperty = BooleanProperty;
class NumberProperty extends Property {
    constructor() {
        super('number');
    }
    setMinimum(min) {
        this.minimum = min;
        return this;
    }
    setMaximum(max) {
        this.maximum = max;
        return this;
    }
    setDefault(_default) {
        this.default = _default;
        return this;
    }
    setTitle(title) {
        this.title = title;
        return this;
    }
    setDescription(description) {
        this.description = description;
        return this;
    }
}
settings.NumberProperty = NumberProperty;
class StringProperty extends Property {
    constructor() {
        super('string');
        this.editor = false;
        this.required = false;
    }
    setDefault(_default) {
        this.default = _default;
        return this;
    }
    allowedValues(_enum) {
        this.enum = _enum;
        return this;
    }
    textEditor(enable) {
        this.editor = enable;
        return this;
    }
    setRequired(required) {
        this.required = required;
        return this;
    }
    setTitle(title) {
        this.title = title;
        return this;
    }
    setDescription(description) {
        this.description = description;
        return this;
    }
}
var StringProperty_1 = settings.StringProperty = StringProperty;
class ArrayItems {
    constructor() {
        this.properties = {};
        this.draggable = false;
        this.type = 'object';
        this.type = 'object';
    }
}
settings.ArrayItems = ArrayItems;
class ArrayProperty extends Property {
    constructor() {
        super('array');
        this.items = new ArrayItems();
    }
    itemTitle(title) {
        this.items.title = title;
        return this;
    }
    itemsDraggable(draggable) {
        this.items.draggable = draggable;
        return this;
    }
    addItemProperty(name, property) {
        this.items.properties[name] = property;
        return this;
    }
    setTitle(title) {
        this.title = title;
        return this;
    }
    setDescription(description) {
        this.description = description;
        return this;
    }
}
var ArrayProperty_1 = settings.ArrayProperty = ArrayProperty;
class Settings {
    constructor() {
        this.properties = {};
        this.type = 'object';
    }
    addProperty(name, property) {
        this.properties[name] = property;
        return this;
    }
}
Settings_1 = settings.Settings = Settings;

class SamplePlugin extends Plugin {
  constructor(project) {
    super(project);
  }

  onTaskUpdate(task) {
    task.interpretedContent = task.interpretedContent.replace(
      /- \[x\] (.*)$/gm,
      (match, p1) => {
        return `- [x] ~~${p1}~~`
      }
    );
  }

  getCardProperties(task) {
    const { source, line, totals } = task;
    return {
      date: new Date().toDateString(),
      time: new Date().toLocaleTimeString(),
      timestamp: new Date().toISOString(),
      sourceLink: source && `[${source.path}:${line}](${source.path}:${line})`,
    }
  }

  getBoardActions() {
    const project = this.project;
    return [
      {
        name: 'Filter for urgent cards',
        action: () => {
          project.setFilter('allTags = urgent');
        },
      },
      {
        name: 'Add a card in TODO',
        action: () => {
          project.newCard({ list: 'TODO' });
        },
      },
      {
        name: 'Test snackBar',
        action: () => {
          project.snackBar({ message: 'Testing snackBar' });
        },
      },
      {
        name: 'Test toast',
        action: () => {
          project.toast({ message: 'Testing toast' });
        },
      },
    ]
  }

  getCardActions(task) {
    return [
      ...this.getTagActions(task),
      ...this.getMetaActions(task),
      {
        action: () => {
          this.project.copyToClipboard(
            task.desc.rawMarkdown,
            'Markdown copied to clipboard!'
          );
        },
        icon: 'markdown',
        pack: 'fab',
        title: 'Copy markdown',
      },
      {
        action: () => {
          this.project.copyToClipboard(
            task.desc.html,
            'HTML copied to clipboard!'
          );
        },
        icon: 'copy',
        pack: 'fas',
        title: 'Copy html',
      },
    ]
  }

  getMetaActions(task) {
    return this.getMeta()
      .filter(
        ({ key, value }) =>
          !(task.allMeta[key] && task.allMeta[key].includes(value))
      )
      .map(({ key, value }) => {
        return {
          action: () => {
            this.project.addMetadata(task, key, value);
          },
          icon: 'table',
          pack: 'fas',
          title: `Add metadata ${key} = ${value}`,
        }
      })
  }

  getTagActions(task) {
    return this.getTags()
      .filter(({ name }) => !task.allTags.includes(name))
      .map(({ name }) => {
        return {
          action: () => {
            this.project.addTag(task, name);
          },
          icon: 'tag',
          pack: 'fas',
          title: `Add ${name} tag`,
        }
      })
  }

  getTags() {
    return this.getSettings().tags || []
  }

  getMeta() {
    return this.getSettings().meta || []
  }

  getSettingsSchema() {
    if (!this.settingSchema) {
      this.settingSchema = new Settings_1()
        .addProperty(
          'tags',
          new ArrayProperty_1()
            .itemsDraggable(true)
            .setTitle('Tags')
            .setDescription('Quick add tags from card menu.')
            .itemTitle('Tag')
            .addItemProperty('name', new StringProperty_1().setTitle('Name'))
        )
        .addProperty(
          'meta',
          new ArrayProperty_1()
            .itemsDraggable(true)
            .setTitle('Metadata')
            .setDescription('Quick set metadata from card menu.')
            .itemTitle('Key, value pair')
            .addItemProperty('key', new StringProperty_1().setTitle('Key'))
            .addItemProperty('value', new StringProperty_1().setTitle('Value'))
        );
    }
    return this.settingSchema
  }
}

module.exports = SamplePlugin;
