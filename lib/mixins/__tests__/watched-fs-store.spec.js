import { describe, it, expect, beforeEach, afterEach  } from 'vitest';
import { getFreshRepoTestData } from '../../__tests__/helper';
import { createWatchedFileSystemProject } from '../../project-factory'
import { appendFile } from 'fs/promises';
import { setTimeout } from 'timers/promises';


describe('WatchedFsStore', () => {
  let defaultCardsRepo,
    defaultCardsProj
    
  beforeEach(async () => {
    defaultCardsProj = createWatchedFileSystemProject({
      path: await getFreshRepoTestData('default-cards-metaSep'),
      loadPluginsNotInstalled: () => {},
      loadInstalledPlugins: () => {}
    })
    defaultCardsRepo = defaultCardsProj.repo
  })

  afterEach(async () => {
    await  defaultCardsProj.destroy()
  })

  describe('init', function () {
    it("should initialize an imdone repo and emit it's lists", async () => {
      return new Promise(async (resolve, reject) => {
        defaultCardsRepo.on('watching', ({ ok, lists }) => {
          if (ok) {
            try {
              expect(lists).to.be.an('array')
              resolve()
            } catch (err) {
              reject(err)
            }
          } else {
            reject()
          }
        })
        try {
          await defaultCardsProj.init()
        } catch (err) {
          reject(err)
        }
      })
    })
  })
  describe('watcher', function () {
    it('should detect changes to a task in a file and update the task', async () => {
      return new Promise(async (resolve, reject) => {
        defaultCardsRepo.on('file.update', (file) => {
          try {
            expect(file).to.be.an('object')
            resolve()
          } catch (err) {
            reject(err)
          }
        })
        try {
          await defaultCardsProj.init()
          const task = defaultCardsRepo.getTasks()[0]
          const file = defaultCardsRepo.getFileForTask(task)
          expect(task).to.be.an('object')
          expect(file).to.be.an('object')
          await setTimeout(500)
          await appendFile(file.getFullPath(), '\n\n\n#TODO This is a test test:watcher-test\n')
          console.log('Appended to file:', file.getFullPath())
        } catch (err) {
          reject(err)
        }
      })
    })
  })

  describe('watcher pause/unpause', function () {
    it('should pause the watcher and not detect file changes', async () => {
      return new Promise(async (resolve, reject) => {
        let fileUpdateDetected = false;
        
        defaultCardsRepo.on('file.update', () => {
          fileUpdateDetected = true;
        });
        
        try {
          await defaultCardsProj.init();
          
          // Pause the watcher
          const pauseResult = await defaultCardsRepo.pauseWatcher();
          expect(pauseResult).to.be.true;
          
          // Make a change to a file
          const task = defaultCardsRepo.getTasks()[0];
          const file = defaultCardsRepo.getFileForTask(task);
          await appendFile(file.getFullPath(), '\n\n\n#TODO Test with paused watcher test:paused-watcher\n');
          
          // Wait to ensure the change would have been detected if watcher was active
          await setTimeout(1000);
          
          // File update should not have been detected
          expect(fileUpdateDetected).to.be.false;
          resolve();
        } catch (err) {
          reject(err);
        }
      });
    });
    
    it('should unpause the watcher and detect file changes again', async () => {
      return new Promise(async (resolve, reject) => {
        try {
          await defaultCardsProj.init();
          
          // First pause the watcher
          await defaultCardsRepo.pauseWatcher();
          
          // Now unpause the watcher
          const unpauseResult = await defaultCardsRepo.unpauseWatcher();
          expect(unpauseResult).to.be.true;
          
          // Now test that file changes are detected again
          defaultCardsRepo.once('file.update', (file) => {
            expect(file).to.be.an('object');
            resolve();
          });
          
          // Make a change to a file
          const task = defaultCardsRepo.getTasks()[0];
          const file = defaultCardsRepo.getFileForTask(task);
          await setTimeout(500);
          await appendFile(file.getFullPath(), '\n\n\n#TODO Test with unpaused watcher test:unpaused-watcher\n');
          
          // Set a timeout in case the file update is never detected
          setTimeout(3000).then(() => {
            reject(new Error('File update not detected after unpausing watcher'));
          });
        } catch (err) {
          reject(err);
        }
      });
    });
    
    it('should not unpause when watcher is not paused', async () => {
      await defaultCardsProj.init();
      const unpauseResult = await defaultCardsRepo.unpauseWatcher();
      expect(unpauseResult).to.be.false;
    });
    
    it('should not pause when watcher is already paused', async () => {
      await defaultCardsProj.init();
      await defaultCardsRepo.pauseWatcher();
      const pauseResult = await defaultCardsRepo.pauseWatcher();
      expect(pauseResult).to.be.false;
    });
  });
})
