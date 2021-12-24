const { Project } = require('imdone-api/lib/project')
const PluginManager = require('./plugin-manager')
const Repository = require('./repository')
const _cloneDeep = require('lodash.clonedeep')
const newCard = require('./card')
const sanitize = require("sanitize-filename")
const { JOURNAL_TYPE } = require('./constants')
const _path = require('path')
const moment = require('moment')
const { removeMD } = require('./adapters/markdown')
const fileGateway = require('./adapters/file-gateway')
const matter = require('gray-matter')
const _isObject = require('lodash.isobject')
const _isString = require('lodash.isstring')
const exec = require('child_process').exec


function calculateTotals (lists) {
  const totals = {}
  lists.forEach(list => {
    try {
      totals[list.name] = list.tasks.length
    } catch (e) {
      console.error('Error calculating list totals:', e)
    }
  })
  return totals
}

function onChange(project, event, data) {
  project.emit(event, data)
}

const EVENTS = [
  'file.processed',
  'files.found',
  'file.update',
  'file.saved',
  'list.modified',
  'config.update'
]

module.exports = class WorkerProject extends Project {
  constructor(repo) {
    super()
    this.repo = repo
    this.innerFilter = ''
    this.pluginManager = new PluginManager(this.repo)
    EVENTS.forEach(event => {
      this.repo.on(event, (data) => onChange(this, event, data))
    })
  }

  toJSON () {
    // console.time('toJSON time')
    let allLists = this.allLists
    const totals = calculateTotals(allLists)
    allLists = allLists.map(list => {
      list.tasks = list.tasks.map(card => {
        card.interpretedContent = ''
        card.totals = totals
        return card
      })
      return list
    })

    this.pluginManager.updateLists(allLists)
    const cards = allLists.map(list => list.tasks).flat().map(card => card.init(totals))
    const lists = this.getLists({
      tasks: this.getCards(this.filter, cards),
      populateFiltered: true
    })
    // console.timeEnd('toJSON time')
    return {
      path: this.path,
      config: this.config,
      lists: lists,
      files: this.files, 
      totals,
      filter: this.filter,
      actions: this.boardActions
    }
  }

  init (cb = () => {}) {
    this.repo.project = this
    this.repo.init((err, files) => {
      if (err) return cb(err)
      cb(null, files)
    })
  }

  emit () {}

  destroy () {
    this.repo.destroy()
    if (this.pluginManager) this.pluginManager.destroyPlugins()
  }

  get lists() {
    const cards = this.getCards()
    return this.getLists({
      tasks: this.getCards(this.filter, cards)
    })
  }

  get allLists() {
    return this.getLists()
  }

  getLists(opts) {
    const tasks = (opts && opts.tasks) || this.getCards()
    const populateFiltered = opts && opts.populateFiltered
    return Repository.getTasksByList(this.repo, tasks, false, populateFiltered)
  }

  getCards (filter = this.defaultViewFilter, tasks = this.repo.getTasks()) {
    return Repository.query(tasks, filter)
  }
  
  get files () {
    return this.repo.getFilePaths()
  }

  get config () {
    return this.repo.config
  }

  get defaultViewFilter () {
    return this.config.defaultFilter
  }

  get totals () {
    return calculateTotals(this.lists)
  }

  get path() {
    return this.repo.path;
  }

  get doneList() {
    return this.config.getDoneList()
  }

  get filter () {
    return this.innerFilter
  }

  get boardActions () {
    return [
      ...this.config.actions.map((item, index) => {
        return {...item, index}
      }),
      ...this.pluginManager.getBoardActions()
    ]
  }

  set filter (filter) {
    this.innerFilter = filter
  }

  addMetadata(task, key, value) {
    if (!task.allMeta[key]) task.allMeta[key] = []
    task.allMeta[key].push(value)
    if (!/^['"]/.test(value) && /\s/.test(value)) value = `"${value}"`
    const metaData = `${key}${this.repo.config.getMetaSep()}${value}`
    const content = task.addToLastCommentInContent(task.content, metaData, this.repo.config.isMetaNewLine())
    this.updateCardContent(task, content)
  }

  addTag(task, tag) {
    task.allTags.push(tag)
    const tagContent = `${this.repo.config.getTagPrefix()}${tag}`
    const content = task.addToLastCommentInContent(task.content, tagContent, this.repo.config.isMetaNewLine())
    this.updateCardContent(task, content)
  }

  updateCardContent(task, content) {
    this.repo.modifyTaskFromContent(task, content, err => {
      if (err) return console.error(err)
      this.emit('file.update')
    })
  }

  snackBar({ message, type, duration }) {
    this.emit('project.snackBar', { message, type, duration })
  }

  toast({ message, type, duration }) {
    this.emit('project.toast', { message, type, duration })
  }

  filterLists (filter, lists = this.lists) {
    return lists.map(list => {
      let newList = {...list, tasks:[]}
      newList = _cloneDeep(newList)
      newList.tasks = Repository.query(list.tasks, filter)
      return newList
    })
  }

  copyToClipboard(text, message) {
    this.emit('project.copyToClipboard', {text, message})
  }

  openUrl(url) {
    this.emit('project.openUrl', url)
  }

  openPath(path) {
    this.emit('project.openPath', path)
  }

  saveFile(content, file) {
    const filePath = this.getFullPath(file);
    this.emit('project.saveFile', {file: filePath, content})
  }

  newCard(opts = {}) {
    let {list, path, template} = opts
    if (path) {
      path = this.getFullPath(path)
      if (!fileGateway.existsSync(path)) {
        fileGateway.writeFileSync(path, '')
      }
    }
		if (!template) template = this.getNewCardTemplate(path);
		this.emit('project.newCard', { list, path, template });
	}

  setFilter (filter) {
    this.emit('project.filter', { filter })
  }

  getNewCardTemplate(file) {
		const frontMatter = this.getNewCardFileFrontMatter(file);
    const card = newCard(
      {frontMatter, repoId: this.path, text: ''},
      this,
      true
    )
    card.init(this.totals)
    return card.formatContent(frontMatter.template).content
	}

  getNewCardFileFrontMatter(file) {
		let fileContent;
		if (file) {
			fileContent = fileGateway.readFileSync(file, "utf8");
		} else if (JOURNAL_TYPE.NEW_FILE === this.config.journlType) {
			fileContent = this.config.journalTemplate
		} else {
			const newCardsFile = this.getNewCardsFile();
			fileContent = fileGateway.readFileSync(newCardsFile, "utf8");
		}
		let { props, computed, template } = this.config.settings.cards
		const frontMatter = matter(fileContent).data || {};
		if (!_isObject(props)) props = {};
		if (!_isObject(computed)) computed = {};
		if (!_isString(template)) template = "";
		if (!_isObject(frontMatter.props)) frontMatter.props = {};
		if (!_isObject(frontMatter.computed)) frontMatter.computed = {};
		if (!_isString(frontMatter.template)) frontMatter.template = template;
		props = {
			...props,
			...frontMatter.props,
			now: new Date().toDateString(),
			totals: this.totals,
		};
		computed = { ...computed, ...frontMatter.computed };
		return {
			...frontMatter,
			props,
			computed,
			template: frontMatter.template,
		};
	}

  getNewCardsFile(opts = {relPath: false}) {
    const { relPath, title } = opts
		if (!this.config) return;
		const filePath = this.appendNewCardsTo(title);
		if (fileGateway.existsSync(filePath))
			return relPath ? filePath.replace(this.path, "") : filePath;
		if (this.config.journalType !== JOURNAL_TYPE.NEW_FILE)
			this.snackBar({ message: `File not found: ${filePath}` });
	}

  appendNewCardsTo(title) {
		const journalType = this.config.journalType;
		if (journalType === JOURNAL_TYPE.SINGLE_FILE)
			return this.getFullPath(this.settings.appendNewCardsTo);
		if (journalType === JOURNAL_TYPE.FOLDER)
			return this.getJournalFile().fullFilePath;
		if (journalType === JOURNAL_TYPE.NEW_FILE) {
			let fileName = `${sanitize(removeMD(title))}.md`;
			if (this.config.replaceSpacesWith)
				fileName = fileName.replace(/ /g, this.config.replaceSpacesWith);
			const fileFolder = this.getFullPath(this.config.journalPath);
			const filePath = title
				? _path.join(fileFolder, fileName)
				: _path.join(fileFolder, "journal.md");

			if (!fileGateway.existsSync(fileFolder)) fileGateway.mkdirpSync(fileFolder);
			if (!fileGateway.existsSync(filePath)) fileGateway.writeFileSync(filePath, this.config.journalTemplate);
			
			return filePath;
		}
	}

  getJournalFile() {
		const month = moment().format("YYYY-MM")
		const today = moment().format("YYYY-MM-DD")
		const journalPath = this.config.journalPath
		const folderPath = _path.join(journalPath, month)
		const journalFilePrefix = this.config.journalFilePrefix
		const journalFileSuffix = this.config.journalFileSuffix
		const filePath = _path.join(
			folderPath,
			`${journalFilePrefix}${today}${journalFileSuffix}.md`
		);

		const fullFolderPath = this.getFullPath(folderPath);
		const fullFilePath = this.getFullPath(filePath);
		if (!fileGateway.existsSync(fullFolderPath)) fileGateway.mkdirpSync(fullFolderPath);
		if (!fileGateway.existsSync(fullFilePath)) {
			fileGateway.writeFileSync(fullFilePath, this.config.journalTemplate);
		}
		return { filePath, fullFilePath };
	}

  getFullPath(...path) {
    if (_path.join(...path).startsWith(this.path)) {
      return _path.join(...path)
    }
    return _path.join.apply({}, [this.path, ...path])
  }

  performCardAction(action, task) {
    task = this.repo.getTask(task.id)
    try {
      action = JSON.parse(action)
    } catch (e) {
      //
    }
    if (action.plugin) return this.pluginManager.performCardAction(action, task)

    const actionFunction = task.getCardLinks()[action.index].action
    const actions = {
			filter: (filter) => {
        this.setFilter(filter)
			},
			newCard: (list, path) => {
				if (task.source.lang !== "text") return this.alert("Unable to append cards in code files.");
				if (path) path = this.getFullPath(path);
				this.newCard({list, path});
			},
			alert: (msg) => {
				this.toast({message: msg})
			},
			openUrl: (url) => {
				this.openUrl(url)
			},
			execCommand: (cmd) => {
				return this.exec(cmd)
			},
		};
		const actionThis = {
			...task.data,
			...task.desc,
			actions,
		};
		try {
			const func = new Function(`return ${actionFunction}`)();
			func.apply(actionThis);
		} catch (e) {
			console.error(e);
			console.log("action:", actionFunction);
			console.log("this:", actionThis);
		}
	}
  performBoardAction(action) {
    if (action && action.plugin) return this.pluginManager.performBoardAction(action)
    const actions = {
			filter: (filter) => {
        this.setFilter(filter)
			},
			alert: (msg) => {
				this.toast({message: msg})
			},
			saveFile: ({ file, content }) => {
        this.saveFile(content, file)
      },
			mailto: ({ subject, body, to, cc, bcc }) => {
				const params = [];
				if (subject) params.push(`subject=${encodeURIComponent(subject)}`);
				if (body) params.push(`body=${encodeURIComponent(body)}`);
				if (cc) params.push(`cc=${encodeURIComponent(cc)}`);
				if (bcc) params.push(`bcc=${encodeURIComponent(bcc)}`);
				const url = `mailto:${to}?${params.join("&")}`;
				console.log("opening email with:", url);
				this.openUrl(url)
			},
			copy: (content, message) => {
        this.copyToClipboard(
					content,
					message || "Your content has been copied"
				)
			},
			updateCard: (task, content) => {
				this.updateCardContent(task, content);
			},
		};
    const actionFunction = this.boardActions[action.index].function
    const actionThis = { cards: this.lists, ...actions }
    try {
      actionFunction.apply(actionThis);
    } catch (err) {
      console.error(err);
      console.log("action:", actionFunction);
      console.log("this:", actionThis);
    }
	}

  exec(cmd) {
		return new Promise((resolve, reject) => {
			exec(cmd, (error, stdout, stderr) => {
        if (stderr) console.warn('cmd stderr:', stderr)
				if (error) return reject(error)
				resolve(stdout)
			})
		})
	}

  installPlugin ({name, version}) {
    return this.pluginManager.installPlugin({name, version})
  }
}