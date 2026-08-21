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
		no_error_findings: compliance === null ? null : !compliance.findings.some((f) => f.severity === 'error'),
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
 * `ineligible`     — it binds, but the repository cannot run the check: the
 *                    package is absent, or pinned below `introduced_in`.
 * `unknown`        — it could run, but the repository has reported nothing.
 * `pass` / `fail`  — it ran and this is what it said.
 */
export function verdictsFor({ node, compliance, rules, type }) {
	const composer = parseJson(node.composer?.text);
	const verdicts = {};

	for (const rule of rules) {
		if (!(rule.applies_to ?? []).includes(type)) {
			verdicts[rule.id] = 'not_applicable';
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
			if (reaches === null) {
				verdicts[rule.id] = 'unknown';
				continue;
			}
		}

		if (compliance === null) {
			verdicts[rule.id] = 'unknown';
			continue;
		}

		verdicts[rule.id] = compliance.findings.some((finding) => finding.rule === rule.id) ? 'fail' : 'pass';
	}

	return verdicts;
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

	const byRule = {};
	for (const rule of rules) {
		const tally = { pass: 0, fail: 0, ineligible: 0, unknown: 0, not_applicable: 0 };
		for (const repo of repos) {
			const verdict = repo.rules?.[rule.id];
			if (verdict) tally[verdict]++;
		}
		byRule[rule.id] = tally;
	}

	return {
		repos: repos.length,
		reporting: repos.filter((repo) => repo.signals.check_reports).length,
		findings: repos.reduce((total, repo) => total + (repo.finding_count ?? 0), 0),
		by_level: byLevel,
		by_type: byType,
		by_rule: byRule,
	};
}
