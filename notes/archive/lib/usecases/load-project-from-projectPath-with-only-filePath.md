#DONE  load project from projectPath with only filePath
- [x] Create a new method in in the project factory that creates a project with a single file
    - files:
       - [project-factory](../project-factory.js)
       - [repo](../repository.js)
       - [repo-fs-store](../mixins/repo-fs-store.js)
    - goal: getProjectWithFile should return the result of the new method in project-factory
    - constraints:
        - Use the same approach as createFileSystemProject in project-factory.js
        - If a new mixin/fs-store is needed, create it in mixins/
        - Ensure that only the specified file is loaded into the project
        - Tests should be added to __tests__ in the same directory as the file under test
        - Tests should follow patterns of other tests in the __tests__ directory
    - action: apply patch and show diffs
use project-factory to load the project with just this file
overload repo.getFilesInPath to only return the specified file
<!--
order:0
completed:2025-11-04T15:59:59-05:00
archived:true
archivedAt:2025-11-04T15:59:59-05:00
originalPath:lib/usecases/get-project-with-file.js
originalLine:12
-->



