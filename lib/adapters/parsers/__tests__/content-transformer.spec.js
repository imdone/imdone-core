const expect = require('expect.js');
const { format } = require('../content-transformer');

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
});