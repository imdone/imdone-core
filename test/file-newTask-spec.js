const Config = require('../lib/config')
const File = require('../lib/file')
const Task = require('../lib/task')

describe("File.prototype.extractTaskDescription", () => {
    it("Creates a new task with all interpolation data", () => {
        var config = Config.newDefaultConfig()
        config.settings = {
          cards: { metaNewLine: true, addCompletedMeta: true, doneList: 'DONE' },
        }
        const list = "TODO"
        const order = 20
        const text = 'A task with some cool stuff to test'
        const rawTask = `#$list ${text}`
        var content = `${rawTask}
- [ ] A checkbox
<!-- some:metadata order:${order} -->
`
        const project = { 
            path: 'tmp/files',
            config,
            pluginManager: {
                onTaskUpdate: () => {},
                getCardProperties: () => [],
                getCardActions: () => []
            }
        }
        var file = new File({
          repoId: 'test',
          filePath: 'fake',
          content,
          project,
        })

        const task = file.extractTaskDescription({
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

        task.description.length.should.equal(2)
        task.should.have.property("data")
        const data = task.data
        
        data.should.have.property("allContext")
        data.should.have.property("allMeta")
        data.should.have.property("allTags")
        data.should.have.property("context")
        data.should.have.property("filteredListName")
        data.should.have.property("fullPath")
        data.should.have.property("id")
        data.should.have.property("interpretedContent")
        data.should.have.property("lastLine")
        data.should.have.property("line")
        data.should.have.property("list")
        data.should.have.property("meta")
        data.should.have.property("metaKeys")
        data.should.have.property("progress")
        data.should.have.property("projectPath")
        data.should.have.property("rawTask")
        data.should.have.property("relPath")
        data.should.have.property("source")
        data.should.have.property("tags")
        data.should.have.property("text")
        data.should.have.property("totals")

        data.should.have.property("encodedMD")
        data.should.have.property("encodedText")
        data.should.have.property("html")
        data.should.have.property("htmlLength")
        data.should.have.property("htmlTruncLength")
        data.should.have.property("isOverMaxLines")
        data.should.have.property("markdown")
        data.should.have.property("rawMarkdown")
        data.should.have.property("truncHtml")
    })
})