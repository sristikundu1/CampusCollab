import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as models from '../src/models.js';

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const projectRoot = path.resolve(backendRoot, '..');
const requiredFiles = ['.env.example', 'src/app.js', 'src/server.js'];
const failures = [];

for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(backendRoot, file))) failures.push(`Missing ${file}`);
}
const gitignorePath = path.join(projectRoot, '.gitignore');
if (!fs.existsSync(gitignorePath)) failures.push('Missing project-root .gitignore');
const gitignore = fs.existsSync(gitignorePath) ? fs.readFileSync(gitignorePath, 'utf8') : '';
for (const rule of ['.env', '.env.*', '!.env.example']) {
  if (!gitignore.split(/\r?\n/).includes(rule)) failures.push(`.gitignore is missing ${rule}`);
}
if (Object.keys(models).length !== 27) failures.push(`Expected 27 models, found ${Object.keys(models).length}`);

const indexNames = Object.values(models).flatMap((entry) => entry.schema.indexes().map(([, options]) => options.name).filter(Boolean));
if (new Set(indexNames).size !== indexNames.length) failures.push('Duplicate explicit index names detected');

if (failures.length) {
  process.stderr.write(`${failures.join('\n')}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write(`Project check passed: 27 models and ${indexNames.length} named indexes.\n`);
}
