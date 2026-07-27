#!/usr/bin/env node
/**
 * Validates every standards document's front matter against
 * schema/frontmatter.schema.json, then runs the checks a per-document schema
 * cannot express: id uniqueness and `related` / `superseded_by` pointing at
 * documents that exist.
 *
 * Jekyll has no front matter validation of its own, so this runs in CI ahead of
 * the build and fails it.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
// The schema is draft 2020-12; ajv's default export only speaks draft-07.
import Ajv from 'ajv/dist/2020.js';
import { loadDocs, ROOT } from './lib/docs.mjs';

const schema = JSON.parse(readFileSync(join(ROOT, 'schema/frontmatter.schema.json'), 'utf8'));
const ajv = new Ajv({ allErrors: true, strict: false });
const validate = ajv.compile(schema);

const docs = loadDocs();
const errors = [];

if (docs.length === 0) {
	errors.push('no documents found, check DOC_DIRS in scripts/lib/docs.mjs');
}

for (const doc of docs) {
	if (Object.keys(doc.data).length === 0) {
		errors.push(`${doc.path}: no front matter`);
		continue;
	}
	if (!validate(doc.data)) {
		for (const error of validate.errors) {
			const at = error.instancePath || '/';
			errors.push(`${doc.path}: ${at} ${error.message}`);
		}
	}
}

// Ids are what checks and AI answers cite, so a collision is a real problem.
const byId = new Map();
for (const doc of docs) {
	if (!doc.data.id) continue;
	if (byId.has(doc.data.id)) {
		errors.push(`${doc.path}: duplicate id "${doc.data.id}", also used by ${byId.get(doc.data.id)}`);
		continue;
	}
	byId.set(doc.data.id, doc.path);
}

for (const doc of docs) {
	for (const id of doc.data.related ?? []) {
		if (!byId.has(id)) errors.push(`${doc.path}: related id "${id}" does not exist`);
		if (id === doc.data.id) errors.push(`${doc.path}: related lists its own id`);
	}
	const supersededBy = doc.data.superseded_by;
	if (supersededBy && !byId.has(supersededBy)) {
		errors.push(`${doc.path}: superseded_by id "${supersededBy}" does not exist`);
	}
}

// Ordering is undefined without `order`, which makes nav non-deterministic.
for (const doc of docs) {
	if (doc.data.order === undefined) errors.push(`${doc.path}: no order set`);
}

// Nav groups documents by directory (via _config.yml defaults), so ordering only
// has to be unique within one, not across the whole repository.
const collisions = new Map();
for (const doc of docs) {
	const key = `${doc.path.split('/').slice(0, -1).join('/')}#${doc.data.order}`;
	if (collisions.has(key)) {
		errors.push(`${doc.path}: order ${doc.data.order} collides with ${collisions.get(key)}`);
		continue;
	}
	collisions.set(key, doc.path);
}

// section, group and layout come from _config.yml defaults. Setting them in a
// document means the file and the config can disagree.
for (const doc of docs) {
	for (const field of ['section', 'group', 'layout']) {
		if (field in doc.data) {
			errors.push(`${doc.path}: ${field} is injected by _config.yml, remove it from front matter`);
		}
	}
}

if (errors.length > 0) {
	console.error(`Front matter validation failed with ${errors.length} error(s):\n`);
	for (const error of errors) console.error(`  ${error}`);
	process.exit(1);
}

console.log(`Front matter valid across ${docs.length} documents.`);
