const { renderMarkdown, extractWikilinkTopics, _setPlatform } = require('../markdown')

describe('markdown', () => {
  it('should parse wikilink topics', () => {
    const content = `# Test

- [ ] Task 1 [[a topic]]
- [ ] Task 2

![Cool Image](cool-image.png)

[[another topic]]

[[../images/cool-image-wl|cool image]]
`
    should(extractWikilinkTopics(content)).eql(['a topic', 'another topic', '../images/cool-image-wl'])
  })

  it('should render markdown', () => {
    const content = `# Test

- [ ] Task 1
- [ ] Task 2

![Cool Image](../images/cool%20image.png)

[Link](../images/cool-image.png)

[[../images/cool-image-wl|cool image]]

[[cool topic]]

[Finder ./](./)

[Finder /](/)

[Finder ../](../)
`

    should(renderMarkdown(content, '/my/full/path.md')).equal(`<h1>Test</h1>
<ul>
<li><input type="checkbox" id="checkbox0"><label for="checkbox0">Task 1</label></li>
<li><input type="checkbox" id="checkbox1"><label for="checkbox1">Task 2</label></li>
</ul>
<p><img src="file:///my/images/cool%20image.png" alt="Cool Image"></p>
<p><a href="file:///my/images/cool-image.png" title="file:///my/images/cool-image.png">Link</a></p>
<p><a href="file:///my/images/cool-image-wl.md" title="file:///my/images/cool-image-wl.md">cool image</a></p>
<p><a href="file:///my/full/cool%20topic.md" title="file:///my/full/cool topic.md">cool topic</a></p>
<p><a href="file:///my/full/" title="file:///my/full/">Finder ./</a></p>
<p><a href="file:///my/full/" title="file:///my/full/">Finder /</a></p>
<p><a href="file:///my/" title="file:///my/">Finder ../</a></p>
`)
    _setPlatform('win32')
    should(renderMarkdown(content, 'C:\\my\\full\\path.md')).equal(`<h1>Test</h1>
<ul>
<li><input type="checkbox" id="checkbox0"><label for="checkbox0">Task 1</label></li>
<li><input type="checkbox" id="checkbox1"><label for="checkbox1">Task 2</label></li>
</ul>
<p><img src="file:///C:/my/images/cool%20image.png" alt="Cool Image"></p>
<p><a href="file:///C:/my/images/cool-image.png" title="file:///C:/my/images/cool-image.png">Link</a></p>
<p><a href="file:///C:/my/images/cool-image-wl.md" title="file:///C:/my/images/cool-image-wl.md">cool image</a></p>
<p><a href="file:///C:/my/full/cool%20topic.md" title="file:///C:/my/full/cool topic.md">cool topic</a></p>
<p><a href="file:///C:/my/full/" title="file:///C:/my/full/">Finder ./</a></p>
<p><a href="file:///C:/my/full/" title="file:///C:/my/full/">Finder /</a></p>
<p><a href="file:///C:/my/" title="file:///C:/my/">Finder ../</a></p>
`)
    _setPlatform(process.platform)
  })
})