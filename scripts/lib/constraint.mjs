/*
 * Just enough Composer constraint reading to answer one question: can this
 * repository's declared constraint ever install the release that introduced a
 * rule?
 *
 * That question is the whole reason `package` and `introduced_in` exist on a
 * rule. A repository pinned below the release that added a check is not failing
 * that check, it cannot run it, and a scorecard that conflates the two reports
 * violations nobody can act on.
 *
 * This is deliberately not a Composer-complete implementation. It recognises the
 * forms that appear in our fleet and answers `null` for anything else, which the
 * scorer reports as unknown rather than guessing. A wrong "pinned too low" is a
 * bug report against a team that did nothing wrong, so silence beats a guess.
 */

/**
 * Whether a constraint declines to pin at all.
 *
 * `@stable`, `*` and a branch alias all install whatever is newest at the time
 * `composer update` runs. They admit the current release, so a naive reading
 * scores them as the most up-to-date repositories in the fleet, when they are
 * the ones a release can break without warning. Rolling a standards change out
 * as a version bump instead of an overnight CI failure is the point of pinning,
 * so this is tracked as its own state rather than folded into "current".
 */
export function isFloating(constraint) {
	if (typeof constraint !== 'string') return false;
	const raw = constraint.trim();
	if (raw === '' || raw === '*' || raw.startsWith('@')) return true;
	return raw.startsWith('dev-') || raw.endsWith('.x-dev');
}

/** Split a version into comparable integers. Trailing junk (-beta, +build) is dropped. */
function parts(version) {
	const cleaned = String(version).trim().replace(/^v/, '').split(/[-+]/)[0];
	if (!/^\d+(\.\d+)*$/.test(cleaned)) return null;
	const numbers = cleaned.split('.').map(Number);
	while (numbers.length < 3) numbers.push(0);
	return numbers.slice(0, 3);
}

/** -1, 0 or 1, comparing two dotted versions. */
export function compare(a, b) {
	const left = parts(a);
	const right = parts(b);
	if (!left || !right) return 0;
	for (let i = 0; i < 3; i++) {
		if (left[i] !== right[i]) return left[i] < right[i] ? -1 : 1;
	}
	return 0;
}

/**
 * The half-open range [min, max) a single comparator admits, or null if this
 * function does not understand it.
 */
function range(term) {
	const raw = term.trim();
	if (raw === '' || raw === '*' || raw === '@stable' || raw === '@dev') {
		return { min: [0, 0, 0], max: null };
	}

	// A branch alias says nothing about released versions, and treating
	// `dev-main` as "any version" would mark a repository current when it is
	// tracking a moving target.
	if (raw.startsWith('dev-') || raw.endsWith('.x-dev')) return null;

	const match = raw.match(/^(\^|~|>=|>|<=|<|=)?\s*v?(\d+(?:\.\d+)*)/);
	if (!match) return null;

	const operator = match[1] ?? '=';
	const given = match[2].split('.').map(Number);
	const min = [given[0], given[1] ?? 0, given[2] ?? 0];

	switch (operator) {
		// ^1.2.6 admits anything below 2.0.0. ^0.2 is special in Composer: with a
		// leading zero the caret pins the first non-zero place instead.
		case '^': {
			if (min[0] === 0 && given.length > 1) return { min, max: [0, min[1] + 1, 0] };
			return { min, max: [min[0] + 1, 0, 0] };
		}
		// ~1.2.6 allows the last given place to move; ~1.2 allows the minor to.
		case '~': {
			if (given.length >= 3) return { min, max: [min[0], min[1] + 1, 0] };
			return { min, max: [min[0] + 1, 0, 0] };
		}
		case '>=':
			return { min, max: null };
		case '>':
			return { min: [min[0], min[1], min[2] + 1], max: null };
		case '<':
			return { min: [0, 0, 0], max: min };
		case '<=':
			return { min: [0, 0, 0], max: [min[0], min[1], min[2] + 1] };
		case '=':
		default: {
			// A wildcard is a range; a bare version is a point.
			if (/\.\*$/.test(raw)) {
				if (given.length >= 2) return { min: [min[0], min[1], 0], max: [min[0], min[1] + 1, 0] };
				return { min: [min[0], 0, 0], max: [min[0] + 1, 0, 0] };
			}
			return { min, max: [min[0], min[1], min[2] + 1] };
		}
	}
}

function within(version, bounds) {
	const target = parts(version);
	if (!target || !bounds) return null;
	const atLeastMin = compare(target.join('.'), bounds.min.join('.')) >= 0;
	const belowMax = bounds.max === null || compare(target.join('.'), bounds.max.join('.')) < 0;
	return atLeastMin && belowMax;
}

/**
 * Whether `constraint` admits `version`.
 *
 * Returns true, false, or null when the constraint is not one we read. Callers
 * must treat null as unknown and not as false.
 */
export function admits(constraint, version) {
	if (typeof constraint !== 'string' || constraint.trim() === '') return null;

	// `||` is alternation: any branch admitting the version is enough.
	const alternatives = constraint.split('||');
	let sawUnknown = false;

	for (const alternative of alternatives) {
		// Space or comma inside one alternative is conjunction: >=1.2 <2.0.
		const terms = alternative.split(/[\s,]+/).filter(Boolean);
		if (terms.length === 0) continue;

		let allHold = true;
		let branchUnknown = false;

		for (const term of terms) {
			const verdict = within(version, range(term));
			if (verdict === null) {
				branchUnknown = true;
				break;
			}
			if (verdict === false) {
				allHold = false;
				break;
			}
		}

		if (branchUnknown) {
			sawUnknown = true;
			continue;
		}
		if (allHold) return true;
	}

	return sawUnknown ? null : false;
}
