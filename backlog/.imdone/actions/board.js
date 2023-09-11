module.exports = function (task) {
  const project = this.project
  const groups = [...new Set(
    project.getCards('meta.group = *').map((card) => card.meta.group && card.meta.group[0])
  )].map(group => {
    const name = group
    const value = `"${group}"`
    return { name, value}
  })
  return [{name: 'All tasks', value: '*'}, ...groups].map((group) => {
    const filterValue = encodeURIComponent(`meta.group = ${group.value} or tags = story`)
    return {
      title: group.name,
      action: function () {
        project.openUrl(`imdone://active.repo?filter=${filterValue}`)
      }
    }
  })
}