imdone-core
===========

[![NPM](https://nodei.co/npm/imdone-core.png)](https://nodei.co/npm/imdone-core/)

[![Build Status](https://travis-ci.org/imdone/imdone-core.png?branch=master)](https://travis-ci.org/imdone/imdone-core)
[![Downloads](https://img.shields.io/npm/dm/imdone-core.svg)](https://npmjs.org/package/imdone-core)
[![Stories in Ready](https://badge.waffle.io/imdone/imdone-core.png?label=ready&title=Ready)](https://waffle.io/imdone/imdone-core)

**Organize TODO, FIXME, HACK, etc. comments in code or any text file.**

Initializing a Repository
----
```
var Repo        = require('imdone-core/lib/repository'),
    FsStore     = require('imdone-core/lib/mixins/repo-watched-fs-store');

var repo = FsStore(new Repo('path/to/my/project'));

repo.on('initialized', function() {
  // do something with the repo...
  var lists = repo.getLists();
  lists.forEach(function(list) {
    var listTasks = repo.getTasksInList(list.name);
  });

  var tasks = repo.getTasks();
});

repo.on('file.update', function(file) {
  // Do something usefull
});

repo.on('config.update', function() {
  // Do something usefull
});
```

Task formats
----

### Code Style
<pre>
// TODO This is a task
// TODO: This is a task
// TODO:5 This is a task
</pre>

### Hash Style
<pre>
&#35;TODO: This is a task
&#35;TODO:0 This is a task
&#35;to-do:0 This is a task
</pre>

### Markdown Style
<pre>
&#91;This is a task&#93;&#40;&#35;todo:&#41;
&#91;This is a task&#93;&#40;&#35;todo:10&#41;
</pre>

Task syntax
----
- Code style tasks are intended to be used to capture existing tasks in code, so hash or markdown style should be used for new tasks
- Code style tasks will only be detected if the list name matches a string in the `code.include_lists` attribute in `.imdone/config.json` and the file extension exists in lib/languages.js.
- List names in code style tasks must be at least 2 uppercase letters or underscores
- In Hash and markdown style tasks **list name** can be any combination of upper and lower case letters, underscores and dashes
- In Hash and markdown style tasks the **list name** must be followed by a `:` and a number which determines sort order in the list
  - Sort numbers can be reused, in which case tasks with the same sort number will be sorted alphabetically by text.
- In code, tasks can be any style but must be in a line or block comment
  - Code style tasks are only detected in comments for files with extensions listed in [imdone-core/languages.js](https://github.com/imdone/imdone-core/blob/master/lib/languages.js) or the **languages** attribute in the `.imdone/config.json`
  - When a code style task is moved, all code style tasks in affected lists are rewitten as hash style tasks
- For code and hash style tasks, the task text is terminated by the end of line
- Task text can have [todo.txt formatting](https://github.com/ginatrapani/todo.txt-cli/wiki/The-Todo.txt-Format) but not todo.txt priority
- Task text can have markdown formatting

todo.txt syntax
----

### Create date
<pre>
&#35;DOING:20 2015-02-09 This task was created on 2015-02-09
</pre>

### Completed date
<pre>
&#35;DOING:20 x 2015-02-09 2015-02-08 This task was created on 2015-02-08 and completed on 2015-02-09
</pre>

### Due Date
<pre>
&#35;doing:20 This task is due on 2015-02-09 due:2015-02-09
</pre>

### Tags (todo.txt projects)
<pre>
&#35;doing:20 This task has a &#42;madjs&#42; tag +madjs
</pre>

### Context
<pre>
&#35;doing:20 This task has a &#42;madjs&#42; context @madjs
</pre>

### Metadata
<pre>
&#35;doing:20 This task has profile metadata profile:piascikj
</pre>

Metadata links
----
- Tasks with metadata can be linked to external resources like other task mgmt systems and websites
- Add a `meta` attribute to `.imdone/config.json`
- In this example `user:piascikj` would link to <https://github.com/piascikj>  

```javascript
  "meta": {
    "user": {
      "urlTemplate": "https://github.com/%s",
      "titleTemplate": "github profile for %s"
    }
  }
```

Things yet to be done...
----
1. [Use [visionmedia/dox](https://github.com/visionmedia/dox), [smartcomments/smartcomments](https://github.com/smartcomments/smartcomments) and [JSDoc](http://usejsdoc.org) for documenting the following... +doc](#TODO:)
  - Project
  - Repository
  - File
  - Task
  - List
  - Config

- [Use [gajus/gitdown](https://github.com/gajus/gitdown) for docs +doc](#BACKLOG:)


License
----

[MIT](LICENSE)

[npm-image]: https://img.shields.io/npm/v/imdone-core.svg
[npm-url]: https://npmjs.org/package/imdone-core
[downloads-image]: https://img.shields.io/npm/dm/imdone-core.svg
[downloads-url]: https://npmjs.org/package/imdone-core
[travis-image]: https://img.shields.io/travis/imdone/imdone-core/master.svg?label=linux
[travis-url]: https://travis-ci.org/imdone/imdone-core
