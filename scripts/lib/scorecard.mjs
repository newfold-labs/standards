/*
 * Turning what the sweep read into what the board shows.
 *
 * Everything here is pure: signals in, verdicts out, no network. That keeps the
 * scoring testable on fixtures and means a change to the level model can be
 * re-run over yesterday's raw reads without touching the API.
 *
 * The one idea worth holding on to is that a check has three outcomes, not two.
 * A repository can fail a rule, pass it, or be unable to run it at all because
 * it is pinned below the release that introduced it. Reporting the third as a
 * failure invents violations that the owning team cannot act on, and reporting
 * it as a pass claims a standard is met that was never tested.
 */
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import yaml from 'js-yaml';
import { admits, isFloating } from './constraint.mjs';
import { buildIndex, ruleForSniff, tallyBySniff } from './sniffs.mjs';
import { ROOT } from './docs.mjs';

export const RULES_DIR = join(ROOT, 'rules');

/** Artifact type is read from the repository name, which the org names consistently. */
const NAME_PREFIXES = [
	['wp-plugin-', 'plugin'],
	['wp-module-', 'module'],
	['wp-theme-', 'theme'],
	['cf-worker-', 'worker'],
];

/** Every rule definition. `_template.yml` and `levels.yml` are not rules. */
export function loadRules() {
	return readdirSync(RULES_DIR)
		.filter((name) => name.endsWith('.yml') && name !== '_template.yml' && name !== 'levels.yml')
		.map((name) => yaml.load(readFileSync(join(RULES_DIR, name), 'utf8')))
		.filter(Boolean)
		.sort((a, b) => a.id.localeCompare(b.id));
}

export function loadLevels() {
	return yaml.load(readFileSync(join(RULES_DIR, 'levels.yml'), 'utf8'));
}

/**
 * A hash of everything that decides a verdict.
 *
 * When the rules or the level model change, every stored row was scored under
 * the old model and has to be recomputed. Without this the sweep's incremental
 * path would happily keep serving verdicts from a policy that no longer exists.
 */
export function policyFingerprint(rules, levels) {
	const hash = createHash('sha256');
	hash.update(JSON.stringify({ rules, levels }));
	return hash.digest('hex').slice(0, 16);
}

export function artifactTypeOf(name) {
	for (const [prefix, type] of NAME_PREFIXES) {
		if (name.startsWith(prefix)) return type;
	}
	return null;
}

/** The constraint a composer.json declares for a package, from either require block. */
export function constraintFor(composerJson, packageName) {
	if (!composerJson) return null;
	return composerJson['require-dev']?.[packageName] ?? composerJson.require?.[packageName] ?? null;
}

function parseJson(text) {
	if (typeof text !== 'string') return null;
	try {
		return JSON.parse(text);
	} catch {
		// Malformed manifests exist. They are the repository's problem to fix,
		// not a reason to abort a fleet-wide sweep.
		return null;
	}
}

/**
 * Every signal for one repository, as true, false or null.
 *
 * null means we could not tell. It is kept distinct all the way to the board,
 * because "we did not look" and "it is not there" earn very different reactions
 * from the team that owns the row.
 */
export function signalsFor({ node, compliance, rules, latestVersions }) {
	const composer = parseJson(node.composer?.text);
	const type = artifactTypeOf(node.name);

	// Which packages this artifact type is expected to carry, derived from the
	// rules themselves rather than hardcoded, so adding a rule for a new engine
	// extends the signal without touching this file.
	const expected = [
		...new Set(
			rules
				.filter((rule) => rule.package && (rule.applies_to ?? []).includes(type))
				.map((rule) => rule.package)
		),
	];

	// Vacuously true when nothing is expected. An artifact type we have not
	// written a standard for yet must not be marked delinquent for failing to
	// install a package nobody publishes for it: workers are the live example,
	// and reporting all 36 of them as "not adopted" would read as negligence by
	// their teams rather than as a gap in this repository. The rule matrix still
	// shows every rule as not applicable to them, so no credit is implied.
	const present = expected.length === 0 ? true : expected.every((name) => constraintFor(composer, name) !== null);

	// Pinning is judged before currency, because an unpinned constraint admits the
	// latest release and would otherwise score as the most current thing in the
	// fleet while being the least predictable.
	const pinned =
		expected.length === 0
			? true
			: expected.every((name) => {
					const constraint = constraintFor(composer, name);
					return constraint !== null && !isFloating(constraint);
				});

	let current = null;
	if (expected.length === 0) {
		current = true;
	} else if (present && pinned) {
		const verdicts = expected.map((name) => {
			const latest = latestVersions[name];
			if (!latest) return null;
			return admits(constraintFor(composer, name), latest);
		});
		current = verdicts.some((verdict) => verdict === null) ? null : verdicts.every(Boolean);
	} else if (present && !pinned) {
		current = false;
	}

	const owners = node.codeowners?.text ?? node.codeownersRoot?.text ?? null;
	const hasOwner = owners === null ? false : owners.split('\n').some((line) => line.trim() && !line.trim().startsWith('#'));

	return {
		standards_package_present: present,
		standards_package_pinned: pinned,
		standards_package_current: current,
		check_reports: compliance !== null,
		// Gated on findings that cite a documented standard, not on raw phpcs
		// severity. The inherited sniffs carry WPCS's severities, where a missing
		// docblock is an error and a security finding is a warning, so gating on
		// those would measure the fleet against a policy we did not write and
		// almost nothing would ever reach this rung.
		no_error_findings:
			compliance === null
				? null
				: !compliance.findings.some((f) => f.severity === 'error' && f.rule),
		has_codeowners: hasOwner,
		has_ai_context: Boolean(node.agents ?? node.claude),
	};
}

/**
 * The highest rung whose signals hold and whose every lower rung also holds.
 *
 * A null signal blocks the rung it gates. Promoting on an unknown would claim
 * progress we did not measure.
 */
export function levelOf(signals, levels) {
	let reached = 0;
	for (const rung of levels.levels) {
		if (rung.level === 0) continue;
		const satisfied = rung.requires.every((id) => signals[id] === true);
		if (!satisfied) break;
		reached = rung.level;
	}
	return reached;
}

/**
 * Per-rule verdicts for one repository.
 *
 * `not_applicable` — the rule does not bind this artifact type.
 * `pass` / `fail`  — something actually looked at the code and this is what it
 *                    said. Evidence is the repository's own report where there
 *                    is one, and the central scan otherwise.
 * `ineligible`     — no evidence, and the repository could not have produced any
 *                    itself: the package is absent or pinned below the release
 *                    that introduced the rule.
 * `unknown`        — no evidence, no reason it could not exist.
 *
 * Note what `ineligible` no longer means. Once the scan has looked at the code,
 * a violation is a violation whether or not the repository's own pin could have
 * caught it; the pin is reported in its own column. Withholding the finding
 * because their CI would have missed it would hide a real problem behind a
 * version number.
 */
export function verdictsFor({ node, findings, hasEvidence, rules, type }) {
	const composer = parseJson(node.composer?.text);
	const verdicts = {};
	const failed = new Set((findings ?? []).map((finding) => finding.rule).filter(Boolean));

	for (const rule of rules) {
		if (!(rule.applies_to ?? []).includes(type)) {
			verdicts[rule.id] = 'not_applicable';
			continue;
		}

		if (hasEvidence) {
			verdicts[rule.id] = failed.has(rule.id) ? 'fail' : 'pass';
			continue;
		}

		const constraint = rule.package ? constraintFor(composer, rule.package) : null;
		if (rule.package && constraint === null) {
			verdicts[rule.id] = 'ineligible';
			continue;
		}
		if (rule.package && rule.introduced_in) {
			const reaches = admits(constraint, rule.introduced_in);
			if (reaches === false) {
				verdicts[rule.id] = 'ineligible';
				continue;
			}
		}

		verdicts[rule.id] = 'unknown';
	}

	return verdicts;
}

/**
 * Fold a central scan result into the shape the board reads.
 *
 * Kept separate from a repository's own report throughout. A scan is us looking
 * at the repository; a report is the repository telling us. They are different
 * claims and the board says which one it is showing.
 */
export function summariseScan(scan, rules) {
	if (!scan || scan.scanned !== true) return null;
	const index = buildIndex(rules);
	const bySniff = tallyBySniff(scan.findings ?? [], index);

	let cited = 0;
	let uncited = 0;
	for (const bucket of Object.values(bySniff)) {
		const total = bucket.errors + bucket.warnings;
		if (bucket.rule) cited += total;
		else uncited += total;
	}

	return {
		files: scan.files ?? 0,
		errors: scan.errors ?? 0,
		warnings: scan.warnings ?? 0,
		cited,
		uncited,
		by_sniff: bySniff,
	};
}

/** Attach the citing rule to each finding, so the detail file can link out. */
export function citeFindings(findings, rules) {
	const index = buildIndex(rules);
	return (findings ?? []).map((finding) => ({
		...finding,
		rule: ruleForSniff(finding.source, index),
	}));
}

/** The constraint each expected package is declared at, for display and for bump PRs. */
export function packagesFor(node, rules) {
	const composer = parseJson(node.composer?.text);
	const type = artifactTypeOf(node.name);
	const declared = {};
	for (const rule of rules) {
		if (!rule.package || !(rule.applies_to ?? []).includes(type)) continue;
		declared[rule.package] = constraintFor(composer, rule.package);
	}
	return declared;
}

/** Fleet rollups. Computed here so the page never has to add anything up itself. */
export function summarise(repos, rules, levels) {
	const byLevel = Object.fromEntries(levels.levels.map((rung) => [rung.level, 0]));
	for (const repo of repos) byLevel[repo.level] = (byLevel[repo.level] ?? 0) + 1;

	const byType = {};
	for (const repo of repos) {
		const bucket = (byType[repo.artifact_type ?? 'other'] ??= { repos: 0, levels: {} });
		bucket.repos++;
		bucket.levels[repo.level] = (bucket.levels[repo.level] ?? 0) + 1;
	}

	// What is actually wrong across the fleet, by sniff. This is the view that
	// answers "what should we fix first", which no per-repository row can: one
	// repository with forty array-spacing findings is a tidy-up, and forty
	// repositories with one each is a standard nobody knows about.
	const bySniff = {};
	for (const repo of repos) {
		for (const [sniff, counts] of Object.entries(repo.scan?.by_sniff ?? {})) {
			const bucket = (bySniff[sniff] ??= { errors: 0, warnings: 0, repos: 0, rule: counts.rule ?? null, in: [] });
			bucket.errors += counts.errors;
			bucket.warnings += counts.warnings;
			bucket.repos++;
			// Which repositories, not just how many. Fixing something across the
			// fleet starts with the list of places to go, and making the board ask
			// for that separately would mean a second request per issue.
			bucket.in.push({ name: repo.name, errors: counts.errors, warnings: counts.warnings });
		}
	}
	for (const bucket of Object.values(bySniff)) {
		bucket.in.sort((a, b) => b.errors + b.warnings - (a.errors + a.warnings));
	}

	// Emitted as a sorted array rather than a map. Liquid cannot sort a hash by a
	// value nested inside it, so ordering this here is the difference between the
	// board showing what matters first and showing it alphabetically.
	//
	// Ordered by how many repositories a sniff appears in, then by volume. One
	// repository with four hundred array-spacing findings is a tidy-up; forty
	// repositories with one each is a standard nobody has been told about, and
	// that is the more useful thing to see first.
	const spread = Object.entries(bySniff)
		.map(([sniff, counts]) => ({ sniff, ...counts, total: counts.errors + counts.warnings }))
		.sort((a, b) => {
			if (b.repos !== a.repos) return b.repos - a.repos;
			return b.total - a.total;
		});

	// Plot coordinates for spread against volume, computed here because Liquid
	// has no logarithm and volume spans four orders of magnitude.
	//
	// The two axes disagree on purpose, and the disagreement is the useful part.
	// 18,257 findings confined to 25 repositories is one mechanical pass with
	// phpcbf; 5,594 spread across 64 is a decision nobody has taken. A list
	// ordered by either number alone hides the distinction.
	const maxRepos = Math.max(1, ...spread.map((entry) => entry.repos));
	const maxTotal = Math.max(1, ...spread.map((entry) => entry.total));
	const logMax = Math.log10(maxTotal);
	for (const entry of spread) {
		entry.x = Math.round((entry.repos / maxRepos) * 1000) / 10;
		entry.y = Math.round((Math.log10(Math.max(1, entry.total)) / logMax) * 1000) / 10;
	}

	// How much of the pile a handful of decisions would move. The headline number
	// is otherwise 83,195, which is true, unusable, and impossible to feel.
	const ranked = [...spread].sort((a, b) => b.total - a.total);
	const allFindings = ranked.reduce((sum, entry) => sum + entry.total, 0);
	const share = (n) =>
		allFindings === 0 ? 0 : Math.round((ranked.slice(0, n).reduce((sum, e) => sum + e.total, 0) / allFindings) * 100);
	const concentration = { top3: share(3), top10: share(10), top20: share(20) };

	// Axis ticks, so the plot is a chart and not a decoration. Powers of ten up
	// the log axis, and round counts across the linear one, each carrying the
	// position the same formula gives the marks.
	const axis = {
		max_repos: maxRepos,
		max_total: maxTotal,
		x: [1, 5, 10, 20, 40, 60]
			.filter((n) => n <= maxRepos)
			.map((n) => ({ at: Math.round((n / maxRepos) * 1000) / 10, label: String(n) })),
		y: [1, 10, 100, 1000, 10000]
			.filter((n) => n <= maxTotal)
			.map((n) => ({ at: Math.round((Math.log10(n) / logMax) * 1000) / 10, label: n >= 1000 ? `${n / 1000}k` : String(n) })),
	};
	const loudest = ranked.slice(0, 10).map((entry) => ({
		sniff: entry.sniff,
		total: entry.total,
		errors: entry.errors,
		repos: entry.repos,
		rule: entry.rule,
	}));

	const byRule = {};
	for (const rule of rules) {
		const tally = { pass: 0, fail: 0, ineligible: 0, unknown: 0, not_applicable: 0 };
		for (const repo of repos) {
			const verdict = repo.rules?.[rule.id];
			if (verdict) tally[verdict]++;
		}
		byRule[rule.id] = tally;
	}

	// Findings are split by where they came from and by whether anything can be
	// cited for them. "How much is wrong" and "how much of it maps to a standard
	// we have written down" are different questions and the second one is the
	// backlog, so the board should never merge them into one number.
	const shown = repos.filter((repo) => repo.finding_source !== null && repo.finding_source !== undefined);

	// Density rather than raw count. One repository holds 19% of every finding in
	// the fleet purely by being large, and a list ordered by raw count is just a
	// list of the biggest repositories. Findings per file is what says which
	// codebase is actually in the worst shape.
	const worst = repos
		.filter((repo) => (repo.scan?.files ?? 0) > 0 && (repo.finding_count ?? 0) > 0)
		.map((repo) => ({
			name: repo.name,
			findings: repo.finding_count,
			errors: repo.error_count,
			files: repo.scan.files,
			per_file: Math.round((repo.finding_count / repo.scan.files) * 10) / 10,
		}))
		.sort((a, b) => b.per_file - a.per_file);

	return {
		repos: repos.length,
		reporting: repos.filter((repo) => repo.signals.check_reports).length,
		owned: repos.filter((repo) => repo.signals.has_codeowners).length,
		ai_context: repos.filter((repo) => repo.signals.has_ai_context).length,
		worst,
		scanned: repos.filter((repo) => repo.finding_source === 'scanned').length,
		with_findings: shown.filter((repo) => (repo.finding_count ?? 0) > 0).length,
		findings: repos.reduce((total, repo) => total + (repo.finding_count ?? 0), 0),
		cited: repos.reduce((total, repo) => total + (repo.cited_count ?? 0), 0),
		errors: repos.reduce((total, repo) => total + (repo.error_count ?? 0), 0),
		by_level: byLevel,
		by_type: byType,
		by_rule: byRule,
		by_sniff: spread,
		concentration,
		axis,
		loudest,
	};
}
