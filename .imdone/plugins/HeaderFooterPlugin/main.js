import Plugin from 'imdone-api'
import { Settings, StringProperty } from 'imdone-api/lib/settings'

const HEADER_FOOTER_COMMENT = '<!-- imdone-header-footer -->\n'

export default class HeaderFooterPlugin extends Plugin {
  constructor(project) {
    super(project)
  }

  onTaskUpdate(task) {
    if (task.interpretedContent.includes(HEADER_FOOTER_COMMENT)) return
    if (this.afterPrefix) {
      task.interpretedContent = task.interpretedContent.replace(task.text, `${this.afterPrefix}${task.text}`)
    }

    if (this.afterTitle) {
      task.interpretedContent = task.interpretedContent.replace(task.text, `${task.text}${this.afterTitle}`)
    }

    task.interpretedContent =
      task.interpretedContent = `${HEADER_FOOTER_COMMENT}${this.header}${task.interpretedContent}${this.footer}`
  }

  get afterPrefix() {
    const afterPrefix = this.getSettings().afterPrefix || ''
    return afterPrefix.replaceAll(/\n/g, '')
  }

  get afterTitle() {
    return this.getSettings().afterTitle || ''
  }

  get header() {
    return this.getSettings().header || ''
  }

  get footer() {
    return this.getSettings().footer || ''
  }

  getSettingsSchema() {
    if (!this.settingSchema) {
      this.settingSchema = new Settings()
        .addProperty(
          'header',
          new StringProperty().textEditor(true).setTitle('Header markdown')
        )
        .addProperty(
          'afterPrefix',
          new StringProperty().textEditor(true).setTitle('After prefix markdown')
        )
        .addProperty(
          'afterTitle',
          new StringProperty().textEditor(true).setTitle('After title markdown')
        )
        .addProperty(
          'footer',
          new StringProperty().textEditor(true).setTitle('Footer markdown')
        )
    }
    return this.settingSchema
  }
}
