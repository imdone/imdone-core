import { describe, it, expect  } from 'vitest';
import { Config } from '../config'
import File from '../file'
import Task from '../task'
import { createFileSystemProject } from '../project-factory'

const renderMarkdown = () => 'File content'
const extractWikilinkTopics = () => ['a topic', 'another topic']

describe("File.prototype.extractTaskDescription", () => {
    it("Creates a new task with all interpolation data", () => {
        var config = Config.newDefaultConfig()
        config.settings = {
          cards: { metaNewLine: true, addCompletedMeta: true, doneList: 'DONE' },
        }
        const project = createFileSystemProject({
            path: 'tmp/files',
            config,
            loadInstalledPlugins: () => {},
            loadPluginsNotInstalled: () => {}
        })
        const list = "TODO"
        const order = 20
        const text = 'A task with some cool stuff to test'
        const rawTask = `#$list ${text}`
        var content = `${rawTask}
- [ ] A checkbox
<!-- some:metadata order:${order} -->
`
        var file = new File({
          repoId: 'test',
          filePath: 'fake',
          content,
          project,
        })

        const task = file.extractTaskWithDescription({
            content,
            taskStartOnLine: 0,
            rawTask,
            config,
            list:"TODO",
            line: 1,
            text,
            list,
            order,
            type: Task.Types.HASHTAG,
            hasColon: false,
            pos: 0
        })
        task.init()

        expect(task.description.length).to.equal(2)
        expect(task).to.have.property("data")
        const data = task.data
        
        expect(data).to.have.property("allContext")
        expect(data).to.have.property("allMeta")
        expect(data).to.have.property("allTags")
        expect(data).to.have.property("context")
        expect(data).to.have.property("filteredListName")
        expect(data).to.have.property("fullPath")
        expect(data).to.have.property("id")
        expect(data).to.have.property("interpretedContent")
        expect(data).to.have.property("lastLine")
        expect(data).to.have.property("line")
        expect(data).to.have.property("list")
        expect(data).to.have.property("meta")
        expect(data).to.have.property("metaKeys")
        expect(data).to.have.property("progress")
        expect(data).to.have.property("projectPath")
        expect(data).to.have.property("rawTask")
        expect(data).to.have.property("relPath")
        expect(data).to.have.property("source")
        expect(data).to.have.property("tags")
        expect(data).to.have.property("text")
        expect(data).to.have.property("totals")
        expect(data).to.have.property("encodedMD")
        expect(data).to.have.property("encodedText")
        expect(data).to.have.property("html")
        expect(data).to.have.property("htmlLength")
        expect(data).to.have.property("htmlTruncLength")
        expect(data).to.have.property("isOverMaxLines")
        expect(data).to.have.property("markdown")
        expect(data).to.have.property("rawMarkdown")
        expect(data).to.have.property("truncHtml")
    })
})