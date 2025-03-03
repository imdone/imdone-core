# #DONE  Error adding file

```log
mcads","msg":"data","data":"Error processing command: {\n  filePath: 'imdone-tasks/Distill-the-Good-Fences-rule-into-a-single-markdown-file.md',\n  list: 'TODO',\n  content: 'Distill the Good Fences rule into a single markdown file\\n' +\n    '\\n' +\n    '<!--\\n' +\n    'created:2024-11-18T16:04:41-05:00\\n' +\n    '-->\\n'\n}\n"}]
[2024-11-18 16:04:46.805] [error] child_process[{"pid":11365,"path":"/Users/jpiascik/Library/CloudStorage/Dropbox/notes/cms-mcads","msg":"error","data":"TypeError: Unable to add file after extracting tasks: #{file.path}\nCannot read property 'list' of undefined\n    at Repository.moveTask (/Applications/imdone.app/Contents/Resources/app.asar/node_modules/imdone-core/lib/repository.js:1349:48)\n    at /Applications/imdone.app/Contents/Resources/app.asar/node_modules/imdone-core/lib/project.js:482:19\n    at /Applications/imdone.app/Contents/Resources/app.asar/node_modules/imdone-core/lib/repository.js:1127:5\n    at /Applications/imdone.app/Contents/Resources/app.asar/node_modules/imdone-core/lib/repository.js:953:9\n    at /Applications/imdone.app/Contents/Resources/app.asar/node_modules/imdone-core/lib/repository.js:477:5\n    at Repository.repo.fileOK (/Applications/imdone.app/Contents/Resources/app.asar/node_modules/imdone-core/lib/mixins/repo-fs-store.js:154:54)\n    at Repository.addFile (/Applications/imdone.app/Contents/Resources/app.asar/node_modules/imdone-core/lib/repository.js:467:8)\n    at /Applications/imdone.app/Contents/Resources/app.asar/node_modules/imdone-core/lib/repository.js:948:12\n    at extract (/Applications/imdone.app/Contents/Resources/app.asar/node_modules/imdone-core/lib/repository.js:565:14)\n    at Repository.extractTasks (/Applications/imdone.app/Contents/Resources/app.asar/node_modules/imdone-core/lib/repository.js:580:10)\n"}]
```

<!--
#bug
is-epic:"error adding file"
created:2024-11-18T21:34:36.368Z
order:0
completed:2024-11-19T09:51:10-05:00
archived:true
archivedAt:2024-11-19T09:51:10-05:00
originalPath:notes/bugs/Error-adding-file.md
originalLine:1
-->


