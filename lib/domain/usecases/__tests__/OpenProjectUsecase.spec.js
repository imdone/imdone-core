
const chai = require("chai")
const sinon = require("sinon")
const sinonChai = require("sinon-chai")
const expect = chai.expect
chai.should();
chai.use(sinonChai);

const OpenProjectUsecase = require('../OpenProjectUsecase')
const ProjectReader = require('../ProjectReader')
const ProjectPresenter = require('../ProjectPresenter')
const appContext = () => require('../../../context/ApplicationContext')


describe('OpenProjectUsecase', () => {
  let _projectReader = null
  let _projectPresenter = null
  let project = {
    tasks: [
      {
        list: 'TODO',
        text: 'A todo'
      }
    ]
  }
  let openProject = null

  beforeEach(() => {
    _projectReader = new ProjectReader()
    _projectPresenter = new ProjectPresenter()
    
    appContext().projectReader = _projectReader
    appContext().projectPresenter = _projectPresenter

    openProject = new OpenProjectUsecase()
  })

  it('Reads the project and presents the result', () => {
    // given
    const location = '/my/project/path'
    const projectReader = sinon.stub(_projectReader, 'read').callsFake((location) => {
      return project
    })
    const projectPresenter = sinon.stub(_projectPresenter, 'present').callsFake((project) => {})
    
    // when
    openProject.execute(location)
    
    // then
    expect(projectReader).to.have.been.calledWith(location)
    expect(projectPresenter).to.have.been.calledWith(project)
  })
})