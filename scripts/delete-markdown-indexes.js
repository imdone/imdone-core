import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the current directory name in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sidebar = '_index.md';

function getMarkdownFiles(files = []) {
  return files.filter(file => file.endsWith('.md') && file !== sidebar && file !== '_navbar.md');
}

function getFileLinks(files) {
  return files.map(file => `- [${file.replace('.md', '')}](${file})`).join('\n');
}

function getSubDirLinks(files, directory) {
  const subDirs = files.filter(file => fs.statSync(path.join(directory, file)).isDirectory());
  const subDirsContainingMarkdown = subDirs.filter(subDir => fs.readdirSync(path.join(directory, subDir)).find(file => file.endsWith('.md')));
  return subDirsContainingMarkdown.map(subDir => {
    const resource = fs.readdirSync(path.join(directory, subDir)).find(file => file.toLowerCase() === 'readme.md')
      ? 'README'
      : sidebar;
    return `- [:file_folder: **${subDir}**](${subDir}/${resource})`;
  }).join('\n');
}

function getBreadCrumb(parentDir) {
  const homeLink = '[:house: **Home**](/README)';
  return parentDir ? `- ${homeLink}\n- [:arrow_heading_up: **Parent Directory**](${parentDir}${sidebar})` : '';
}

function createIndexes(directory, parentDir, title) {
  const basename = path.basename(directory);
  if (basename.startsWith('.')) {
    return;
  }

  title = title || basename;

  const files = fs.readdirSync(directory);
  const markdownFiles = getMarkdownFiles(files);

  if (markdownFiles.length > 0) {
    const subDirLinks = getSubDirLinks(files, directory);
    const fileLinks = getFileLinks(markdownFiles);
    const breadcrumb = getBreadCrumb(parentDir);

    fs.writeFileSync(path.join(directory, sidebar), `# ${title}\n${breadcrumb}\n${subDirLinks}\n${fileLinks}\n`);
  }

  files
    .filter(file => fs.statSync(path.join(directory, file)).isDirectory())
    .forEach(subDir => createIndexes(path.join(directory, subDir), parentDir ? path.join(parentDir, basename) + '/' : '/'));
}

createIndexes(process.cwd(), undefined, 'imdone-core');
console.log('Indexes created successfully!');

function deleteIndexFiles(dir) {
  // Read the directory and filter for _index.md files
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    // If it's a file and matches the _index.md pattern, delete it
    if (stat.isFile() && file === '_index.md') {
      console.log(`Deleting file: ${filePath}`);
      fs.unlinkSync(filePath);
    }

    // If it's a directory, recurse
    if (stat.isDirectory()) {
      deleteIndexFiles(filePath);
    }
  });
}

// Path to your test directory
const testDirectory = path.join(__dirname, '..', 'test');

// Call the function to delete _index.md files
deleteIndexFiles(testDirectory);