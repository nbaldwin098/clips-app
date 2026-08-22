import fs from 'fs';
import path from 'path';

const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1FA00}-\u{1FAFF}]/u;

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(fullPath));
    } else if (/\.(jsx?|tsx?)$/.test(file)) {
      results.push(fullPath);
    }
  }
  return results;
}

const files = walk('./src');
let count = 0;
for (const f of files) {
  const content = fs.readFileSync(f, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, i) => {
    if (emojiRegex.test(line)) {
      console.log(`Found in ${path.relative(process.cwd(), f)}:${i+1}: ${line.trim()}`);
      count++;
    }
  });
}

if (count === 0) {
  console.log('PERFECT: 0 emojis found in src directory!');
} else {
  console.log(`Total emojis found: ${count}`);
}
