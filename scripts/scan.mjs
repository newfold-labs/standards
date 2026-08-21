#!/usr/bin/env node
/*
 * The central scan.
 *
 * Runs the Newfold standard over every PHP repository in the org and records
 * what it finds, so the board shows real violations without waiting for every
 * repository to adopt a reporting workflow first.
 *
 * It reports everything phpcs reports. No allowlist, no filtering to the rules
 * that happen to be written: the whole point is that running this is equivalent
 * to a developer running phpcs on the repository themselves, and they would see
 * all of it.
 *
 * Why this is affordable, when "lint the fleet nightly" usually is not:
 *
 *   - Shallow clones, blobs only at HEAD. Measured at about four seconds a
 *     repository including the scan, so the PHP fleet is a few minutes.
 *   - No `composer install` anywhere. The standard is installed once, here, and
 *     pointed at each checkout. Installing per repository would be the entire
 *     cost of this job and would need registry credentials besides.
 *   - Repositories are scanned in parallel and thrown away as soon as they are
 *     scanned, so disk stays flat rather than growing with the fleet.
 *
 * Usage:
 *   node scripts/scan.mjs --standard <path to Newfold ruleset> [--out dir]
 *                         [--org newfold-labs] [--limit N] [--jobs N]
 */
import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { createClient } from './lib/github.mjs';
import { ROOT } from './lib/docs.mjs';
import { artifactTypeOf } from './lib/scorecard.mjs';
import { parseExplainOutput } from './lib/sniffs.mjs';

const run = promisify(execFile);

/** Artifact types with a PHP standard to run. Workers have none, so cloning one is wasted. */
const PHP_TYPES = new Set(['plugin', 'theme', 'module']);

/**
 * Paths never worth scanning.
 *
 * Vendored and generated code is not the repository's to fix, and including it
 * would swamp every real finding. Tests are excluded because the standard is
 * written for shipped code; a repository that wants them linted lints them in
 * its own CI, where that is its decision to make.
 */
const IGNORE = ['*/vendor/*', '*/node_modules/*', '*/tests/*', '*/build/*', '*/dist/*', '*/.git/*'];

function parseArgs(argv) {
	const args = { org: 'newfold-labs', standard: null, out: join(ROOT, '_scan'), limit: 0, jobs: 4, full: false };
	for (let i = 0; i < argv.length; i++) {
		if (argv[i] === '--standard') args.standard = argv[++i];
		else if (argv[i] === '--out') args.out = argv[++i];
		else if (argv[i] === '--org') args.org = argv[++i];
		else if (argv[i] === '--limit') args.limit = Number(argv[++i]);
		else if (argv[i] === '--jobs') args.jobs = Number(argv[++i]);
		else if (argv[i] === '--full') args.full = true;
	}
	return args;
}

/**
 * A repository-relative path, whatever phpcs reported.
 *
 * Both the resolved and unresolved checkout roots are tried, and if neither
 * matches the path is cut at the checkout directory name. A published finding
 * must never carry an absolute path: it leaks the runner's directory layout and,
 * worse, it is useless, because nobody can find
 * `/private/var/folders/.../T/nfd-scan-lcECRm/repo/includes/Thing.php` in a
 * repository.
 */
function relativise(path, root, checkout) {
	for (const prefix of [root, checkout]) {
		if (prefix && path.startsWith(prefix + '/')) return path.slice(prefix.length + 1);
	}
	const marker = path.lastIndexOf('/repo/');
	if (marker !== -1) return path.slice(marker + '/repo/'.length);
	return path;
}

/** How many PHP files a checkout actually holds, ignoring the paths we skip. */
async function countPhpFiles(root) {
	try {
		const { stdout } = await run('bash', [
			'-c',
			`find ${JSON.stringify(root)} -name '*.php' -not -path '*/vendor/*' -not -path '*/node_modules/*' ` +
				`-not -path '*/tests/*' -not -path '*/build/*' -not -path '*/dist/*' | head -1000 | wc -l`,
		]);
		return Number(stdout.trim()) || 0;
	} catch {
		return 0;
	}
}

/** The sniffs the standard resolves to, asked of phpcs rather than written down. */
async function catalogue(phpcs, standard) {
	const { stdout } = await run(phpcs, ['--standard=' + standard, '-e'], { maxBuffer: 32 * 1024 * 1024 });
	return parseExplainOutput(stdout);
}

/**
 * Clone one repository shallowly and scan it.
 *
 * Everything is best-effort. A repository that cannot be cloned or scanned is
 * recorded as not scanned, never as clean: a board that reports an unreachable
 * repository as having no problems is worse than one that admits it looked away.
 */
async function scanOne({ repo, token, org, phpcs, standard }) {
	const workspace = mkdtempSync(join(tmpdir(), 'nfd-scan-'));
	const checkout = join(workspace, 'repo');

	try {
		const url = `https://x-access-token:${token}@github.com/${org}/${repo}.git`;
		await run('git', ['clone', '--depth', '1', '--quiet', '--no-tags', url, checkout], {
			timeout: 180_000,
		});

		// An empty repository has no HEAD to resolve. That is not a failure to
		// scan, it is a repository with nothing in it, so the commit is simply
		// unknown and the findings link by path alone.
		let commit = null;
		try {
			const { stdout: head } = await run('git', ['-C', checkout, 'rev-parse', 'HEAD']);
			commit = head.trim();
		} catch {
			commit = null;
		}

		let report;
		try {
			const { stdout } = await run(
				phpcs,
				[
					`--standard=${standard}`,
					'--report=json',
					'--extensions=php',
					`--ignore=${IGNORE.join(',')}`,
					'--runtime-set', 'ignore_warnings_on_exit', '1',
					'-q',
					checkout,
				],
				{ maxBuffer: 256 * 1024 * 1024, timeout: 600_000 }
			);
			report = JSON.parse(stdout);
		} catch (error) {
			// phpcs exits non-zero whenever it finds anything, so a non-zero exit
			// is the normal case and the payload is still on stdout. Only an
			// unparseable payload is a real failure.
			if (!error.stdout) throw error;
			report = JSON.parse(error.stdout);
		}

		// phpcs reports resolved paths, and on macOS /var is a symlink to
		// /private/var, so comparing against the path mkdtemp handed back matches
		// nothing and every finding keeps its absolute temp path. Resolving the
		// checkout first is what makes the prefix comparable.
		const root = realpathSync(checkout);

		const findings = [];
		for (const [path, file] of Object.entries(report.files ?? {})) {
			const relative = relativise(path, root, checkout);
			for (const message of file.messages ?? []) {
				findings.push({
					source: message.source,
					severity: message.type === 'ERROR' ? 'error' : 'warning',
					// phpcs knows which of its own findings phpcbf can rewrite. It is
					// the most actionable fact in the report — the difference between
					// "somebody must decide something" and "run one command" — and it
					// costs nothing to carry.
					fixable: message.fixable === true,
					file: relative,
					line: message.line ?? null,
					message: String(message.message ?? '').slice(0, 500),
				});
			}
		}

		// A scan that processed nothing, in a checkout that plainly has PHP in it,
		// did not find a clean repository: it failed and said nothing. Reporting
		// that as zero findings is the worst thing this tool could do, so it is
		// treated as a failure to scan.
		const processed = Object.keys(report.files ?? {}).length;
		if (processed === 0 && (await countPhpFiles(root)) > 0) {
			throw new Error('phpcs processed no files in a checkout that contains PHP');
		}

		return {
			repo,
			scanned: true,
			commit,
			files: processed,
			errors: report.totals?.errors ?? 0,
			warnings: report.totals?.warnings ?? 0,
			findings,
		};
	} catch (error) {
		return { repo, scanned: false, reason: String(error.message ?? error).slice(0, 200), findings: [] };
	} finally {
		rmSync(workspace, { recursive: true, force: true });
	}
}

async function main() {
	const args = parseArgs(process.argv.slice(2));
	if (!args.standard) {
		console.error('Pass --standard, the path to the Newfold ruleset directory or its ruleset.xml.');
		process.exit(1);
	}

	const token = process.env.SCORECARD_TOKEN || process.env.GITHUB_TOKEN;
	if (!token) {
		console.error('No token. The scan clones private repositories, so it needs one that can read the org.');
		process.exit(1);
	}

	const phpcs = process.env.PHPCS_BIN || 'phpcs';
	const sniffs = await catalogue(phpcs, args.standard);
	console.log(`Standard resolves to ${sniffs.length} sniffs.`);

	const client = createClient({ org: args.org, token });
	let fleet = (await client.listRepos()).filter((repo) => PHP_TYPES.has(artifactTypeOf(repo.name)));
	if (args.limit > 0) fleet = fleet.slice(0, args.limit);

	mkdirSync(args.out, { recursive: true });

	// The sniff catalogue stands in for the standard itself. If a release adds,
	// removes or re-scopes a sniff, every stored result was produced by a
	// different standard and none of them can be carried forward.
	const fingerprint = createHash('sha256').update(sniffs.join('\n')).digest('hex').slice(0, 16);

	let previous = null;
	const indexPath = join(args.out, 'index.json');
	if (!args.full && existsSync(indexPath)) {
		try {
			const stored = JSON.parse(readFileSync(indexPath, 'utf8'));
			if (stored.fingerprint === fingerprint) previous = stored;
			else console.log('The standard changed since the last scan, so everything is scanned again.');
		} catch {
			previous = null;
		}
	}

	const before = new Map((previous?.repos ?? []).map((entry) => [entry.repo, entry]));

	// A repository nobody has pushed to cannot have new findings, and its result
	// file from the last scan is still on disk. Cloning it again to produce an
	// identical answer is the one genuinely wasted thing this job could do.
	const carried = [];
	const pending = [];
	for (const repo of fleet) {
		const stored = before.get(repo.name);
		const unchanged =
			stored && stored.scanned && stored.pushed_at === repo.pushedAt && existsSync(join(args.out, `${repo.name}.json`));
		if (unchanged) carried.push(stored);
		else pending.push(repo.name);
	}

	console.log(
		`${fleet.length} PHP repositories: ${pending.length} to scan, ` +
			`${carried.length} unchanged since the last scan.`
	);

	// Captured before the pool starts, because `pending` is the work queue the
	// workers shift from: reading its length for progress reports a denominator
	// that shrinks as the job proceeds.
	const toScan = pending.length;
	const results = [...carried];
	const started = Date.now();

	await Promise.all(
		Array.from({ length: Math.min(args.jobs, pending.length) }, async () => {
			for (;;) {
				const repo = pending.shift();
				if (repo === undefined) return;

				const result = await scanOne({ repo, token, org: args.org, phpcs, standard: args.standard });
				result.pushed_at = fleet.find((entry) => entry.name === repo)?.pushedAt ?? null;
				results.push(result);

				// Findings go to their own file per repository. Holding the fleet's
				// findings in memory to write one document at the end is what turns
				// this from a few hundred megabytes of disk into a few gigabytes of
				// heap.
				writeFileSync(
					join(args.out, `${repo}.json`),
					JSON.stringify({
						repo,
						scanned: result.scanned,
						commit: result.commit ?? null,
						reason: result.reason ?? null,
						files: result.files ?? 0,
						errors: result.errors ?? 0,
						warnings: result.warnings ?? 0,
						findings: result.findings,
					})
				);

				const done = results.length - carried.length;
				if (done % 10 === 0 || done === toScan) {
					console.log(`  ${done}/${toScan} scanned`);
				}
			}
		})
	);

	const scanned = results.filter((result) => result.scanned);
	const totals = scanned.reduce(
		(sum, result) => ({ errors: sum.errors + result.errors, warnings: sum.warnings + result.warnings }),
		{ errors: 0, warnings: 0 }
	);

	writeFileSync(
		join(args.out, 'index.json'),
		`${JSON.stringify(
			{
				scanned_at: new Date().toISOString(),
				org: args.org,
				fingerprint,
				sniffs,
				repos: results
					.map((result) => ({
						repo: result.repo,
						scanned: result.scanned,
						commit: result.commit ?? null,
						pushed_at: result.pushed_at ?? null,
						reason: result.reason ?? null,
						files: result.files ?? 0,
						errors: result.errors ?? 0,
						warnings: result.warnings ?? 0,
						// A freshly scanned result carries the findings themselves; one
						// carried forward from the last scan carries only their count.
						findings: Array.isArray(result.findings) ? result.findings.length : (result.findings ?? 0),
					}))
					.sort((a, b) => a.repo.localeCompare(b.repo)),
			},
			null,
			'\t'
		)}\n`
	);

	const seconds = Math.round((Date.now() - started) / 1000);
	console.log(
		`\nScanned ${scanned.length}/${fleet.length} in ${seconds}s. ` +
			`${totals.errors} errors, ${totals.warnings} warnings.`
	);
	for (const failure of results.filter((result) => !result.scanned)) {
		console.log(`  not scanned: ${failure.repo} (${failure.reason})`);
	}
}

main().catch((error) => {
	console.error(error.message);
	process.exit(1);
});
