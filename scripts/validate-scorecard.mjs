#!/usr/bin/env node
/**
 * Validates the swept scorecard against schema/scorecard.schema.json, then the
 * cross-references a per-object schema cannot express.
 *
 * The board is generated from data a scheduled job wrote, so nobody reviews it
 * before it publishes. This is the only thing standing between a bad sweep and a
 * wrong board, which is why a broken reference fails the build rather than
 * rendering as an empty cell.
 *
 * A missing scorecard is not an error. The sweep runs on a schedule and the
 * board is built to say "not swept yet", so a fresh clone and a pull request
 * that never touches the data both validate cleanly.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import Ajv from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { loadDocs, ROOT } from './lib/docs.mjs';
import { loadRules } from './lib/scorecard.mjs';

const SCORECARD_PATH = join(ROOT, '_data/scorecard.json');

if (!existsSync(SCORECARD_PATH)) {
	console.log('No scorecard yet, nothing to validate.');
	process.exit(0);
}

const schema = JSON.parse(readFileSync(join(ROOT, 'schema/scorecard.schema.json'), 'utf8'));
const scorecard = JSON.parse(readFileSync(SCORECARD_PATH, 'utf8'));

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);
const validate = ajv.compile(schema);

const errors = [];

if (!validate(scorecard)) {
	for (const error of validate.errors) {
		errors.push(`${error.instancePath || '/'} ${error.message}`);
	}
}

// Every rule the sweep scored has to still exist in rules/, and every standard a
// rule cites has to still be a document. A finding whose citation does not
// resolve is worse than no finding: it tells a team to go and read a page that
// is not there.
const ruleIds = new Set(loadRules().map((rule) => rule.id));
const docIds = new Set(loadDocs().map((doc) => doc.data.id).filter(Boolean));

for (const rule of scorecard.rules ?? []) {
	if (!ruleIds.has(rule.id)) {
		errors.push(`rules: "${rule.id}" is scored but no longer defined in rules/, re-run the sweep`);
	}
	if (rule.standard && !docIds.has(rule.standard)) {
		errors.push(`rules: "${rule.id}" cites standard "${rule.standard}", which is not a document id`);
	}
}

// Levels and signals are what the board renders cells from, so a row scored
// against a level that no longer exists would render as a blank column.
const levelNumbers = new Set((scorecard.levels ?? []).map((level) => level.level));
const signalIds = new Set((scorecard.signals ?? []).map((signal) => signal.id));

for (const level of scorecard.levels ?? []) {
	for (const required of level.requires ?? []) {
		if (!signalIds.has(required)) {
			errors.push(`levels: level ${level.level} requires signal "${required}", which is not defined`);
		}
	}
}

for (const repo of scorecard.repos ?? []) {
	if (!levelNumbers.has(repo.level)) {
		errors.push(`repos: ${repo.name} sits at level ${repo.level}, which is not a defined level`);
	}
	for (const id of Object.keys(repo.rules ?? {})) {
		if (!ruleIds.has(id)) errors.push(`repos: ${repo.name} carries a verdict for unknown rule "${id}"`);
	}
}

// The rollups are what the summary strip reads. If they disagree with the rows
// the board shows one number at the top and a different one underneath it.
const counted = (scorecard.repos ?? []).length;
if (scorecard.summary && scorecard.summary.repos !== counted) {
	errors.push(`summary: says ${scorecard.summary.repos} repositories, ${counted} rows present`);
}

const reporting = (scorecard.repos ?? []).filter((repo) => repo.signals?.check_reports === true).length;
if (scorecard.summary && scorecard.summary.reporting !== reporting) {
	errors.push(`summary: says ${scorecard.summary.reporting} reporting, ${reporting} rows report`);
}

if (errors.length > 0) {
	console.error(`Scorecard validation failed with ${errors.length} error(s):\n`);
	for (const error of errors) console.error(`  ${error}`);
	process.exit(1);
}

console.log(
	`Scorecard valid: ${counted} repositories, ${(scorecard.rules ?? []).length} rules, swept ${scorecard.generated_at}.`
);
