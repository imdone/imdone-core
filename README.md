imdone-core
===========
[![Build Status](https://travis-ci.org/imdone/imdone-core.png?branch=master)](https://travis-ci.org/imdone/imdone-core)

The heart of imdone seperated from it's outer layer to allow embedding in other projects.


Things yet to be done...
----
1. [Use [visionmedia/dox](https://github.com/visionmedia/dox), [smartcomments/smartcomments](https://github.com/smartcomments/smartcomments) and [JSDoc](http://usejsdoc.org) for documenting the following...](#DOING:10)
  - Project
  - Repository
  - File
  - Task
  - List
  - Config

2. [Add plugin capability](#DONE:10)
- Config
```js
{
    ...
    plugins: {
        "npm package name": {plugin specific config}
    }
}
```
- Install with npm install
