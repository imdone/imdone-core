const expect = require('expect.js');
const { format, encodeMarkdownLinks } = require('../content-transformer');

describe('Content Transformer', () => {
  it('should interpolate variables outside of code blocks and inline code', () => {
    const content = `
      This is a test with a variable: \${variable}
      \`\`\`
      This is a code block with a variable: \${variable}
      \`\`\`
      This is inline code with a variable: \`\${variable}\`
    `;
    const data = { variable: 'value' };
    const result = format(content, data, false);

    expect(result).to.contain('This is a test with a variable: value');
    expect(result).to.contain('This is a code block with a variable: ${variable}');
    expect(result).to.contain('This is inline code with a variable: `${variable}`');
  });

  it('should interpolate mustache variables outside of code blocks and inline code', () => {
    const content = `
      This is a test with a mustache variable: {{variable}}
      \`\`\`
      This is a code block with a mustache variable: {{variable}}
      \`\`\`
      This is inline code with a mustache variable: \`{{variable}}\`
    `;
    const data = { variable: 'value' };
    const result = format(content, data, true);

    expect(result).to.contain('This is a test with a mustache variable: value');
    expect(result).to.contain('This is a code block with a mustache variable: {{variable}}');
    expect(result).to.contain('This is inline code with a mustache variable: `{{variable}}`');
  });

  it('should recursively interpolate the content until no more variables are found', () => {
    const content = 'This is a test with a variable: \${variable}';
    const data = { variable: '${innerValue}', innerValue: 'inner' };
    const result = format(content, data, false);

    expect(result).to.contain('This is a test with a variable: inner');
  });

  it('should correctly interpolate functions and their arguments', () => {
    const content = 'This is a test with a function: {{func("list = DOING or tags = focus or (list = TODO and index = 0) hide: DOING")}}';
    const data = {
      func: (content) => encodeURIComponent(content),
    };
    const result = format(content, data, true);

    expect(result).to.be('This is a test with a function: list%20%3D%20DOING%20or%20tags%20%3D%20focus%20or%20(list%20%3D%20TODO%20and%20index%20%3D%200)%20hide%3A%20DOING');
  })
});