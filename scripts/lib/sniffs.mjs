/*
 * Sniff codes, and attaching standards to them.
 *
 * The model here is deliberately the opposite way round from where this started.
 *
 * A rule used to name one sniff, and the board could only show a finding that
 * some rule had named. That does not scale: the Newfold standard runs about
 * three hundred sniffs, four of which are ours, so covering it would have meant
 * three hundred rule files and the board showed two things.
 *
 * So findings are never filtered. Everything phpcs reports is reported, grouped
 * by the hierarchy already present in its own sniff codes. A rule is enrichment
 * layered on top: it attaches a standard id to a sniff or a family of them, so
 * that finding gains a citation. A finding with no rule is still shown, it just
 * has nothing to cite yet.
 *
 * What this buys: a new sniff arriving in a WPCS release appears on the board
 * with no change here, and writing a rule adds a citation without ever being
 * what makes a violation visible.
 */

/**
 * Split a phpcs source into its parts.
 *
 * A source is `Standard.Category.Sniff.Code`, for example
 * `WordPress.Security.EscapeOutput.OutputNotEscaped`. The last segment is the
 * specific message and the first three identify the sniff, which is the level
 * everything here groups at.
 */
export function parseSniff(source) {
	const parts = String(source ?? '').split('.');
	return {
		standard: parts[0] ?? null,
		category: parts[1] ?? null,
		sniff: parts.slice(0, 3).join('.'),
		family: parts.slice(0, 2).join('.'),
		code: parts[3] ?? null,
	};
}

/**
 * Every sniff prefix a rule claims.
 *
 * `config.sniffs` is a list and is the form to write. `config.sniff` is the
 * single-sniff form the first two rules were written in and still works, so a
 * rule does not have to change to keep meaning what it meant.
 */
export function claimedPrefixes(rule) {
	const config = rule?.config ?? {};
	const listed = config.sniffs ?? (config.sniff ? [config.sniff] : []);
	return listed.filter((prefix) => typeof prefix === 'string' && prefix.length > 0);
}

/**
 * An index from sniff prefix to rule id.
 *
 * Two rules claiming the same prefix is a mistake worth catching rather than
 * resolving quietly, so the collision is returned instead of one silently
 * winning.
 */
export function buildIndex(rules) {
	const byPrefix = new Map();
	const collisions = [];

	for (const rule of rules) {
		for (const prefix of claimedPrefixes(rule)) {
			if (byPrefix.has(prefix)) {
				collisions.push({ prefix, rules: [byPrefix.get(prefix), rule.id] });
				continue;
			}
			byPrefix.set(prefix, rule.id);
		}
	}

	return { byPrefix, collisions };
}

/**
 * The rule citing a sniff, or null.
 *
 * Longest prefix wins, so a rule naming one specific sniff beats a rule that
 * claims its whole family. That is what lets a broad rule cover a category while
 * a precise one carves out the part of it that has its own standard.
 */
export function ruleForSniff(source, index) {
	const parts = String(source ?? '').split('.');
	for (let depth = parts.length; depth > 0; depth--) {
		const prefix = parts.slice(0, depth).join('.');
		const rule = index.byPrefix.get(prefix);
		if (rule) return rule;
	}
	return null;
}

/**
 * Roll a list of findings up by sniff.
 *
 * The board needs counts far more often than it needs individual lines, and a
 * repository with three hundred findings should not put three hundred rows in
 * the file every page load reads.
 */
export function tallyBySniff(findings, index) {
	const tally = {};
	for (const finding of findings) {
		const { sniff } = parseSniff(finding.source);
		const bucket = (tally[sniff] ??= {
			errors: 0,
			warnings: 0,
			fixable: 0,
			rule: ruleForSniff(finding.source, index),
		});
		if (finding.severity === 'error') bucket.errors++;
		else bucket.warnings++;
		if (finding.fixable) bucket.fixable++;
	}
	return tally;
}

/**
 * The sniffs a standard actually runs, read from phpcs rather than written down.
 *
 * `phpcs -e` prints the sniffs a standard resolves to. Deriving the catalogue
 * this way means a WPCS upgrade that adds or removes sniffs is reflected the
 * next time the scan runs, with nothing here to keep in step.
 */
export function parseExplainOutput(text) {
	const sniffs = [];
	for (const line of String(text).split('\n')) {
		const trimmed = line.trim();
		// Sniff lines look like `WordPress.Security.EscapeOutput`; the surrounding
		// output is a title, a rule count and a blank line.
		if (!/^[A-Z][A-Za-z0-9]*\.[A-Za-z0-9]+\.[A-Za-z0-9]+$/.test(trimmed)) continue;
		sniffs.push(trimmed);
	}
	return sniffs.sort();
}
