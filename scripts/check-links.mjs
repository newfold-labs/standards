#!/usr/bin/env node
/**
 * Checks every relative markdown link between standards documents, including
 * its anchor. how-we-work shipped links to a file deleted in 2022 and to a
 * misspelled filename; nothing caught either. This does.
 *
 * External links are not fetched. That is a network check, not a build check.
 */
import { existsSync } from 'node:fs';
import { dirname, join, normalize, sep } from 'node:path';
import { anchorsOf, loadDocs, ROOT } from './lib/docs.mjs';

const docs = loadDocs();
const anchorsByPath = new Map(docs.map((doc) => [doc.path, anchorsOf(doc.content)]));
const errors = [];

/** Markdown link targets outside fenced code blocks. */
function linksOf(content) {
	const links = [];
	let inFence = false;
	const lines = content.split('\n');
	for (const [index, line] of lines.entries()) {
		if (/^\s*(```|~~~)/.test(line)) {
			inFence = !inFence;
			continue;
		}
		if (inFence) continue;
		for (const match of line.matchAll(/\[[^\]]*\]\(([^)\s]+)\)/g)) {
			links.push({ target: match[1], line: index + 1 });
		}
	}
	return links;
}

for (const doc of docs) {
	for (const { target, line } of linksOf(doc.content)) {
		if (/^(https?:|mailto:|tel:)/i.test(target)) continue;

		const [rawPath, anchor] = target.split('#');
		const at = `${doc.path}:${line}`;

		// A bare "#anchor" points inside the current document.
		if (rawPath === '') {
			if (anchor && !anchorsByPath.get(doc.path).has(anchor)) {
				errors.push(`${at}: no heading "#${anchor}" in this document`);
			}
			continue;
		}

		const resolved = normalize(join(dirname(doc.path), rawPath)).split(sep).join('/');

		if (!existsSync(join(ROOT, resolved))) {
			errors.push(`${at}: link target "${rawPath}" does not exist (resolved to ${resolved})`);
			continue;
		}

		if (!anchor) continue;

		const anchors = anchorsByPath.get(resolved);
		if (!anchors) {
			errors.push(`${at}: "${rawPath}" is not a standards document, cannot check "#${anchor}"`);
			continue;
		}
		if (!anchors.has(anchor)) {
			errors.push(`${at}: no heading "#${anchor}" in ${resolved}`);
		}
	}
}

if (errors.length > 0) {
	console.error(`Link check failed with ${errors.length} error(s):\n`);
	for (const error of errors) console.error(`  ${error}`);
	process.exit(1);
}

console.log(`Internal links resolve across ${docs.length} documents.`);
