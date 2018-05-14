[![npm version](https://badge.fury.io/js/imdone-core.svg)](https://badge.fury.io/js/imdone-core)
[![Downloads](https://img.shields.io/npm/dm/imdone-core.svg)](https://npmjs.org/package/imdone-core)
[![Build Status](https://travis-ci.org/imdone/imdone-core.png?branch=master)](https://travis-ci.org/imdone/imdone-core)

Imdone is text based kanban processor with a simple syntax that uses [comment tags like TODO and FIXME](https://en.wikipedia.org/wiki/Comment_%28computer_programming%29#Tags) and [todo.txt format](https://github.com/todotxt/todo.txt#todotxt-format). This model allows the user to create and modify tasks using the keyboard and automatically establishes a link between their tasks and work.  Get [imdone-atom](https://atom.io/packages/imdone-atom) for [Atom editor](https://atom.io) to see your projects board and this library in action.

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->


- [Imdone format](#imdone-format)
  - [Code Style](#code-style)
  - [Hash Style](#hash-style)
  - [Markdown Style](#markdown-style)
  - [Task syntax](#task-syntax)
  - [todo.txt syntax examples](#todotxt-syntax-examples)
    - [Create date](#create-date)
    - [Completed date](#completed-date)
    - [Due Date](#due-date)
    - [Tags (todo.txt projects)](#tags-todotxt-projects)
    - [Context](#context)
    - [Metadata](#metadata)
      - [Metadata links](#metadata-links)
- [Resources](#resources)
- [License](#license)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Imdone format
Imdone aims to keep you in the flow of your work while capturing tasks to be accomplished later.  Most kanban tools require the user to use a UI.  Imdone lets you capture tasks in a simple text format that has roots in programming [comment tags like TODO and FIXME](https://en.wikipedia.org/wiki/Comment_%28computer_programming%29#Tags) and [todo.txt format](https://github.com/todotxt/todo.txt#todotxt-format).

### Code Style
<pre class="language-javascript">
// TODO This is a task
// TODO: This is a task
// TODO:5 This is a task
// TODO: A task with a descrption looks like this.
// Every line after the task is part of the description until we find another
// task, a blank comment line, or a line of code
// - A list item
// - Another list item
</pre>

### Hash Style
<pre class="language-markdown">
&#35;TODO: This is a task
&#35;TODO:0 This is a task
&#35;to-do:0 This is a task

&lt;!--
&#35;TODO: If you don't want your task to get converted to html in markdown files, put it in a comment.
You can still add descriptive text, but don't forget to leave a blank line
between the description and the comment end tag, or the comment end will become
a part of your description.

 --&gt;
</pre>

Take a look at the source of this README.md.  You'll probably find a few tasks in comments.

### Markdown Style
<pre class="language-markdown">
&#91;This is a task&#93;&#40;&#35;todo:&#41;
&#91;This is a task&#93;&#40;&#35;todo:10&#41;
</pre>

### Task syntax
- Code style tasks will only be detected if the list name matches a string in the `code.include_lists` attribute in `.imdone/config.json` and the file extension exists in lib/languages.js.
- List names in code style tasks must match this regular expression ([A-Z]+[A-Z-_]+?).
- In Hash and markdown style tasks **list name** can be any combination of upper and lower case letters, underscores and dashes
- In Hash and markdown style tasks the **list name** must be followed by a `:` and a number which determines sort order in the list
  - Sort numbers can be reused, in which case tasks with the same sort number will be sorted alphabetically by text.
- In code, tasks can be any style but must be in a line or block comment
  - Code style tasks are only detected in comments for files with extensions listed in [imdone-core/languages.js](https://github.com/imdone/imdone-core/blob/master/lib/languages.js) or the **languages** attribute in the `.imdone/config.json`
- For code and hash style tasks, the task text is terminated by the end of line
- Task text can have [todo.txt formatting](https://github.com/todotxt/todo.txt) excluding the completion and priority markers.
- Task text can have markdown formatting

<!--  DOING: Add a section about descriptions
### Task Descriptions
Task descriptions are captured from the lines that follow a task.  In code files a description ends when imdone encounters another task or code.  In non-code files the description ends when imdone encounters another task or a blank line.
-->

### todo.txt syntax examples
Imdone uses todo.txt +project/tag @context and meta:data

#### Create date
<pre class="language-markdown">
&#35;DOING:20 This task was created on 2018-02-09 created:2018-02-09
</pre>

#### Completed date
<pre class="language-markdown">
&#35;DOING:20 This task was completed on 2018-02-09 completed:2018-02-09
</pre>

#### Due Date
<pre class="language-markdown">
&#35;doing:20 This task is due on 2015-02-09 due:2015-02-09
</pre>

#### Tags (todo.txt projects)
<pre class="language-markdown">
&#35;doing:20 This task has a &#42;madjs&#42; tag +madjs
</pre>

#### Context
<pre class="language-markdown">
&#35;doing:20 This task has a &#42;madjs&#42; context @madjs
</pre>

#### Metadata
<pre class="language-markdown">
&#35;doing:20 This task has profile metadata profile:piascikj
</pre>

##### Metadata links
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
<!--
#TODO: Add Node.js API SECTION id:28 gh:129 ic:gh
## Node.js API
### Generated Docs
- use [jsdoc3/jsdoc: An API documentation generator for JavaScript.](https://github.com/jsdoc3/jsdoc)
### Examples
- use links to github [examples](https://github.com/imdone-core/tree/master/examples)

-->

<!--
#TODO: Add Contributing Section id:29 gh:130 ic:gh
## Contributing
### Build and Test
### FAQs and BUGs

-->

Resources
----
- [I Still Use Plain Text for Everything, and I Love It](https://lifehacker.com/i-still-use-plain-text-for-everything-and-i-love-it-1758380840)
- [Why Geeks Love Plain Text (And Why You Should Too)](http://www.lifehack.org/articles/technology/why-geeks-love-plain-text-and-why-you-should-too.html)
- [The Benefits of Using Plain Text | Terminally Incoherent](http://www.terminally-incoherent.com/blog/2007/07/18/the-benefits-of-using-plain-text/)
- [The future of education is plain text · Simply Statistics](https://simplystatistics.org/2017/06/13/the-future-of-education-is-plain-text/)
  - [The future of education is plain text | Hacker News](https://news.ycombinator.com/item?id=14545250)
- [Derry Birkett › Plain text is the best UX](http://derrybirkett.com/comment/plain-text-is-the-best-ux/)
- [Tools – The Plain Text Project](https://plaintextproject.online/tools.html)
- [The Plain Text Workflow · Richard A. Lent, Ph.D.](https://richardlent.github.io/post/the-plain-text-workflow/)
- [My Plain Text Workflow – Doyce Testerman](http://doycetesterman.com/index.php/2014/12/my-plain-text-workflow/)
- [Word Processors: Stupid and Inefficient](http://ricardo.ecn.wfu.edu/~cottrell/wp.html)
- [Is the keyboard faster than the mouse? | Hacker News](https://news.ycombinator.com/item?id=14544571)
- [Blog | Personal Kanban](http://personalkanban.com/pk/blog/)
- [Do TODO comments make sense? - Software Engineering Stack Exchange](https://softwareengineering.stackexchange.com/questions/125320/do-todo-comments-make-sense)

License
----

[MIT](LICENSE)

[npm-image]: https://img.shields.io/npm/v/imdone-core.svg
[npm-url]: https://npmjs.org/package/imdone-core
[downloads-image]: https://img.shields.io/npm/dm/imdone-core.svg
[downloads-url]: https://npmjs.org/package/imdone-core
[travis-image]: https://img.shields.io/travis/imdone/imdone-core/master.svg?label=linux
[travis-url]: https://travis-ci.org/imdone/imdone-core

<!--
- #TODO: As a vscode user I would like to see the imdone board in vscode so I can get shit done! id:30 gh:132 ic:gh

-->
