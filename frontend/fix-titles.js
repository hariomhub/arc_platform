import { readdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const dir = './src/pages';
const files = readdirSync(dir).filter(f => f.endsWith('.jsx'));
let changed = 0;

for (const file of files) {
    const path = join(dir, file);
    const original = readFileSync(path, 'utf8');
    const updated = original
        .replace(/AI Risk Council/g, 'Risk Council')
        .replace(/\| ARC(['\`])/g, '| Risk Council$1');
    if (original !== updated) {
        writeFileSync(path, updated, 'utf8');
        console.log(`✅ Updated: ${file}`);
        changed++;
    }
}
console.log(`\nDone. ${changed} files updated.`);
