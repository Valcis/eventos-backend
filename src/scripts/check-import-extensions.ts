import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const SRC = 'src';
let bad: string[] = [];

function walk(dir: string) {
	for (const entry of readdirSync(dir)) {
		const p = join(dir, entry);
		const s = statSync(p);
		if (s.isDirectory()) walk(p);
		else if (/\.(ts|tsx)$/.test(p)) {
			const txt = readFileSync(p, 'utf8');
			const re = /from\s+['"](.+\.js)['"]/g; // captura './x.js'
			let m;
			while ((m = re.exec(txt))) bad.push(`${p}: ${m[1]}`);
		}
	}
}

walk(SRC);
if (bad.length) {
	console.error('❌ Imports con .js detectados en archivos TS:');
	for (const line of bad) console.error('  -', line);
	process.exit(1);
} else {
	console.log('✅ Sin imports .js en archivos TS');
}
