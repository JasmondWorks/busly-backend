const fs = require("fs");
const path = require("path");

const srcDir = path.join(__dirname, "src");

function getAllFiles(dirPath, arrayOfFiles) {
  const files = fs.readdirSync(dirPath);

  arrayOfFiles = arrayOfFiles || [];

  files.forEach(function (file) {
    if (fs.statSync(dirPath + "/" + file).isDirectory()) {
      arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles);
    } else {
      if (file.endsWith(".ts")) {
        arrayOfFiles.push(path.join(dirPath, "/", file));
      }
    }
  });

  return arrayOfFiles;
}

const files = getAllFiles(srcDir);

files.forEach((file) => {
  let content = fs.readFileSync(file, "utf8");
  const fileDir = path.dirname(file);

  // Match import and export statements, newly instantiated per file
  const importExportRegex =
    /(import|export)\s+(?:.*?)\s+from\s+['"]([^'"]+)['"]/g;

  let modifiedContent = content;
  let match;

  while ((match = importExportRegex.exec(content)) !== null) {
    const fullMatch = match[0];
    const importPath = match[2];

    if (importPath.startsWith(".")) {
      // Resolve the absolute path of the imported file
      const absoluteImportPath = path.resolve(fileDir, importPath);

      // Get the path relative to the src directory
      const relativeToSrc = path.relative(srcDir, absoluteImportPath);

      // Format to use cross-platform forward slashes
      const standardizedPath = relativeToSrc.replace(/\\/g, "/");

      // Construct the new import/export string
      const newImportString = `@/${standardizedPath}`;

      // Replace only the import string part inside the quotes
      const newMatchStr = fullMatch.replace(
        /from\s+['"]([^'"]+)['"]/,
        `from "${newImportString}"`,
      );

      modifiedContent = modifiedContent.replace(fullMatch, newMatchStr);
    }
  }

  if (content !== modifiedContent) {
    fs.writeFileSync(file, modifiedContent, "utf8");
    console.log(`Updated imports in ${file}`);
  }
});
console.log("Done!");
