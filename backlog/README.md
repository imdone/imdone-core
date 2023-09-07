imdone backlog
====

This directory contains folders for each backlog item.

## Work on a story
### After collaborative design, import a story and story tasks from markdown
```bash
npx imdone import <<EOF                                                                    ─╯
# story-id

This is the story description.

## Tasks
- [ ] An unfinished task 

### Phase one (Interfaces)
- [x] A task in phase one
- [ ] Another task in phase one
    - [ ] A sub task in phase one
    Some more data about the task

### Phase two (Implementation)
- [ ] A task in phase two
EOF
```
- [x] `./backlog` is the default project folder
- [x] Initialize imdone in the backlog folder
- [x] `<story-id>` should be the markdown title
- [x] On import always remove the contents of the `backlog/story/<story-id>`
- [x] Shold handle a file with the following format
- [ ] Make sure checked items are put in DONE list
```markdown
# <story-id>

This is the story summary

## Tasks
- [ ] An ungrouped task

### <group>
- [ ] A task in a group

### <group>
- [ ] A task in a group
```
- [x] use `markdown-it.parse` to create AST
- [x] Save story-id project path so it's available for starting a task

### Day to day work after collaborative story design

#### Start a task
```bash
npx imdone start <task-id>
```
- [ ] This should find the task and create a branch off of main named `story/<sid>/<group>/<task id>/<task filname>`
- [ ] If the branch exists, check it out
- [ ] Set the task id in session so we know what to close
- [ ] Save the branch name in session so we can check it out again

#### Add breadcrumbs for the next developer or ensemble
1. Open the file with the same name as the branch under backlog and add content!!!
2. commit and push the branch or run `mob done`

#### Complete a task
```bash
npx imdone done
```

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

##### With the CLI
```bash
npx imdone update task -p backlog -g <new group> <task-id> <new text>
```
- [ ] This should move a task to a different group and/or change it's text

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
- [ ] This should initialize a new imdone project in `backlog/<story-id>`
- [ ] Create a task for the story and return the meta sid
- [ ] The task should be in `backlog/story/<story-id>/README.md`
- [ ] The task should have `task-id:<random 5 char string>` meta and `story` tag

### Add a story task
```bash
npx imdone add task -p backlog -s <story-id> -l TODO "Add a story task from the command line"
```
- [ ] `./backlog` is the default project folder
- [ ] This should initialize a new imdone project in `backlog/story/<story-id>/ungrouped`, containing a task with `task-id:<random 5 char string>` and `story-id:<story-id>` meta and return the <task-id>
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

#### With the UI
- Open the story folder as a project in imdone
- Under board actions select the **Create task in <group>** from the menu

