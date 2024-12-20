
## Plan a story
```mermaid
gitGraph
    commit
    commit
    branch story/123
    checkout story/123
    commit id: "add story project `backlog/stories/123`"
    commit id: "Move story to DOING"
    commit id: "Plan story with tasks `backlog/stories/123/tasks`"
    commit id: "Add diagram for story"
    commit id: "Add task list and DoD to `backlog/stories/123/tasks/README.md`"
    checkout main
    commit
    commit
    commit
    checkout story/123
    merge main
    branch story/123/tasks/a-task-on-story123
    checkout story/123/tasks/a-task-on-story123
    commit id: "start `backlog/stories/123/tasks/a-task-on-story123.md`"
    commit id: "Add digram for task"
    commit
    commit id: "complete `backlog/stories/123/tasks/a-task-on-story123.md`"
    checkout main
    merge story/123/tasks/a-task-on-story123
```

## Plan a story flow
```mermaid
flowchart
  start((Plan a story CLI))
    --> askForStoryId(Prompt for storyId)
    --> changesExist{Are there local changes?}
  
  startUI((Plan a story UI))
    --> changesExist{Are there local changes?}

  checkoutDefaultBranch(Checkout default branch)
    --> fetch(Fetch --all)
    --> pullDefaultBranch(Pull default branch with force)
    --> storyBranchExists{Does story branch exist?}

  mergeDefaultBranch(Merge default branch)
    --> createStoryProject(Create story project)
    --> moveStoryToDOING(Move story to DOING)
    --> promptForStoryTasks(Prompt for story tasks 'CLI only')
    --> addTaskFilesToStory(Add task and DoD files to story)
    --> addTasksAndDoDToReadme(Add imdone tasks and DoD in story project \n to `tasks/README.md` reporting file)
    --> commitAndPushStoryBranch(Commit and push story branch with force)

  changesExist
    -- yes --> 
      gitStash(Git stash)
      --> checkoutDefaultBranch
  changesExist
    -- no -->
      checkoutDefaultBranch

  storyBranchExists 
    -- yes -->
      checkoutStoryBranch(Checkout story branch)
      --> pullStoryBranch(Pull story branch with force)
      --> mergeDefaultBranch
  storyBranchExists 
    -- no -->
      createAndCheckoutStoryBranch(Create and checkout story branch)
      --> mergeDefaultBranch
```

## Convert a card with tasks to a story with tasks

- `task.text` becomes story title
  - if `story-id` meta is not set, the `task.text` is used as `story-id`
- First paragraph is story content
- Process tasks in the same way as command line
- Regenerate tasks from files in `tasks` every time one changes
- disable check in UI

```markdown
This is the story title

This is the story description

## Tasks

- [ ] Ungrouped task a
- [ ] Ungrouped task b
- [ ] Ungrouped task c

### Group 1

- [ ] Group 1 task a
- [ ] Group 1 task b
- [ ] Group 1 task c

### Group 2

- [ ] Group 2 task a
- [ ] Group 2 task b
- [ ] Group 2 task c

<!-- use title as story-id if it's falsy -->
```