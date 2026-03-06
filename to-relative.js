const fs = require("fs");
const path = require("path");

const srcDir = path.join(__dirname, "src");
const apiDir = path.join(__dirname, "api");

function getAllFiles(dirPath, arrayOfFiles) {
  if (!fs.existsSync(dirPath)) return arrayOfFiles || [];
  const files = fs.readdirSync(dirPath);

  arrayOfFiles = arrayOfFiles || [];

  files.forEach(function (file) {
    if (fs.statSync(path.join(dirPath, file)).isDirectory()) {
      arrayOfFiles = getAllFiles(path.join(dirPath, file), arrayOfFiles);
    } else {
      if (file.endsWith(".ts")) {
        arrayOfFiles.push(path.join(dirPath, file));
      }
    }
  });

  return arrayOfFiles;
}

const files = [...getAllFiles(srcDir), ...getAllFiles(apiDir)];

files.forEach((file) => {
  let content = fs.readFileSync(file, "utf8");
  const fileDir = path.dirname(file);

  // Match imports that use the @/ prefix
  const aliasRegex = /from\s+['"]@\/([^'"]+)['"]/g;

  let modifiedContent = content;
  let match;

  while ((match = aliasRegex.exec(content)) !== null) {
    const fullMatch = match[0];
    const subPath = match[1];

    // The absolute path of the target file
    const absoluteTargetPath = path.join(srcDir, subPath);

    // Calculate relative path from current fileDir to absoluteTargetPath
    let relativePath = path.relative(fileDir, absoluteTargetPath);

    // Standardize to forward slashes
    relativePath = relativePath.replace(/\\/g, "/");

    // Ensure it starts with ./ or ../
    if (!relativePath.startsWith(".")) {
      relativePath = "./" + relativePath;
    }

    const newImportString = `from "${relativePath}"`;
    modifiedContent = modifiedContent.replace(fullMatch, newImportString);
  }

  if (content !== modifiedContent) {
    fs.writeFileSync(file, modifiedContent, "utf8");
    console.log(`Updated imports in ${file}`);
  }
});

console.log("Done converting to relative imports!");
