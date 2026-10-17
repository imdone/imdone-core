import { describe, it, expect } from 'vitest';
import { getTasksToModify, getPreviousIndexWithDifferentOrder, getNextIndexWithDifferentOrder } from '../get-tasks-to-modify';

describe("getNextIndexWithDifferentOrder", () => {
  it.each([
    [[0, 0, 0, 0, 1, 2, 3, 4, null, null], 0, 4],
    [[0, 0, 0, 0, 1, 2, 3, 4, null, null], 1, 4],
    [[0, 0, 0, 0, 1, 2, 3, 4, null, null], 2, 4],
    [[0, 0, 0, 0, 1, 2, 3, 4, null, null], 3, 4],
    [[null, null, null, null], 0, -1],
    [[null, null, null, null], 1, -1],
    [[null, null, null, null], 2, -1],
    [[null, null, null, null], 3, -1],
    [[], 0, -1],
    [[0, 1, 2, 3, 4, 5, 6, 7], 8, -1 ]
  ])("Given tasks with order: %j and index: %j should get the index: %j with a different order", (orders, pos, expected) => {
    const tasks = orders.map(order => ({order}))
    const result = getNextIndexWithDifferentOrder(tasks, pos)
    expect(result).to.equal(expected)
  })
})

describe("getPreviousIndexWithDifferentOrder", () => {
  it.each([
    [[1, 2, 3, 3, 3, 4, null, null], 2, 1],
    [[1, 2, 3, 3, 3, 4, null, null], 3, 1],
    [[1, 2, 3, 3, 3, 4, null, null], 4, 1],
    [[1, 2, 3, 3, 3, 4, null, null], 6, 5],
    [[1, 2, 3, 3, 3, 4, null, null], 7, 5],
    [[0, 0, 0, 0, 1, 2, 3], 0, -1],
    [[0, 0, 0, 0, 1, 2, 3], 1, -1],
    [[0, 0, 0, 0, 1, 2, 3], 2, -1],
    [[0, 0, 0, 0, 1, 2, 3], 3, -1],
    [[], 0, -1],
    [[-10, -9, -8, -7, -6, -5, -4, null, null, null], 10, 6],
    [[-10, -9, -8, -7, -6, -5, -4, null, null, null], 9, 6],
  ])("Given tasks with order: %j, newPos: %j should return %j", (order, pos, expected) => {
    const tasks = order.map(order => ({order}))
    const result = getPreviousIndexWithDifferentOrder(tasks, pos)
    expect(result).to.equal(expected)
  })
})

describe('getTasksToModify', () => {
  it.each([
    [[4], [-10, -9, -8, -7, -6, undefined], 5],
    [[-20], [-10, -9, -8, -7, -6], 0],
    [[15], [-10, 0, 10, 20, 30, 40, 50], 3],
    [[5, 10, 15, 20, 25], [-10, 0, 10, 10, 10, 10, 30, 40, 50], 4],
    [[5, 10, 15, 20, 25], [-10, 0, 10, 10, 10, 10, 30, 40, 50], 5],
    [[-10], [null, null, null, 30, 40], 0]
  ])('Gets %j tasks to modify from task list %j when moving task to new position %j', (expected, taskList, newPos) => {
    const task = {}
    const tasksToModify = getTasksToModify(task, taskList.map((order, index) => ({order})), newPos);
    const tasksToModifyString = JSON.stringify(tasksToModify)
    const expectedString = JSON.stringify(expected.map(order => ({order})))
    expect(tasksToModifyString).to.equal(expectedString)
  })

})


describe('numeric order exhaustion (SCRUM-519)', () => {
  it.each([
    { orders: [1, 1 + Number.EPSILON], position: 1 },
    { orders: [Number.MAX_VALUE / 2, Number.MAX_VALUE], position: 2 },
    { orders: [-Number.MAX_VALUE, -Number.MAX_VALUE / 2], position: 0 },
  ])('allocates a strictly ordered finite insertion for $orders at $position', ({ orders, position }) => {
    const cards = orders.map((order, index) => ({ id: index, order }));
    const moving = { id: 'moving', order: 0 };
    const modified = getTasksToModify(moving, cards, position);
    const expected = [...cards]; expected.splice(position, 0, moving);
    expect(modified).toContain(moving);
    expect(expected.every(card => Number.isFinite(card.order))).toBe(true);
    for (let index = 1; index < expected.length; index++) expect(expected[index].order).toBeGreaterThan(expected[index - 1].order);
    expect(cards.map(card => card.id)).toEqual([0, 1]);
  });
});
