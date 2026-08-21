#!/usr/bin/env node
/*
 * The org sweep.
 *
 * Reads every repository the standards bind, works out where each one sits on
 * the maturity ladder, and writes what the site renders. It never runs a linter:
 * findings come from the repositories themselves, which already lint their own
 * pull requests. Linting 125 repositories centrally would cost hours of runner
 * time nightly to recompute something their CI computed for free.
 *
 * Cost, which is the whole design:
 *
 *   - Repository metadata and the half-dozen files we read from each one arrive
 *     together, batched, over GraphQL. The fleet is a handful of requests rather
 *     than six hundred, and nothing is cloned.
 *   - A repository whose `pushedAt` has not moved since the last sweep is not
 *     read again; its previous row is carried forward. In steady state that
 *     leaves only the few repositories that actually changed that day.
 *   - The previous scorecard is the cache. There is no side-car state to keep in
 *     sync, and a change to the rules or the level model invalidates every row
 *     automatically through the policy fingerprint.
 *
 * Usage:
 *   node scripts/sweep.mjs [--org newfold-labs] [--full] [--limit N] [--dry-run]
 */
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createClient } from './lib/github.mjs';
import { ROOT } from './lib/docs.mjs';
import { readJsonFromZip } from './lib/unzip.mjs';
import {
	artifactTypeOf,
	levelOf,
	loadLevels,
	loadRules,
	packagesFor,
	policyFingerprint,
	signalsFor,
	summarise,
	verdictsFor,
} from './lib/scorecard.mjs';

const ARTIFACT_NAME = 'standards-compliance';
const DATA_DIR = join(ROOT, '_data');
const FINDINGS_DIR = join(ROOT, 'scorecard', 'findings');
const SCORECARD_PATH = join(DATA_DIR, 'scorecard.json');
const HISTORY_PATH = join(DATA_DIR, 'scorecard_history.json');

/** Trend needs enough points to show a shape, not every point ever recorded. */
const HISTORY_LIMIT = 400;

function parseArgs(argv) {
	const args = { org: 'newfold-labs', full: false, dryRun: false, limit: 0 };
	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];
		if (arg === '--full') args.full = true;
		else if (arg === '--dry-run') args.dryRun = true;
		else if (arg === '--org') args.org = argv[++i];
		else if (arg === '--limit') args.limit = Number(argv[++i]);
	}
	return args;
}

function readJsonOr(path, fallback) {
	try {
		return JSON.parse(readFileSync(path, 'utf8'));
	} catch {
		return fallback;
	}
}

/**
 * The latest release of each package a rule names.
 *
 * This is what `standards_package_current` compares against, so it is read at
 * sweep time rather than written down anywhere: a hardcoded "current" version
 * silently becomes wrong the day after the next release.
 */
async function latestReleases(client, packages) {
	const versions = {};
	if (packages.length === 0) return versions;

	const query = `
		query {
			${packages
				.map(
					(name, index) => `
			p${index}: repository(owner: ${JSON.stringify(name.split('/')[0])}, name: ${JSON.stringify(name.split('/')[1])}) {
				latestRelease { tagName }
			}`
				)
				.join('')}
		}`;

	const body = await client.graphql(query);
	packages.forEach((name, index) => {
		const tag = body.data[`p${index}`]?.latestRelease?.tagName;
		if (tag) versions[name] = tag.replace(/^v/, '');
	});
	return versions;
}

/**
 * The compliance artifact a repository last published, normalised.
 *
 * Every failure mode here — no artifact, expired, unreadable zip, wrong shape —
 * lands on null, which the scorer reads as "has not reported". A repository is
 * never marked non-compliant because we failed to read it.
 */
async function complianceFor(client, repo) {
	let artifact;
	try {
		artifact = await client.readComplianceArtifact(repo, ARTIFACT_NAME);
	} catch {
		return null;
	}
	if (!artifact) return null;

	let payload;
	try {
		payload = readJsonFromZip(artifact.zip, (name) => name.endsWith('.json'));
	} catch {
		return null;
	}
	if (!payload || !Array.isArray(payload.findings)) return null;

	return {
		reported_at: artifact.createdAt,
		findings: payload.findings
			.filter((finding) => finding && typeof finding.rule === 'string')
			.map((finding) => ({
				rule: finding.rule,
				standard: finding.standard ?? null,
				severity: finding.severity === 'error' ? 'error' : 'warning',
				file: typeof finding.file === 'string' ? finding.file : null,
				line: Number.isFinite(finding.line) ? finding.line : null,
				message: typeof finding.message === 'string' ? finding.message.slice(0, 500) : null,
			})),
	};
}

async function main() {
	const args = parseArgs(process.argv.slice(2));
	const rules = loadRules();
	const levels = loadLevels();
	const fingerprint = policyFingerprint(rules, levels);

	const previous = readJsonOr(SCORECARD_PATH, null);
	const previousRows = new Map((previous?.repos ?? []).map((repo) => [repo.name, repo]));
	const policyChanged = previous?.policy_fingerprint !== fingerprint;
	const rescanAll = args.full || policyChanged || !previous;

	if (policyChanged && previous) {
		console.log('Rules or levels changed since the last sweep, so every row is rescored.');
	}

	const client = createClient({ org: args.org });

	const all = await client.listRepos();
	let fleet = all.filter((repo) => artifactTypeOf(repo.name) !== null);
	if (args.limit > 0) fleet = fleet.slice(0, args.limit);

	const stale = fleet.filter((repo) => {
		if (rescanAll) return true;
		const before = previousRows.get(repo.name);
		return !before || before.pushed_at !== repo.pushedAt;
	});

	console.log(
		`${all.length} repositories in the org, ${fleet.length} in scope, ${stale.length} to read ` +
			`(${fleet.length - stale.length} unchanged since the last sweep).`
	);

	const nodes = await client.readRepos(stale.map((repo) => repo.name));
	const packages = [...new Set(rules.map((rule) => rule.package).filter(Boolean))];
	const latestVersions = await latestReleases(client, packages);
	console.log(
		`Current releases: ${packages.map((name) => `${name}@${latestVersions[name] ?? 'unknown'}`).join(', ') || 'none'}`
	);

	// Detail files for repositories we are not re-reading are left exactly as
	// they are: they were written by the sweep that last read that repository and
	// are still what it reported. Only the ones being re-read get rewritten, and
	// files for repositories that have left the fleet are pruned at the end.
	if (!args.dryRun) mkdirSync(FINDINGS_DIR, { recursive: true });

	const staleNames = new Set(stale.map((repo) => repo.name));

	// The artifact lookup is the one read with no GraphQL equivalent, so it is a
	// REST call per repository and dominates the wall clock: sequentially the
	// fleet takes over a minute, almost all of it waiting. A small pool cuts that
	// to seconds. Kept small on purpose — GitHub answers a burst of parallel
	// requests with a secondary rate limit, and the retry that costs is worse
	// than the wait it saves.
	const complianceByRepo = new Map();
	const pending = stale.map((repo) => repo.name);
	await Promise.all(
		Array.from({ length: Math.min(8, pending.length) }, async () => {
			for (;;) {
				const name = pending.shift();
				if (name === undefined) return;
				complianceByRepo.set(name, await complianceFor(client, name));
			}
		})
	);

	const rows = [];

	for (const repo of fleet) {
		const carried = previousRows.get(repo.name);
		if (!staleNames.has(repo.name) && carried) {
			rows.push(carried);
			continue;
		}

		const node = nodes.get(repo.name);
		if (!node) continue;

		const type = artifactTypeOf(repo.name);
		const compliance = complianceByRepo.get(repo.name) ?? null;
		const signals = signalsFor({ node, compliance, rules, latestVersions });
		const verdicts = verdictsFor({ node, compliance, rules, type });

		if (!args.dryRun) {
			const detailPath = join(FINDINGS_DIR, `${repo.name}.json`);
			if (compliance && compliance.findings.length > 0) {
				writeFileSync(
					detailPath,
					JSON.stringify({ repo: repo.name, reported_at: compliance.reported_at, findings: compliance.findings })
				);
			} else {
				// A repository that fixed everything must stop serving the detail
				// file from the sweep that last found something.
				rmSync(detailPath, { force: true });
			}
		}

		rows.push({
			name: repo.name,
			url: repo.url,
			private: repo.isPrivate,
			artifact_type: type,
			language: repo.primaryLanguage?.name ?? null,
			packages: packagesFor(node, rules),
			pushed_at: repo.pushedAt,
			level: levelOf(signals, levels),
			signals,
			rules: verdicts,
			finding_count: compliance?.findings.length ?? 0,
			error_count: compliance?.findings.filter((finding) => finding.severity === 'error').length ?? 0,
			reported_at: compliance?.reported_at ?? null,
		});
	}

	rows.sort((a, b) => a.name.localeCompare(b.name));

	// A repository that was archived, renamed or deleted keeps its detail file
	// on the site forever otherwise, published under a name the board no longer
	// lists and nobody will think to look for.
	if (!args.dryRun) {
		const live = new Set(rows.map((row) => `${row.name}.json`));
		for (const file of readdirSync(FINDINGS_DIR)) {
			if (file.endsWith('.json') && !live.has(file)) rmSync(join(FINDINGS_DIR, file), { force: true });
		}
	}

	const generatedAt = new Date().toISOString();
	const scorecard = {
		schema: 1,
		generated_at: generatedAt,
		org: args.org,
		policy_fingerprint: fingerprint,
		levels: levels.levels,
		signals: levels.signals,
		rules: rules.map((rule) => ({
			id: rule.id,
			standard: rule.standard,
			title: rule.title,
			severity: rule.severity,
			engine: rule.engine,
			applies_to: rule.applies_to,
			package: rule.package ?? null,
			introduced_in: rule.introduced_in ?? null,
		})),
		package_versions: latestVersions,
		summary: summarise(rows, rules, levels),
		repos: rows,
	};

	if (args.dryRun) {
		console.log(JSON.stringify(scorecard.summary, null, 2));
		console.log(`\nDry run: nothing written. ${client.calls} API calls.`);
		return;
	}

	mkdirSync(DATA_DIR, { recursive: true });
	writeFileSync(SCORECARD_PATH, `${JSON.stringify(scorecard, null, '\t')}\n`);

	// A point a day would be 365 commits a year of a file nobody reads at that
	// resolution. One point per actual change keeps the trend honest and the
	// repository small.
	const history = readJsonOr(HISTORY_PATH, []);
	const point = {
		date: generatedAt.slice(0, 10),
		repos: scorecard.summary.repos,
		reporting: scorecard.summary.reporting,
		by_level: scorecard.summary.by_level,
	};
	const last = history[history.length - 1];
	const changed = !last || JSON.stringify({ ...last, date: null }) !== JSON.stringify({ ...point, date: null });
	if (changed) {
		history.push(point);
	} else {
		history[history.length - 1] = point;
	}
	writeFileSync(HISTORY_PATH, `${JSON.stringify(history.slice(-HISTORY_LIMIT), null, '\t')}\n`);

	console.log(
		`\nWrote ${rows.length} rows in ${client.calls} API calls. ` +
			`${scorecard.summary.reporting} reporting, ${scorecard.summary.findings} findings.`
	);
}

main().catch((error) => {
	console.error(error.message);
	process.exit(1);
});
