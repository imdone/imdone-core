import fs from 'fs';
import path from 'path';

const LIB_DIR = './lib';
const VALID_NAMESPACE_EXPORT = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

function isIndexableDirectory(entry) {
  return (
    entry.isDirectory() &&
    !['__tests__', '__fixtures__'].includes(entry.name) &&
    !entry.name.startsWith('.') &&
    VALID_NAMESPACE_EXPORT.test(entry.name)
  );
}

// Recursively generates index.js files
function generateIndexes(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  const files = entries
    .filter(entry => entry.isFile() && entry.name !== 'index.js' && entry.name !== 'cli.js' && entry.name.endsWith('.js'))
    .map(entry => `export * from './${entry.name}';`);

  const subdirs = entries
    .filter(isIndexableDirectory)
    .map(entry => entry.name);

  // Generate index.js in each subdirectory
  subdirs.forEach(subdir => generateIndexes(path.join(dir, subdir)));

  // Add namespace exports for subdirectories
  const namespaceExports = subdirs.map(subdir => `export * as ${subdir} from './${subdir}/index.js';`);

  // Write the index.js file
  if (files.length || namespaceExports.length) {
    const indexPath = path.join(dir, 'index.js');
    const content = [...files, ...namespaceExports].join('\n') + '\n';
    fs.writeFileSync(indexPath, content);
    console.log(`Generated: ${indexPath}`);
  }
}

// Run the script
generateIndexes(LIB_DIR);
console.log('✅ Index files generated successfully!');
