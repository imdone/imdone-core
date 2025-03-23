# #DOING ES Migration of imdone-core
<!--
order:-30
#esm-migration
-->

[Chat](https://chatgpt.com/share/67d08118-c930-8005-84d1-c29e324ae3b9)

Converting `imdone-core` from CommonJS (CJS) to TypeScript (TS) with ECMAScript Modules (ESM, `.mjs`) involves several steps. Since `imdone-core` is currently using CJS, you'll need to:

1. **Update `package.json` to Use ESM**
2. **Rename Files and Update Imports/Exports**
3. **Update `tsconfig.json` for ESM**
4. **Migrate Dependencies and Adjust Configuration**
5. **Test and Validate the Migration**

---

### **1. Update `package.json`**
Modify your `package.json` to specify ESM:

```json
{
  "type": "module",
  "main": "./dist/index.mjs",
  "exports": {
    "import": "./dist/index.mjs",
    "require": "./dist/index.cjs"
  },
  "scripts": {
    "build": "tsc"
  }
}
```

- `"type": "module"` tells Node.js that your project uses ESM.
- `"exports"` ensures compatibility with both ESM and CJS consumers.

If you still need CJS compatibility, you can compile dual builds (covered in Step 4).

---

### **2. Rename Files and Update Imports/Exports**
- Convert `.js` files to `.ts`
- Rename entry points from `.js` to `.mjs`
- Change `require()` to `import`

**Before (CJS)**
```js
const fs = require('fs');
const helper = require('./helper');
module.exports = { myFunction };
```

**After (ESM + TS)**
```ts
import fs from 'fs';
import * as helper from './helper.mjs';
export function myFunction() { ... }
```

For named exports:
```ts
export { myFunction, anotherFunction };
```

For default exports:
```ts
export default myFunction;
```

For dynamic imports (replacing `require()` where needed):
```ts
const module = await import('./someModule.mjs');
```

---

### **3. Update `tsconfig.json`**
Modify `tsconfig.json`:

```json
{
  "compilerOptions": {
    "module": "ESNext",
    "moduleResolution": "Node",
    "target": "ESNext",
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true,
    "declarationDir": "./dist",
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

---

### **4. Build and Output Dual CJS + ESM**
To support both module systems, update `package.json`:

```json
"exports": {
  "import": "./dist/index.mjs",
  "require": "./dist/index.cjs"
},
```

Modify `tsconfig.json` to build both formats:

```json
{
  "compilerOptions": {
    "module": "ESNext",
    "outDir": "./dist/esm",
    "declarationDir": "./dist/esm"
  }
}
```

Then, create a `tsconfig.cjs.json`:

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "module": "CommonJS",
    "outDir": "./dist/cjs",
    "declarationDir": "./dist/cjs"
  }
}
```

Update `package.json` scripts:

```json
"scripts": {
  "build": "tsc && tsc --project tsconfig.cjs.json"
}
```

---

### **5. Test the Migration**
- Run `npm run build`
- Check that `dist/index.mjs` and `dist/index.cjs` exist
- Test imports in both ESM and CJS:

**Test ESM**
```js
import { myFunction } from 'imdone-core';
myFunction();
```

**Test CJS**
```js
const { myFunction } = require('imdone-core');
myFunction();
```

lib
- [x] `├── ProjectContext.js`
- [ ] `├── adapters`
- [ ] `│   ├── __tests__`
- [x] `│   │   ├── date-time.spec.js`
- [x] `│   │   └── markdown.spec.js`
- [x] `│   ├── date-time.js`
- [x] `│   ├── file-gateway.js`
- [x] `│   ├── git-download.js`
- [x] `│   ├── markdown.js`
- [ ] `│   ├── parsers`
- [x] `│   │   ├── DateLanguageParser.js`
- [ ] `│   │   ├── __tests__`
- [x] `│   │   │   └── content-transformer.spec.js`
- [x] `│   │   ├── content-transformer.js`
- [ ] `│   │   ├── file`
- [x] `│   │   │   ├── LocalFileParserFactory.js`
- [x] `│   │   │   ├── ReadStreamCodeParser.js`
- [x] `│   │   │   ├── ReadStreamMarkdownParser.js`
- [x] `│   │   │   ├── ReadStreamTaskParser.js`
- [ ] `│   │   │   └── __tests__`
- [ ] `│   │   │       ├── LocalFileParser.spec.js`
- [ ] `│   │   │       ├── ReadStreamMarkdownParser.spec.js`
- [ ] `│   │   │       ├── code-file.js`
- [ ] `│   │   │       └── test-big-file.md`
- [x] `│   │   ├── function-parser.js`
- [ ] `│   │   └── task`
- [x] `│   │       ├── CardContentParser.js`
- [ ] `│   │       ├── CheckStyleTaskParser.js`
- [ ] `│   │       ├── CodeStyleTaskParser.js`
- [ ] `│   │       ├── HashStyleTaskParser.js`
- [ ] `│   │       ├── MarkdownStyleTaskParser.js`
- [ ] `│   │       ├── TaskParser.js`
- [ ] `│   │       └── __tests__`
- [x] `│   │           └── CardContentParser.spec.js`
- [ ] `│   ├── readers`
- [ ] `│   │   └── FileSystemProjectReader.js`
- [x] `│   ├── storage`
- [x] `│   │   ├── config.js`
- [x] `│   │   └── tags.js`
- [x] `│   └── yaml.js`
- [x] `├── card.js`
- [x] `├── config.js`
- [x] `├── constants.js`
- [ ] `├── context`
- [x] `│   ├── ApplicationContext.js`
- [ ] `│   └── StreamingApplicationContext.js`
- [ ] `├── controlers`
- [x] `│   ├── SaveViewController.js`
- [x] `│   └── __tests__`
- [x] `│       ├── SaveViewController.spec.js`
- [x] `│       └── repos`
- [x] `│           └── test`
- [x] `│               └── readme.md`
- [x] `├── default-settings.js`
- [x] `├── domain`
- [x] `│   ├── entities`
- [x] `│   │   ├── FileProjectContext.js`
- [x] `│   │   └── View.js`
- [x] `│   └── usecases`
- [x] `│       ├── GetViewsUsecase.js`
- [x] `│       ├── OpenProjectUsecase.js`
- [x] `│       ├── SaveViewUsecase.js`
- [x] `│       └── __tests__`
- [x] `│           ├── GetViewsUsecase.spec.js`
- [x] `│           ├── OpenProjectUsecase.spec.js`
- [x] `│           └── SaveViewUsecase.spec.js`
- [x] `├── file.js`
- [x] `├── languages.js`
- [x] `├── list.js`
- [x] `├── migrate-config.js`
- [x] `├── mixins`
- [x] `│   ├── repo-fs-store.js`
- [x] `│   └── repo-watched-fs-store.js`
- [x] `├── plugins`
- [x] `│   ├── archive-plugin.js`
- [x] `│   ├── default-board-actions-plugin.js`
- [x] `│   ├── default-board-properties-plugin.js`
- [x] `│   ├── epic-plugin.js`
- [x] `│   ├── extension-plugin.js`
- [x] `│   ├── persist-tags-plugin.js`
- [x] `│   ├── plugin-manager.js`
- [x] `│   └── plugin-registry.js`
- [x] `├── project-factory.js`
- [x] `├── project.js`
- [x] `├── repository.js`
- [x] `├── task.js`
- [x] `├── tools.js`
- [ ] `└── usecases`
- [ ] `    ├── __tests__`
- [ ] `    │   ├── get-project-tags.spec.js`
- [ ] `    │   └── get-tasks-in-file.spec.js`
- [ ] `    ├── get-imdone-url.js`
- [ ] `    ├── get-project-tags.js`
- [ ] `    └── get-tasks-in-file.js`

24 directories, 71 files

## Dependencies
lib/ProjectContext.js → lib/adapters/parsers/task/CardContentParser.js
lib/ProjectContext.js → lib/domain/entities/FileProjectContext.js
lib/adapters/__tests__/date-time.spec.js → lib/adapters/date-time.js
lib/adapters/__tests__/markdown.spec.js → lib/adapters/markdown.js
lib/adapters/markdown.js → path
lib/adapters/file-gateway.js → lib/tools.js
lib/adapters/file-gateway.js → fs
lib/adapters/file-gateway.js → path
lib/tools.js → crypto
lib/tools.js → path
lib/adapters/parsers/__tests__/content-transformer.spec.js → lib/adapters/parsers/content-transformer.js
lib/adapters/parsers/file/LocalFileParserFactory.js → lib/languages.js
lib/adapters/parsers/file/LocalFileParserFactory.js → lib/adapters/parsers/file/ReadStreamCodeParser.js
lib/adapters/parsers/file/LocalFileParserFactory.js → lib/adapters/parsers/file/ReadStreamMarkdownParser.js
lib/adapters/parsers/file/LocalFileParserFactory.js → fs
lib/adapters/parsers/file/LocalFileParserFactory.js → path
lib/adapters/parsers/file/ReadStreamCodeParser.js → lib/languages.js
lib/adapters/parsers/file/ReadStreamCodeParser.js → lib/adapters/parsers/task/CodeStyleTaskParser.js
lib/adapters/parsers/file/ReadStreamCodeParser.js → lib/adapters/parsers/file/ReadStreamTaskParser.js
lib/adapters/parsers/file/ReadStreamCodeParser.js → path
lib/adapters/parsers/file/ReadStreamCodeParser.js → stream
lib/adapters/parsers/task/CodeStyleTaskParser.js → lib/adapters/parsers/task/TaskParser.js
lib/adapters/parsers/file/ReadStreamTaskParser.js → readline
lib/adapters/parsers/file/ReadStreamMarkdownParser.js → lib/adapters/parsers/task/HashStyleTaskParser.js
lib/adapters/parsers/file/ReadStreamMarkdownParser.js → lib/adapters/parsers/task/MarkdownStyleTaskParser.js
lib/adapters/parsers/file/ReadStreamMarkdownParser.js → lib/adapters/parsers/file/ReadStreamTaskParser.js
lib/adapters/parsers/task/HashStyleTaskParser.js → lib/adapters/parsers/task/CardContentParser.js
lib/adapters/parsers/task/HashStyleTaskParser.js → lib/adapters/parsers/task/TaskParser.js
lib/adapters/parsers/task/MarkdownStyleTaskParser.js → lib/adapters/parsers/task/TaskParser.js
lib/adapters/parsers/file/__tests__/LocalFileParser.spec.js → lib/config.js
lib/adapters/parsers/file/__tests__/LocalFileParser.spec.js → lib/adapters/parsers/file/LocalFileParserFactory.js
lib/adapters/parsers/file/__tests__/LocalFileParser.spec.js → path
lib/config.js → lib/constants.js
lib/constants.js → path
lib/adapters/parsers/file/__tests__/ReadStreamMarkdownParser.spec.js → lib/config.js
lib/adapters/parsers/file/__tests__/ReadStreamMarkdownParser.spec.js → lib/adapters/parsers/file/ReadStreamMarkdownParser.js
lib/adapters/parsers/file/__tests__/ReadStreamMarkdownParser.spec.js → stream
lib/adapters/parsers/task/CheckStyleTaskParser.js → lib/adapters/parsers/task/TaskParser.js
lib/adapters/parsers/task/__tests__/CardContentParser.spec.js → lib/config.js
lib/adapters/parsers/task/__tests__/CardContentParser.spec.js → lib/constants.js
lib/adapters/parsers/task/__tests__/CardContentParser.spec.js → lib/adapters/parsers/task/CardContentParser.js
lib/adapters/readers/FileSystemProjectReader.js → lib/adapters/parsers/file/LocalFileParserFactory.js
lib/adapters/readers/FileSystemProjectReader.js → fs/promises
lib/adapters/readers/FileSystemProjectReader.js → path
lib/adapters/storage/config.js → lib/config.js
lib/adapters/storage/config.js → lib/constants.js
lib/adapters/storage/config.js → lib/adapters/file-gateway.js
lib/adapters/storage/config.js → lib/adapters/yaml.js
lib/adapters/storage/config.js → path
lib/adapters/storage/tags.js → lib/constants.js
lib/adapters/storage/tags.js → lib/adapters/file-gateway.js
lib/adapters/storage/tags.js → lib/adapters/yaml.js
lib/adapters/storage/tags.js → path
lib/card.js → lib/adapters/markdown.js
lib/card.js → lib/adapters/parsers/content-transformer.js
lib/card.js → lib/adapters/parsers/function-parser.js
lib/card.js → lib/task.js
lib/card.js → path
lib/task.js → lib/adapters/markdown.js
lib/task.js → lib/adapters/parsers/task/CardContentParser.js
lib/task.js → lib/tools.js
lib/task.js → util
lib/context/ApplicationContext.js → lib/config.js
lib/context/ApplicationContext.js → lib/plugins/plugin-registry.js
lib/plugins/plugin-registry.js → lib/adapters/markdown.js
lib/plugins/plugin-registry.js → https
lib/context/StreamingApplicationContext.js → lib/config.js
lib/controlers/SaveViewController.js → lib/context/ApplicationContext.js
lib/controlers/SaveViewController.js → lib/domain/usecases/SaveViewUsecase.js
lib/domain/usecases/SaveViewUsecase.js → lib/context/ApplicationContext.js
lib/domain/usecases/SaveViewUsecase.js → lib/domain/entities/View.js
lib/domain/usecases/SaveViewUsecase.js → lib/domain/usecases/GetViewsUsecase.js
lib/domain/usecases/SaveViewUsecase.js → crypto
lib/domain/usecases/GetViewsUsecase.js → lib/context/ApplicationContext.js
lib/domain/usecases/GetViewsUsecase.js → lib/list.js
lib/domain/usecases/GetViewsUsecase.js → lib/domain/entities/View.js
lib/controlers/__tests__/SaveViewController.spec.js → lib/domain/entities/View.js
lib/controlers/__tests__/SaveViewController.spec.js → lib/project-factory.js
lib/controlers/__tests__/SaveViewController.spec.js → lib/controlers/SaveViewController.js
lib/controlers/__tests__/SaveViewController.spec.js → path
lib/project-factory.js → lib/context/ApplicationContext.js
lib/project-factory.js → lib/mixins/repo-fs-store.js
lib/project-factory.js → lib/mixins/repo-watched-fs-store.js
lib/project-factory.js → lib/project.js
lib/project-factory.js → lib/ProjectContext.js
lib/project-factory.js → lib/repository.js
lib/mixins/repo-fs-store.js → lib/adapters/yaml.js
lib/mixins/repo-fs-store.js → lib/config.js
lib/mixins/repo-fs-store.js → lib/constants.js
lib/mixins/repo-fs-store.js → lib/file.js
lib/mixins/repo-fs-store.js → lib/languages.js
lib/mixins/repo-fs-store.js → lib/migrate-config.js
lib/mixins/repo-fs-store.js → lib/repository.js
lib/mixins/repo-fs-store.js → lib/tools.js
lib/mixins/repo-fs-store.js → fs
lib/mixins/repo-fs-store.js → path
lib/file.js → lib/adapters/date-time.js
lib/file.js → lib/adapters/parsers/task/CardContentParser.js
lib/file.js → lib/card.js
lib/file.js → lib/context/ApplicationContext.js
lib/file.js → lib/languages.js
lib/file.js → lib/task.js
lib/file.js → lib/tools.js
lib/file.js → crypto
lib/file.js → events
lib/file.js → path
lib/file.js → util
lib/migrate-config.js → lib/default-settings.js
lib/migrate-config.js → path
lib/default-settings.js → lib/adapters/yaml.js
lib/repository.js → lib/adapters/parsers/DateLanguageParser.js
lib/repository.js → lib/adapters/parsers/task/CardContentParser.js
lib/repository.js → lib/card.js
lib/repository.js → lib/config.js
lib/repository.js → lib/constants.js
lib/repository.js → lib/context/ApplicationContext.js
lib/repository.js → lib/file.js
lib/repository.js → lib/languages.js
lib/repository.js → lib/list.js
lib/repository.js → lib/task.js
lib/repository.js → lib/tools.js
lib/repository.js → events
lib/repository.js → path
lib/repository.js → util
lib/mixins/repo-watched-fs-store.js → lib/constants.js
lib/mixins/repo-watched-fs-store.js → lib/file.js
lib/mixins/repo-watched-fs-store.js → lib/mixins/repo-fs-store.js
lib/mixins/repo-watched-fs-store.js → fs
lib/project.js → lib/adapters/date-time.js
lib/project.js → lib/adapters/file-gateway.js
lib/project.js → lib/adapters/markdown.js
lib/project.js → lib/adapters/parsers/content-transformer.js
lib/project.js → lib/adapters/parsers/function-parser.js
lib/project.js → lib/card.js
lib/project.js → lib/constants.js
lib/project.js → lib/plugins/plugin-manager.js
lib/project.js → lib/repository.js
lib/project.js → lib/task.js
lib/project.js → child_process
lib/project.js → path
lib/plugins/plugin-manager.js → lib/adapters/file-gateway.js
lib/plugins/plugin-manager.js → lib/adapters/git-download.js
lib/plugins/plugin-manager.js → lib/context/ApplicationContext.js
lib/plugins/plugin-manager.js → events
lib/plugins/plugin-manager.js → path
lib/domain/usecases/OpenProjectUsecase.js → lib/context/ApplicationContext.js
lib/domain/usecases/__tests__/OpenProjectUsecase.spec.js → lib/context/ApplicationContext.js
lib/domain/usecases/__tests__/OpenProjectUsecase.spec.js → lib/domain/usecases/OpenProjectUsecase.js
lib/domain/usecases/__tests__/SaveViewUsecase.spec.js → lib/context/ApplicationContext.js
lib/domain/usecases/__tests__/SaveViewUsecase.spec.js → lib/domain/usecases/SaveViewUsecase.js
lib/plugins/archive-plugin.js → lib/adapters/parsers/task/CardContentParser.js
lib/plugins/archive-plugin.js → path
lib/plugins/default-board-properties-plugin.js → lib/adapters/date-time.js
lib/plugins/default-board-properties-plugin.js → path
lib/plugins/extension-plugin.js → fs
lib/plugins/extension-plugin.js → path
lib/plugins/persist-tags-plugin.js → lib/adapters/storage/tags.js
lib/usecases/__tests__/get-project-tags.spec.js → test/helper.js
lib/usecases/__tests__/get-project-tags.spec.js → lib/project-factory.js
lib/usecases/__tests__/get-project-tags.spec.js → lib/usecases/get-project-tags.js
lib/usecases/__tests__/get-project-tags.spec.js → path
test/helper.js → path
lib/usecases/get-project-tags.js → lib/adapters/storage/config.js
lib/usecases/get-project-tags.js → lib/adapters/storage/tags.js
lib/usecases/__tests__/get-tasks-in-file.spec.js → test/helper.js
lib/usecases/__tests__/get-tasks-in-file.spec.js → lib/usecases/get-tasks-in-file.js
lib/usecases/__tests__/get-tasks-in-file.spec.js → fs
lib/usecases/__tests__/get-tasks-in-file.spec.js → path
lib/usecases/get-tasks-in-file.js → lib/adapters/parsers/file/LocalFileParserFactory.js
lib/usecases/get-tasks-in-file.js → lib/adapters/storage/config.js
lib/usecases/get-tasks-in-file.js → stream
