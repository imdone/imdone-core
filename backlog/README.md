imdone backlog
====

This directory contains folders for each backlog item.

## Work on a story
### After collaborative design, import a story and story tasks from markdown
```bash
npx imdone import story < <story markdown file>
```
- [ ] `./backlog` is the default project folder
- [ ] Initialize imdone in the backlog folder
- [ ] `<story-id>` should be the markdown title
- [ ] On import always remove the contents of the `backlog/story/<story-id>`

### Day to day work after collaborative story design

#### List tasks in a story
```bash
npx imdone ls -p backlog -s <story-id>
``` 
- [ ] `./backlog` is the default project folder
- [ ] If the current branch starts with `story/`, parse the story id from the branch name
- [ ] Can also pass in the story id with the `-s <story-id> option
- [ ] Can also use the filter option

#### List tasks in a story and group
```bash
npx imdone ls -p backlog -s <story-id> -g <group>
``` 
- [ ] `./backlog` is the default project folder
- [ ] If the current branch starts with `story/`, parse the story id and group from the branch name
- [ ] Can also use the filter option

#### Update task
```bash
npx imdone update task -p backlog -g <new group> <task-id> <new text>
```
- [ ] This should move a task to a different group and/or change it's text

#### Start a task
```bash
npx imdone start -p backlog <task-id>
```
- [ ] This should find the task and create a branch off of main named `story/<sid>/<group>/<task id>/<task filname>`
- [ ] If the branch exists, check it out

#### Add breadcrumbs for the next developer or ensemble
1. Open the file with the same name as the branch under backlog and add content!!!
2. commit and push the branch or run `mob done`

#### Complete a task
```bash
npx imdone done
```

## Adding tasks without import

### Initializing a backlog
```bash
npx imdone init -p backlog
```
- [ ] `./backlog` is the default project folder
- [ ] Make `devops/imdone` the defaults for init

### Add a story
Run this from the root of the project to add a story
```bash
npx imdone add story -p backlog -s <story id> -l BACKLOG "Add a story from the command line" 
```
- [ ] `./backlog` is the default project folder
- [ ] This should initialize a new imdone project in `backlog/<story-id>` and return the meta sid
- [ ] The task should be in `backlog/story/<story-id>/README.md`
- [ ] The task should have `task-id:<random 5 char string>` meta and `story` tag

### Add a story task
```bash
npx imdone add task -p backlog -s <story-id> -l TODO "Add a story task from the command line"
```
- [ ] `./backlog` is the default project folder
- [ ] This should initialize a new imdone project in `backlog/story/<story-id>/ungrouped`, containing a task with `task-id:<random 5 char string>` and `story-id:<story-id` meta and return the <task-id>
- [ ] use default list if no list is present

### List task groups for a story
Use ls to list the directories in `backlog/story/<story-id>`

### Add a story task to a group
```bash
npx imdone add task -p backlog -s <story sid> -g "<task group>" -l TODO "Add a story task with group from the command line"
```
- [ ] `./backlog` is the default project folder
- [ ] This should initialize a new imdone project in `backlog/story/<story sid>/<task group>`, containing a task with `story-id:<story-id>`, `group:<task group>` and `task-id:<random 5 char string>` meta and return the <task-id>
- [ ] use default list if no list is present
