import Plugin from 'imdone-api'
import {
  Settings,
  ArrayProperty,
  StringProperty,
} from 'imdone-api/lib/settings'

export default class SamplePlugin extends Plugin {
  constructor(project) {
    super(project)
  }

  onTaskUpdate(task) {
    task.interpretedContent = task.interpretedContent.replace(
      /- \[x\] (.*)$/gm,
      (match, p1) => {
        return `- [x] ~~${p1}~~`
      }
    )
  }

  getCardProperties(task) {
    const { source, line, totals } = task
    return {
      date: new Date().toDateString(),
      time: new Date().toLocaleTimeString(),
      timestamp: new Date().toISOString(),
      sourceLink: source && `[${source.path}:${line}](${source.path}:${line})`,
    }
  }

  getBoardActions() {
    const project = this.project
    return [
      {
        name: 'Filter for urgent cards',
        action: () => {
          project.setFilter('allTags = urgent')
        },
      },
      {
        name: 'Add a card in TODO',
        action: () => {
          project.newCard({ list: 'TODO' })
        },
      },
      {
        name: 'Test snackBar',
        action: () => {
          project.snackBar({ message: 'Testing snackBar' })
        },
      },
      {
        name: 'Test toast',
        action: () => {
          project.toast({ message: 'Testing toast' })
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
          )
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
          )
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
            this.project.addMetadata(task, key, value)
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
            this.project.addTag(task, name)
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
      this.settingSchema = new Settings()
        .addProperty(
          'tags',
          new ArrayProperty()
            .itemsDraggable(true)
            .setTitle('Tags')
            .setDescription('Quick add tags from card menu.')
            .itemTitle('Tag')
            .addItemProperty('name', new StringProperty().setTitle('Name'))
        )
        .addProperty(
          'meta',
          new ArrayProperty()
            .itemsDraggable(true)
            .setTitle('Metadata')
            .setDescription('Quick set metadata from card menu.')
            .itemTitle('Key, value pair')
            .addItemProperty('key', new StringProperty().setTitle('Key'))
            .addItemProperty('value', new StringProperty().setTitle('Value'))
        )
    }
    return this.settingSchema
  }
}
