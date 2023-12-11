const defaultStory = `# Story Title

Story description
`
module.exports.promptForMarkdownPlan = async function () {
  const editor = (await import('@inquirer/editor')).default

  return await editor({
    message: 'Enter the story title and description markdown',
    validate: function (text) {
      if (!text) return 'Please enter a description'
      return true
    },
    default: defaultStory  
  });
}