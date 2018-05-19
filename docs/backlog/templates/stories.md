---
tags:
- story
context:
- github
---
#TODO: As a user I would like to create new files in my project from templates I define, so I can save time creating files and content id:32 gh:134 ic:gh
  - [ ] Use dropdown on alt+p and alt+j to show templates
#TODO: As a user I would like to add content to my TODO descriptions from markdown templates stored in my project id:36 gh:138 ic:gh
- [ ] Append templates to tasks with `t:<type>` metadata in them. (e.g. `t:story`)
   - [ ] if TODO appears in a single line comment, append template with single line comment prefix and the same indentation as the TODO comment
   - [ ] If TODO appears in a multiline comment, just append template at the same indentation as the TODO comment
   - [ ] Remove `t:story` after the template has been appended to the description
- [ ] templates.md will contain templates in the format...
 ```
 # <type>
 Any markdown for your template
 ```
