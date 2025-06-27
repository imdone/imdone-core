import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import { createFileSystemProject } from '../project-factory';
import { getFreshRepoTestData } from './helper';

const {rm} = fs.promises
describe('project', function () {
  let project, repo, defaultCardsDir

  beforeEach(async () => {
    defaultCardsDir = await getFreshRepoTestData('default-cards')
   
    project = createFileSystemProject({
      path: defaultCardsDir,
      loadInstalledPlugins: () => {},
      loadPluginsNotInstalled: () => {}
    })
    repo = project.repo
  })

  afterEach(async () => {
    await project.destroy()
    await rm(defaultCardsDir, {recursive: true})
  })

  it('sorts according to due date when the default view filter has +dueDate', async function () {
    await project.init()
    project.defaultFilter = 'dueDate < "${tomorrow at 6AM}" AND list != DONE +dueDate +order'
    const imdoneJson = await project.toImdoneJSON()
    expect(imdoneJson.lists[2].tasks[0].text).to.equal('If you have any questions, feel free to reach out!')
    expect(imdoneJson.lists[2].tasks[11].text).to.equal('Get started with imdone')
  })

  describe('addTaskToFile', () => {
    it('adds a task to a file', async function () {
      await project.init()
      const { task } = await project.addTaskToFile({
        path: 'imdone-readme.md',
        list: 'TODO',
        content: 'New task'
      })
      expect(task.text).to.equal('New task')
    })
    it('adds a task to a file and moves it to the bottom of the list', async function () {
      await project.init()
      project.config.settings.cards.addNewCardsToTop = false
      const list = 'TODO'
      const { task } = await project.addTaskToFile({
        path: 'imdone-readme.md',
        list,
        content: 'New task'
      })
      const todoList = project.lists.find(l => l.name === list)
      const tasks = todoList.tasks

      expect(task.text).to.equal('New task')
      expect(tasks[tasks.length - 1].text).to.equal('New task')})
  })

  describe('addMetaToContent', () => {
    beforeEach(async () => {
      await project.init()
    })

    describe('array format (legacy)', () => {
      it('should add metadata to content with array format', () => {
        const content = 'Task content\n<!-- comment -->';
        const meta = [
          { key: 'priority', value: 'high' },
          { key: 'assignee', value: 'john' }
        ];

        const result = project.addMetaToContent(meta, content);
        
        expect(result).toContain('priority:high');
        expect(result).toContain('assignee:john');
      });

      it('should handle empty array', () => {
        const content = 'Task content\n<!-- comment -->';
        const meta = [];

        const result = project.addMetaToContent(meta, content);
        
        expect(result).toBe(content);
      });

      it('should quote values with spaces', () => {
        const content = 'Task content\n<!-- comment -->';
        const meta = [
          { key: 'status', value: 'in progress' },
          { key: 'priority', value: 'high' }
        ];

        const result = project.addMetaToContent(meta, content);
        
        expect(result).toContain('status:"in progress"');
        expect(result).toContain('priority:high');
      });

      it('should not quote values that are already quoted', () => {
        const content = 'Task content\n<!-- comment -->';
        const meta = [
          { key: 'status', value: '"already quoted"' },
          { key: 'note', value: "'single quoted'" }
        ];

        const result = project.addMetaToContent(meta, content);
        
        expect(result).toContain('status:"already quoted"');
        expect(result).toContain("note:'single quoted'");
      });

      it('should skip metadata that already exists in content', () => {
        const content = 'Task content\n<!-- priority:high -->';
        const meta = [
          { key: 'priority', value: 'high' },
          { key: 'assignee', value: 'john' }
        ];

        const result = project.addMetaToContent(meta, content);
        
        // Should only add assignee, not duplicate priority
        expect(result).toContain('assignee:john');
        expect((result.match(/priority:high/g) || []).length).toBe(1);
      });

      it('should replace existing metadata with new value', () => {
        const content = 'Task content\n<!-- priority:low -->';
        const meta = [
          { key: 'priority', value: 'high' }
        ];

        const result = project.addMetaToContent(meta, content);
        
        expect(result).toContain('priority:high');
        expect(result).not.toContain('priority:low');
      });
    });

    describe('object format (new)', () => {
      it('should add metadata to content with object format', () => {
        const content = 'Task content\n<!-- comment -->';
        const meta = {
          priority: ['high'],
          assignee: ['john']
        };

        const result = project.addMetaToContent(meta, content);
        
        expect(result).toContain('priority:high');
        expect(result).toContain('assignee:john');
      });

      it('should handle multiple values for same key', () => {
        const content = 'Task content\n<!-- comment -->';
        const meta = {
          tags: ['urgent', 'important'],
          assignee: ['john', 'jane']
        };

        const result = project.addMetaToContent(meta, content);
        
        expect(result).toContain('tags:urgent');
        expect(result).toContain('tags:important');
        expect(result).toContain('assignee:john');
        expect(result).toContain('assignee:jane');
      });

      it('should handle single values (not in array)', () => {
        const content = 'Task content\n<!-- comment -->';
        const meta = {
          priority: 'high',
          assignee: 'john',
          tags: ['urgent', 'important']
        };

        const result = project.addMetaToContent(meta, content);
        
        expect(result).toContain('priority:high');
        expect(result).toContain('assignee:john');
        expect(result).toContain('tags:urgent');
        expect(result).toContain('tags:important');
      });

      it('should handle empty object', () => {
        const content = 'Task content\n<!-- comment -->';
        const meta = {};

        const result = project.addMetaToContent(meta, content);
        
        expect(result).toBe(content);
      });

      it('should handle object with empty arrays', () => {
        const content = 'Task content\n<!-- comment -->';
        const meta = {
          priority: [],
          assignee: ['john']
        };

        const result = project.addMetaToContent(meta, content);
        
        expect(result).not.toContain('priority:');
        expect(result).toContain('assignee:john');
      });

      it('should quote values with spaces in object format', () => {
        const content = 'Task content\n<!-- comment -->';
        const meta = {
          status: ['in progress'],
          description: 'long description with spaces',
          priority: ['high']
        };

        const result = project.addMetaToContent(meta, content);
        
        expect(result).toContain('status:"in progress"');
        expect(result).toContain('description:"long description with spaces"');
        expect(result).toContain('priority:high');
      });
    });

    describe('edge cases and error handling', () => {
      it('should handle null meta', () => {
        const content = 'Task content\n<!-- comment -->';
        const meta = null;

        const result = project.addMetaToContent(meta, content);
        
        expect(result).toBe(content);
      });

      it('should handle undefined meta', () => {
        const content = 'Task content\n<!-- comment -->';
        const meta = undefined;

        const result = project.addMetaToContent(meta, content);
        
        expect(result).toBe(content);
      });

      it('should handle empty string content', () => {
        const content = '';
        const meta = { priority: ['high'] };

        const result = project.addMetaToContent(meta, content);
        
        expect(result).toContain('priority:high');
      });

      it('should handle content without comments', () => {
        const content = 'Task content without comments';
        const meta = { priority: ['high'] };

        const result = project.addMetaToContent(meta, content);
        
        expect(result).toContain('priority:high');
      });

      it('should handle special characters in values', () => {
        const content = 'Task content\n<!-- comment -->';
        const meta = {
          url: ['https://example.com?param=value&other=test'],
          email: ['user@domain.com'],
          path: ['/path/to/file.txt']
        };

        const result = project.addMetaToContent(meta, content);
        
        expect(result).toContain('url:https://example.com?param=value&other=test');
        expect(result).toContain('email:user@domain.com');
        expect(result).toContain('path:/path/to/file.txt');
      });

      it('should handle numeric values', () => {
        const content = 'Task content\n<!-- comment -->';
        const meta = {
          order: [1],
          priority: 5,
          percentage: [75.5]
        };

        const result = project.addMetaToContent(meta, content);
        
        expect(result).toContain('order:1');
        expect(result).toContain('priority:5');
        expect(result).toContain('percentage:75.5');
      });

      it('should handle boolean values', () => {
        const content = 'Task content\n<!-- comment -->';
        const meta = {
          completed: [true],
          archived: false
        };

        const result = project.addMetaToContent(meta, content);
        
        expect(result).toContain('completed:true');
        expect(result).toContain('archived:false');
      });
    });

    describe('integration with Task.parseMetaData and Task.removeMetaData', () => {
      it('should properly interact with existing metadata parsing', () => {
        const content = 'Task content\n<!-- priority:low assignee:jane -->';
        const meta = { 
          priority: ['high'],  // Should replace existing
          status: ['active']   // Should add new
        };

        const result = project.addMetaToContent(meta, content);
        
        expect(result).toContain('priority:high');
        expect(result).not.toContain('priority:low');
        expect(result).toContain('status:active');
        expect(result).toContain('assignee:jane'); // Should preserve existing
      });
    });
  });
})
