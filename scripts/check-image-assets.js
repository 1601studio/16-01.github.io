#!/usr/bin/env node

const crypto = require("node:crypto");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const imageExtensions = new Set([".avif", ".gif", ".jpeg", ".jpg", ".png", ".svg", ".webp"]);
const primaryCategories = new Set(["Branding", "Illustration", "Typography"]);
const secondaryCategories = new Set(["Poster Design", "Merchandise", "Editorial Design"]);
const generatedConfigReferences = new Set([
  "404.html:js/supabase-runtime-config.js",
  "index.html:js/supabase-runtime-config.js",
  "work.html:js/supabase-runtime-config.js",
  "about.html:js/supabase-runtime-config.js",
  "services.html:js/supabase-runtime-config.js",
  "contact.html:js/supabase-runtime-config.js",
  "projects/case-study.html:../js/supabase-runtime-config.js",
  "admin/login.html:js/supabase-runtime-config.js",
  "admin/dashboard.html:js/supabase-runtime-config.js"
]);
const errors = [];
const warnings = [];
const referencedImages = new Set();
const addError = (message) => errors.push(message);
const addWarning = (message) => warnings.push(message);

const loadData = (relativePath, variableName) => {
  const source = fs.readFileSync(path.join(root, relativePath), "utf8");
  return vm.runInNewContext(`(() => { ${source}\nreturn ${variableName}; })()`, {});
};

const listFiles = (directory, extension) => {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) return listFiles(absolutePath, extension);
    return entry.isFile() && absolutePath.endsWith(extension) ? [absolutePath] : [];
  });
};

const checkImagePath = (value, label) => {
  if (typeof value !== "string" || !value.startsWith("assets/images/") || value.includes("..") || value.includes("\\")) {
    addError(`${label}: invalid repository-relative image path "${String(value)}".`);
    return;
  }
  const absolutePath = path.resolve(root, value);
  const imageRoot = path.resolve(root, "assets/images");
  if (!absolutePath.startsWith(`${imageRoot}${path.sep}`)) {
    addError(`${label}: image path resolves outside assets/images/: ${value}`);
    return;
  }
  if (!imageExtensions.has(path.extname(value).toLowerCase())) {
    addError(`${label}: unsupported image extension: ${value}`);
    return;
  }
  try {
    fs.accessSync(absolutePath, fs.constants.R_OK);
  } catch {
    addError(`${label}: image file is missing or unreadable: ${value}`);
    return;
  }
  if (!fs.statSync(absolutePath).isFile()) {
    addError(`${label}: image path is not a file: ${value}`);
    return;
  }
  referencedImages.add(value);
};

const includeLocalProjects = process.argv.includes("--include-local-projects");
const projectDataPath = path.join(root, "data/projects.js");
const hasLocalProjectData = includeLocalProjects && fs.existsSync(projectDataPath);
const projects = hasLocalProjectData
  ? loadData("data/projects.js", "projects")
  : [];
const mediaAssets = loadData("data/media.js", "websiteImageAssets");
if (hasLocalProjectData && !Array.isArray(projects)) {
  addError("data/projects.js must define a projects array when present.");
}
if (!Array.isArray(mediaAssets)) addError("data/media.js must define a websiteImageAssets array.");

const projectIds = new Set();
const projectSlugs = new Set();
for (const [index, project] of (Array.isArray(projects) ? projects : []).entries()) {
  const label = `Project ${index + 1}`;
  if (!project || typeof project !== "object" || Array.isArray(project)) {
    addError(`${label}: project record must be an object.`);
    continue;
  }
  for (const [field, seen] of [["id", projectIds], ["slug", projectSlugs]]) {
    const value = project[field];
    if (typeof value !== "string" || !value.trim()) {
      addError(`${label}: "${field}" must be a non-empty string.`);
    } else if (seen.has(value)) {
      addError(`${label}: duplicate project ${field} "${value}".`);
    } else {
      seen.add(value);
    }
  }
  if (typeof project.slug === "string" && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(project.slug)) {
    addError(`${label}: slug must use lowercase letters, numbers, and hyphens.`);
  }
  for (const field of ["title", "alt"]) {
    if (typeof project[field] !== "string" || !project[field].trim()) {
      addError(`${label}: "${field}" is required and must not be empty.`);
    }
  }
  if (!primaryCategories.has(project.category)) {
    addError(`${label}: category must be Branding, Illustration, or Typography.`);
  }
  if (!Array.isArray(project.categories)) {
    addError(`${label}: "categories" must be an array.`);
  } else {
    for (const category of project.categories) {
      if (!secondaryCategories.has(category)) {
        addError(`${label}: invalid secondary category "${String(category)}".`);
      }
    }
    if (new Set(project.categories).size !== project.categories.length) {
      addError(`${label}: duplicate category registration.`);
    }
  }
  if (typeof project.featured !== "boolean" || typeof project.published !== "boolean") {
    addError(`${label}: "featured" and "published" must be boolean values.`);
  }
  for (const field of ["summary", "role"]) {
    if (project[field] !== undefined && typeof project[field] !== "string") {
      addError(`${label}: "${field}" must be a string when supplied.`);
    }
  }
  if (project.year !== undefined && typeof project.year !== "string" && typeof project.year !== "number") {
    addError(`${label}: "year" must be a string or number when supplied.`);
  }
  for (const field of ["thumbnail", "previewImage", "heroImage"]) {
    if (field === "thumbnail" && !project[field]) addError(`${label}: primary image "thumbnail" is required.`);
    if (project[field]) checkImagePath(project[field], `${label} ${field}`);
  }
}

const mediaIds = new Set();
const mediaPaths = new Set();
for (const [index, asset] of (Array.isArray(mediaAssets) ? mediaAssets : []).entries()) {
  const label = `Standalone media ${index + 1}`;
  if (!asset || typeof asset !== "object" || Array.isArray(asset)) {
    addError(`${label}: record must be an object.`);
    continue;
  }
  for (const field of ["id", "filename", "category", "alt"]) {
    if (typeof asset[field] !== "string" || !asset[field].trim()) {
      addError(`${label}: "${field}" is required and must not be empty.`);
    }
  }
  if (typeof asset.id === "string" && mediaIds.has(asset.id)) addError(`${label}: duplicate media id "${asset.id}".`);
  else if (typeof asset.id === "string") mediaIds.add(asset.id);
  if (typeof asset.path === "string" && mediaPaths.has(asset.path)) addError(`${label}: duplicate media path "${asset.path}".`);
  else if (typeof asset.path === "string") mediaPaths.add(asset.path);
  if (typeof asset.filename === "string" && path.basename(asset.path || "") !== asset.filename) {
    addError(`${label}: filename must match the final path segment.`);
  }
  if (asset.width !== undefined && (!Number.isInteger(asset.width) || asset.width <= 0)) {
    addError(`${label}: width must be a positive integer when supplied.`);
  }
  if (asset.height !== undefined && (!Number.isInteger(asset.height) || asset.height <= 0)) {
    addError(`${label}: height must be a positive integer when supplied.`);
  }
  checkImagePath(asset.path, label);
}

for (const asset of Array.isArray(mediaAssets) ? mediaAssets : []) {
  if (asset && typeof asset.path === "string" && referencedImages.has(asset.path)) {
    addError(`Image is registered as standalone media and used by a project: ${asset.path}`);
  }
}

const inspectHtml = (htmlPath) => {
  const source = fs.readFileSync(htmlPath, "utf8");
  const relativeHtml = path.relative(root, htmlPath).split(path.sep).join("/");
  const ids = new Set();
  const routes = new Set();
  const references = [];
  const tagPattern = /<([a-z][\w:-]*)\b([^>]*)>/gi;
  const attributePattern = /([^\s=/>]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/g;
  let tagMatch;
  while ((tagMatch = tagPattern.exec(source))) {
    const tagName = tagMatch[1].toLowerCase();
    const attributes = new Map();
    let attributeMatch;
    while ((attributeMatch = attributePattern.exec(tagMatch[2]))) {
      attributes.set(attributeMatch[1].toLowerCase(), attributeMatch[2] ?? attributeMatch[3] ?? attributeMatch[4] ?? "");
    }
    attributePattern.lastIndex = 0;

    if (attributes.has("id")) {
      const id = attributes.get("id");
      if (ids.has(id)) addError(`${relativeHtml}: duplicate id "${id}".`);
      ids.add(id);
    }
    if (attributes.has("data-view")) routes.add(attributes.get("data-view"));
    if (tagName === "img" && !attributes.has("alt")) addError(`${relativeHtml}: <img> is missing an alt attribute.`);
    for (const [attribute, value] of attributes) {
      if ((attribute === "src" || attribute === "href") && value) references.push({ tagName, attribute, value });
    }
  }
  const localReferences = [];
  for (const reference of references) {
    const value = reference.value.trim();
    if (/^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(value)) {
      if (value.startsWith("#")) localReferences.push({ file: htmlPath, anchor: value.slice(1) });
      continue;
    }
    let decoded;
    try {
      decoded = decodeURIComponent(value);
    } catch {
      addError(`${relativeHtml}: invalid URL encoding in ${reference.attribute}="${value}".`);
      continue;
    }
    const [pathname, hash] = decoded.split("#", 2);
    const cleanPath = (pathname || "").split("?", 1)[0];
    let targetPath = path.resolve(path.dirname(htmlPath), cleanPath || path.basename(htmlPath));
    if (fs.existsSync(targetPath) && fs.statSync(targetPath).isDirectory()) targetPath = path.join(targetPath, "index.html");
    if (!fs.existsSync(targetPath) || !fs.statSync(targetPath).isFile()) {
      if (generatedConfigReferences.has(`${relativeHtml}:${value}`)) continue;
      addError(`${relativeHtml}: broken local ${reference.attribute} reference "${value}".`);
      continue;
    }
    if (hash) localReferences.push({ file: targetPath, anchor: hash });
  }
  return { relativeHtml, ids, routes, localReferences };
};

const htmlFiles = listFiles(root, ".html").filter((file) => !file.split(path.sep).includes("node_modules"));
const htmlResults = htmlFiles.map(inspectHtml);
const htmlIds = new Map(htmlResults.map((result) => [path.resolve(root, result.relativeHtml), result.ids]));
const htmlRoutes = new Map(htmlResults.map((result) => [path.resolve(root, result.relativeHtml), result.routes]));
for (const page of htmlResults) {
  for (const reference of page.localReferences) {
    const targetPath = path.resolve(reference.file);
    if (reference.anchor && !htmlIds.get(targetPath)?.has(reference.anchor) && !htmlRoutes.get(targetPath)?.has(reference.anchor)) {
      addError(`${page.relativeHtml}: broken anchor #${reference.anchor} in ${path.relative(root, reference.file)}.`);
    }
  }
}

const jsFiles = listFiles(root, ".js").filter((file) =>
  !file.split(path.sep).includes("node_modules") &&
  (includeLocalProjects || path.resolve(file) !== projectDataPath)
);
for (const jsFile of jsFiles) {
  try {
    execFileSync(process.execPath, ["--check", jsFile], { stdio: "pipe" });
  } catch (error) {
    addError(`JavaScript syntax error in ${path.relative(root, jsFile)}: ${(error.stderr || error.message).toString().trim()}`);
  }
}

const seenContent = new Map();
const publicImageDirectories = ["branding", "icons", "og"]
  .map((directory) => path.join(root, "assets/images", directory));
for (const imagePath of publicImageDirectories
  .flatMap((directory) => listFiles(directory, ""))
  .filter((file) => imageExtensions.has(path.extname(file).toLowerCase()))) {
  const digest = crypto.createHash("sha256").update(fs.readFileSync(imagePath)).digest("hex");
  const relativePath = path.relative(root, imagePath).split(path.sep).join("/");
  if (seenContent.has(digest)) addWarning(`Duplicate image content: ${relativePath} matches ${seenContent.get(digest)}`);
  else seenContent.set(digest, relativePath);
}

warnings.forEach((warning) => console.warn(`WARNING: ${warning}`));
console.log(`Checked ${Array.isArray(projects) ? projects.length : 0} projects, ${Array.isArray(mediaAssets) ? mediaAssets.length : 0} standalone media record(s), ${referencedImages.size} image reference(s), ${htmlFiles.length} HTML files, and ${jsFiles.length} JavaScript files.`);
if (errors.length) {
  errors.forEach((error) => console.error(`ERROR: ${error}`));
  process.exitCode = 1;
}
