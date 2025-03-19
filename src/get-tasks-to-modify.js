import { isNumber } from "./adapters/parsers/task/CardContentParser";

export function getPreviousIndexWithDifferentOrder(tasks, pos) {
  let closestIndexWithOrder = -1

  if (pos === 0) return closestIndexWithOrder
  
  let lastTask = tasks[pos] || tasks [pos - 1]

  for (
    let index = pos - 1;
    index >= 0 && closestIndexWithOrder < 0;
    index--
  ) {
    const t = tasks[index]
    if (!tasksHaveSameOrder(lastTask, t)) closestIndexWithOrder = index
    lastTask = t
  }
  return closestIndexWithOrder
}

export function getNextIndexWithDifferentOrder(tasks, pos) {
  let closestIndexWithOrder = -1

  let lastTask = tasks[pos]

  for (
    let index = pos;
    index < tasks.length && closestIndexWithOrder < 0;
    index++
  ) {
    const t = tasks[index]
    if (!tasksHaveSameOrder(lastTask, t)) closestIndexWithOrder = index
    lastTask = t
  }
  return closestIndexWithOrder
}

function taskBeforeAndAfterHaveDifferentOrder(taskList, newPos) {
  const taskBefore = taskList[newPos - 1]
  const taskAfter = taskList[newPos]
  return taskBeforeHasOrder(taskList, newPos)
    && taskAfterHasOrder(taskList, newPos)
    && parseFloat(taskBefore.order) !== parseFloat(taskAfter.order)
}

function taskBeforeHasOrder(taskList, newPos) {
  const taskBefore = taskList[newPos - 1]
  return taskBefore && isNumber(taskBefore.order)
}

function taskAfterHasOrder(taskList, newPos) {
  const taskAfter = taskList[newPos]
  return taskAfter && isNumber(taskAfter.order)
}
function lastTaskHasOrder(taskList) {
  const lastTask = taskList[taskList.length - 1]
  return lastTask && isNumber(lastTask.order)
}

export function getTasksToModify(task, taskList, newPos) {
  const previousIndexWithDifferentOrder = getPreviousIndexWithDifferentOrder(taskList, newPos)
  const nextIndexWithDifferentOrder = getNextIndexWithDifferentOrder(taskList, newPos)
  const previousTaskWithOrder = taskList[previousIndexWithDifferentOrder]
  const nextTaskWithOrder = taskList[nextIndexWithDifferentOrder]

  const startingOrder = previousTaskWithOrder
    ? isNumber(previousTaskWithOrder.order) && previousTaskWithOrder.order || 0
    : 0;
  const endingOrder = nextTaskWithOrder
    ? nextTaskWithOrder.order
    : undefined;

  const start = previousIndexWithDifferentOrder > -1 ? previousIndexWithDifferentOrder + 1 : 0;
  const end = nextIndexWithDifferentOrder > -1 ? nextIndexWithDifferentOrder : newPos + 1;
  const changes = nextIndexWithDifferentOrder - previousIndexWithDifferentOrder + 1
  const increment = isNumber(endingOrder) ? (endingOrder - startingOrder) / changes : 10
  const tasksToModify = []
  let newOrder = startingOrder
  let order = 0
  if (taskList.length === 0) {
    order = 0
  } else  if (newPos === 0) {
    order = taskList[0].order - 10
  } else if (newPos === taskList.length && lastTaskHasOrder(taskList)) {
    order = taskList[taskList.length - 1].order + 10
  } else if (taskBeforeAndAfterHaveDifferentOrder(taskList, newPos)) {
    order = (taskList[newPos].order - taskList[newPos - 1].order) / 2 + taskList[newPos - 1].order
  } else if (taskBeforeHasOrder(taskList, newPos) && !taskAfterHasOrder(taskList, newPos)) {
    order = taskList[newPos - 1].order + 10
  } else {
    for (let index = start; index < end; index++) {
      newOrder += increment
      if (index === newPos) {
        task.order = newOrder
        tasksToModify.push(task)
        newOrder += increment
      }

      if (!taskList[index]) continue
      taskList[index].order = newOrder
      tasksToModify.push(taskList[index])
    }  
  }

  if (tasksToModify.length === 0) {
    task.order = order
    tasksToModify.push(task)
  }

  return tasksToModify
}

function tasksHaveSameOrder(taskA, taskB) {
  return taskA && taskB && taskA.order + "" === taskB.order + ""
}

