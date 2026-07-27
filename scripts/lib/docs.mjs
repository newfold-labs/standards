import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';

export const ROOT = fileURLToPath(new URL('../..', import.meta.url));

/** Directories holding standards documents. Everything else is site plumbing. */
export const DOC_DIRS = ['general', 'platform', 'artifacts', 'process', 'meta'];

/** Walk a directory and yield every markdown file below it. */
function walk(dir) {
	const found = [];
	for (const entry of readdirSync(dir)) {
		const full = join(dir, entry);
		if (statSync(full).isDirectory()) {
			found.push(...walk(full));
		} else if (entry.endsWith('.md')) {
			found.push(full);
		}
	}
	return found;
}

/**
 * Every standards document, as { path, dir, data, content }.
 * `path` is repo-relative and always uses forward slashes so messages and
 * link resolution behave the same on every platform.
 */
export function loadDocs() {
	const docs = [];
	for (const dir of DOC_DIRS) {
		for (const file of walk(join(ROOT, dir))) {
			const raw = readFileSync(file, 'utf8');
			const { data, content } = matter(raw);
			const path = relative(ROOT, file).split(sep).join('/');
			docs.push({ path, dir, data, content });
		}
	}
	return docs.sort((a, b) => a.path.localeCompare(b.path));
}

/** GitHub-flavoured heading slug, matching how Jekyll and GitHub build anchors. */
export function slugify(heading) {
	return heading
		.trim()
		.toLowerCase()
		.replace(/[^\w\s-]/g, '')
		.replace(/\s+/g, '-');
}

/** Anchors a document exposes, from its ATX headings. */
export function anchorsOf(content) {
	const anchors = new Set();
	let inFence = false;
	for (const line of content.split('\n')) {
		if (/^\s*(```|~~~)/.test(line)) {
			inFence = !inFence;
			continue;
		}
		if (inFence) continue;
		const heading = line.match(/^#{1,6}\s+(.+?)\s*$/);
		if (heading) anchors.add(slugify(heading[1]));
	}
	return anchors;
}
