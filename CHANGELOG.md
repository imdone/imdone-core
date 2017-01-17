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
