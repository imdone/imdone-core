import { describe, expect, it } from 'vitest'
import { Task } from '../task.js'
import { Config } from '../config.js'

describe('conflicted ordering metadata', () => {
  it.each([
    ['merge', '<<<<<<< LOCAL\norder:60\n=======\norder:80\n>>>>>>> PROVIDER'],
    ['diff3', '<<<<<<< LOCAL\norder:60\n||||||| BASE\norder:70\n=======\norder:80\n>>>>>>> PROVIDER'],
    ['long markers', '<<<<<<<<<< LOCAL\norder:60\n==========\norder:80\n>>>>>>>>>> PROVIDER'],
    ['incomplete conflict', '<<<<<<< LOCAL\norder:60\n=======\norder:80'],
    ['CRLF conflict', '<<<<<<< LOCAL\r\norder:60\r\n=======\r\norder:80\r\n>>>>>>> PROVIDER'],
  ])('preserves both order choices in %s content', (_name, content) => {
    const config = Config.newDefaultConfig()
    config.cards.orderMeta = true
    const task = new Task(config, { order: 60, meta: { order: [60, 80] }, description: content.split('\n') }, true)
    task.updateOrderMeta(config)
    expect(task.descriptionString).toBe(content)
    expect(task.meta.order).toEqual([60, 80])
  })

  it('preserves conflict content when order metadata is disabled', () => {
    const config = Config.newDefaultConfig()
    config.cards.orderMeta = false
    const content = '<<<<<<< LOCAL\norder:20\n=======\norder:0\n>>>>>>> PROVIDER'
    const task = new Task(config, { order: 20, meta: { order: [20, 0] }, description: content.split('\n') }, true)
    task.updateOrderMeta(config)
    expect(task.descriptionString).toBe(content)
  })

  it('still normalizes ordinary content containing a Markdown separator', () => {
    const config = Config.newDefaultConfig()
    config.cards.orderMeta = true
    const task = new Task(config, { order: 30, meta: { order: [20] }, description: ['Heading', '=======', 'order:20'] }, true)
    task.updateOrderMeta(config)
    expect(task.descriptionString).toBe('Heading\n=======\norder:30')
  })
})
