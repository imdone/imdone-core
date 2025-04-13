import { describe, it, expect } from 'vitest';
import { Config } from '../config';

describe('config', () => {
  it('should get config', () => {
    const config = new Config({ settings: { cards: { maxLines: 10 } } })
    expect(config.maxLines).to.equal(10)
  })

  describe('newDefaultConfig', () => {
    it('should create new default config', () => {
      const config = Config.newDefaultConfig()
      expect(config.maxLines).to.equal(1)
    })

    it('should create new default config with custom settings', () => {
      const config = Config.newDefaultConfig({ settings: { cards: { maxLines: 10 } }})
      expect(config.maxLines).to.equal(10)
    })
  })

  describe('defaultFilter', () => {
    it('should get defaultFilter', () => {
      const config = new Config({ settings: { defaultFilter: 'filter' } })
      expect(config.defaultFilter).to.equal('filter')
    })

    it('should set defaultFilter', () => {
      const config = new Config()
      config.defaultFilter = 'filter'
      expect(config.defaultFilter).to.equal('filter')
    })
  })

  describe('getDoneList', () => {
    it('should get doneList', () => {
      const config = new Config({ lists: [{ name: 'TODO' }, { name: 'DONE' }], settings: { cards: { doneList: 'DONE' } } })
      expect(config.getDoneList()).to.equal('DONE')
    })

    it('should get doneList from lists', () => {
      const config = new Config({ lists: [{ name: 'TODO' }, { name: 'DONE' }], settings: { cards: {} } })
      expect(config.getDoneList()).to.equal('DONE')
    })
  })

  describe('getDoingList', () => {
    it('should get doingList', () => {
      const config = new Config({ lists: [{ name: 'TODO' }, { name: 'DOING' }, { name: 'DONE' }], settings: { cards: { doingList: 'DOING' } } })
      expect(config.getDoingList()).to.equal('DOING')
    })

    it('should get doingList from lists', () => {
      const config = new Config({ lists: [{ name: 'TODO' }, { name: 'DOING' }, { name: 'DONE' }], settings: { cards: {} } })
      expect(config.getDoingList()).to.equal('DOING')
    })
  })

  describe('getDefaultList', () => {
    it('should get defaultList', () => {
      const config = new Config({ lists: [{ name: 'TODO' }, { name: 'DONE' }], settings: { cards: { defaultList: 'TODO' } } })
      expect(config.getDefaultList()).to.equal('TODO')
    })

    it('should get defaultList from lists', () => {
      const config = new Config({ lists: [{ name: 'TODO' }, { name: 'DONE' }], settings: { cards: {} } })
      expect(config.getDefaultList()).to.equal('TODO')
    })
  })

  describe('listExists', () => {
    it('should check if list exists', () => {
      const config = new Config({ lists: [{ name: 'TODO' }, { name: 'DONE' }] })
      expect(config.listExists('TODO')).to.equal(true)
    })
  })
});