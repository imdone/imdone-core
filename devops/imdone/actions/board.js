module.exports = function (task) {
  const project = this.project
  const groups = new Set(project.getCards().map((card) => card.meta.group && card.meta.group[0] || 'ungrouped'))
  return [...groups].map((group) => {
    const filterValue = encodeURIComponent(`allMeta.group = "${group}" or allTags = story`)
    return {
      title: group,
      action: function () {
        project.openUrl(`imdone://active.repo?filter=${filterValue}`)
      }
    }
  })
}