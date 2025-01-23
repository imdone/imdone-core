const { renderMarkdown, extractWikilinkTopics, _setPlatform } = require('../markdown')

describe('markdown', () => {
  it('should parse wikilink topics', () => {
    const content = `# Test

- [ ] Task 1 [[a topic]]
- [ ] Task 2

![Cool Image](cool-image.png)

[[another topic]]
`
    should(extractWikilinkTopics(content)).eql(['a topic', 'another topic'])
  })

  it('should render markdown', () => {
    const content = `# Test

- [ ] Task 1
- [ ] Task 2

![Cool Image](cool-image.png)
`
    should(renderMarkdown(content, '/full/path')).equal(`<h1>Test</h1>
<ul>
<li><input type="checkbox" id="checkbox0"><label for="checkbox0">Task 1</label></li>
<li><input type="checkbox" id="checkbox1"><label for="checkbox1">Task 2</label></li>
</ul>
<p><img src="file:///full/path/cool-image.png" alt="Cool Image"></p>
`)
    _setPlatform('win32')
    should(renderMarkdown(content, 'C:\\full\\path')).equal(`<h1>Test</h1>
<ul>
<li><input type="checkbox" id="checkbox0"><label for="checkbox0">Task 1</label></li>
<li><input type="checkbox" id="checkbox1"><label for="checkbox1">Task 2</label></li>
</ul>
<p><img src="file:///C:/full/path/cool-image.png" alt="Cool Image"></p>
`)
    _setPlatform(process.platform)
  })
})