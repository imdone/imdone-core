import { describe, it, expect, should } from 'vitest';
import { appContext as context } from '../../../context/ApplicationContext.js'
import { removeDefaultViewFilter, setDefaultViewFilter } from '../SaveViewUsecase.js';
// Example of how to structure the tests using Mocha
// describe('setDefaultViewFilter', function() {
//     it('It sets the default view filter to the project filter and clears the project filter', function() {
//     });
  
//     it('should not change the default view filter if there is no project filter', function() {
//     // test logic goes here
//     });
// });
  
// Example of how to structure the tests using Mocha
describe('removeDefaultViewFilter', function() {
    it('It sets the project filter to the default view filter and removes the default view filter', async () => {
        const initialProjectFilter = 'initial project filter'
        const defaultProjectFilter = 'default project filter'
        const project = {
            filter: initialProjectFilter,
            defaultFilter: defaultProjectFilter,
            setFilter: () => {}
        }
        
        let saveConfigCalled = false
        const saveConfig = async function (cb) {
            saveConfigCalled = true
            cb()
        }
        context().project = project
        context().repo = { saveConfig }

        // test execution
        const result = await removeDefaultViewFilter()
        
        // assertions
        expect(project.filter).toEqual(defaultProjectFilter)
        expect(project.defaultFilter).toEqual('')
        expect(saveConfigCalled).to.be.true
    });
  
    it('should not change the project filter if there is no default view filter', async () => {
        const initialProjectFilter = 'initial project filter'
        const defaultProjectFilter = ''
        const project = {
            filter: initialProjectFilter,
            defaultFilter: defaultProjectFilter,
            setFilter: () => {}
        }
        
        let saveConfigCalled = false
        const saveConfig = async function (cb) {
            saveConfigCalled = true
            cb()
        }
        context().project = project
        context().repo = { saveConfig }

        // test execution
        await removeDefaultViewFilter()
        
        // assertions
        expect(project.filter).toEqual(initialProjectFilter)
        expect(project.defaultFilter).toEqual('')
        expect(saveConfigCalled).to.be.false
    });
  });

  describe("setDefaultViewFilter", () => {
    it("It sets the default view filter to the project filter and clears the project filter", async () => {
        const initialProjectFilter = 'initial project filter'
        const defaultProjectFilter = 'default project filter'
        const project = {
            filter: initialProjectFilter,
            defaultFilter: defaultProjectFilter,
            setFilter: () => {}
        }
        
        let saveConfigCalled = false
        const saveConfig = async function (cb) {
            saveConfigCalled = true
            cb()
        }
        context().project = project
        context().repo = { saveConfig }

        // test execution
        await setDefaultViewFilter()
        
        // assertions
        expect(project.filter).toEqual('')
        expect(project.defaultFilter).toEqual(initialProjectFilter)
        expect(saveConfigCalled).to.be.true
    })

    it('should not change the default view filter if there is no project filter', async () => {
        const initialProjectFilter = ''
        const defaultProjectFilter = 'default project filter'
        const project = {
            filter: initialProjectFilter,
            defaultFilter: defaultProjectFilter,
        }
        
        let saveConfigCalled = false
        const saveConfig = async function (cb) {
            saveConfigCalled = true
            cb()
        }
        context().project = project
        context().repo = { saveConfig }

        // test execution
        await setDefaultViewFilter()
        
        // assertions
        expect(project.filter).toEqual(initialProjectFilter)
        expect(project.defaultFilter).toEqual(defaultProjectFilter)
        expect(saveConfigCalled).to.be.false
    });
  })
  