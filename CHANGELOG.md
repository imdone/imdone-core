# 1.4.6
- ignore tasks found in list if list has property `ignore: true` in config.lists

# 1.4.4
- repository.query Add rql querying of tasks

# 1.4.3
- Add savingFiles attribute when saving modified files

# 1.4.2
- Fix add and remove metaData

# 1.4.1
- Fix updateMetaData

# 1.4.0
- Switch to metadata for created and completed dates

# 1.3.59
- Fix meta so it captures the first key:

# 1.3.58
- extend include_lists

# 1.3.54
- Add .pug to languages
- Update comment symbol for .jade and .pug to be //-

# 1.3.51
- Allow hash style tasks in code if they're in config.lists or config.code.include_lists

# 1.3.45
- switch to markdown-it for check-lists
- Add following lines as task description

# 1.3.38
- Add list to include_lists

# 1.3.34
- Update chokidar

# 1.3.27
- Allow umlauts and other special characters in contexts

# 1.3.26
- Check excludes for all files before running stat

# 1.3.25
- Use eachLimit for Repository.readFiles

# 1.3.24
- Simplify isBinary check

# 1.3.23
- file.isOk callback with false if isBinaryCheck errs

# 1.3.22
- Drop async file access limit to 10

# 1.3.21
- Reduce async file access limit to 256

# 1.3.20
- Improve stats performance
- emits tasks on update
- Add isListVisible

# 1.3.19
- Minor bug fixes

# 1.3.18
- Add delete tasks

# 1.3.17
- Simplify readdir with node-dir

# 1.3.16
- Add php block comment.
- Fix issue with hash style lists not getting added

# 1.3.15
- Fire config.loaded event after config is set

# 1.3.14
- Make sure list is in include_lists before adding it through listeners

# 1.3.13
- Raise async limit

# 1.3.11
- Add haml extension and -# comment

# 1.3.9
- Add .boot

# 1.3.8
- Add velocity comments

# 1.3.5
- Update .imdoneignore functionality to work like .gitignore

# 1.3.3
- Update marked and minimatch for security reasons

# 1.3.2
- When a user adds a list to the board, utomatically add list name to config.code.include_lists if it's all caps

# 1.3.0
- Add update task from metadata, tags and contexts
- meta is empty object if no metadata found
- make repo emit task.modified
- compare meta.id as backup for id compare
