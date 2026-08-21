/*
 * Scorecard.
 *
 * The table is already complete and already correct when this file runs: every
 * row, every verdict and every total is server-rendered from the sweep. What
 * this adds is narrowing a fleet of 125 rows down to the handful you came to
 * look at, and pulling one repository's findings in when you ask for them.
 *
 * Two rules, the same two the atlas keeps. Filter state lives in the URL, so any
 * view of the board can be linked to and sent to the team that owns it. And rows
 * are never reordered by anything but an explicit sort, so a board you come back
 * to looks the way you left it.
 *
 * Findings are fetched per repository rather than shipped with the page. The
 * fleet's findings together are far larger than the board, and almost nobody
 * opens more than one or two.
 */
(function () {
	'use strict';

	var board = document.getElementById('board');
	if (!board) return;

	var grid = document.getElementById('grid');
	var body = grid.querySelector('tbody');
	var rows = Array.prototype.slice.call(body.querySelectorAll('.row'));
	var sift = document.getElementById('sift');
	var tally = document.getElementById('tally');
	var empty = document.getElementById('board-empty');
	var detail = document.getElementById('detail');
	var detailBody = document.getElementById('detail-body');
	var detailClose = document.getElementById('detail-close');
	var findingsBase = board.dataset.findingsBase;
	var atlasBase = board.dataset.atlasBase;

	var levelButtons = Array.prototype.slice.call(document.querySelectorAll('.rung'));
	var chips = Array.prototype.slice.call(document.querySelectorAll('.chip'));

	var state = { q: '', levels: [], types: [], privateOnly: false, sort: 'name', dir: 1 };

	// ---- filtering ------------------------------------------------------------

	function matches(row) {
		if (state.q && row.dataset.repo.indexOf(state.q) === -1) return false;
		if (state.levels.length && state.levels.indexOf(row.dataset.level) === -1) return false;
		if (state.types.length && state.types.indexOf(row.dataset.type) === -1) return false;
		if (state.privateOnly && row.dataset.private !== 'true') return false;
		return true;
	}

	function apply() {
		var shown = 0;
		rows.forEach(function (row) {
			var hit = matches(row);
			row.hidden = !hit;
			if (hit) shown++;
		});

		tally.textContent = shown === rows.length ? shown + ' shown' : shown + ' of ' + rows.length + ' shown';
		empty.hidden = shown !== 0;

		levelButtons.forEach(function (button) {
			button.setAttribute('aria-pressed', String(state.levels.indexOf(button.dataset.level) !== -1));
		});
		chips.forEach(function (chip) {
			var on = chip.dataset.type
				? state.types.indexOf(chip.dataset.type) !== -1
				: state.privateOnly;
			chip.setAttribute('aria-pressed', String(on));
		});

		writeUrl();
	}

	function toggle(list, value) {
		var at = list.indexOf(value);
		if (at === -1) list.push(value);
		else list.splice(at, 1);
		return list;
	}

	// ---- sorting --------------------------------------------------------------

	function sortBy(key) {
		if (state.sort === key) {
			state.dir = -state.dir;
		} else {
			state.sort = key;
			// Name reads best A to Z; the two numeric columns are asked about
			// because somebody wants the worst offenders, so they start high.
			state.dir = key === 'name' ? 1 : -1;
		}

		var sorted = rows.slice().sort(function (a, b) {
			if (key === 'name') return a.dataset.repo.localeCompare(b.dataset.repo) * state.dir;
			var left = Number(a.dataset[key === 'findings' ? 'findings' : 'level']);
			var right = Number(b.dataset[key === 'findings' ? 'findings' : 'level']);
			// Ties fall back to name so the order is total and a re-sort never
			// shuffles rows that compare equal.
			if (left === right) return a.dataset.repo.localeCompare(b.dataset.repo);
			return (left - right) * state.dir;
		});

		var fragment = document.createDocumentFragment();
		sorted.forEach(function (row) { fragment.appendChild(row); });
		body.appendChild(fragment);
		rows = sorted;

		grid.querySelectorAll('.grid__sort').forEach(function (header) {
			var active = header.dataset.sort === key;
			header.setAttribute('aria-sort', active ? (state.dir === 1 ? 'ascending' : 'descending') : 'none');
		});

		apply();
	}

	grid.querySelectorAll('.grid__sort button').forEach(function (button) {
		button.addEventListener('click', function () {
			sortBy(button.parentNode.dataset.sort);
		});
	});

	// ---- detail ---------------------------------------------------------------

	var cache = {};

	function escapeHtml(value) {
		return String(value == null ? '' : value).replace(/[&<>"']/g, function (character) {
			return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character];
		});
	}

	function renderFindings(repo, payload) {
		var findings = (payload && payload.findings) || [];

		// Grouped by sniff, because the fix is per sniff and not per line:
		// somebody reading this is deciding what to go and change. Sniffs that
		// cite a standard come first, since those are the ones with a documented
		// reason behind them rather than an inherited default.
		var groups = {};
		findings.forEach(function (finding) {
			var sniff = String(finding.source || 'unknown').split('.').slice(0, 3).join('.');
			if (!groups[sniff]) groups[sniff] = { rule: finding.rule || null, list: [] };
			groups[sniff].list.push(finding);
		});

		var order = Object.keys(groups).sort(function (a, b) {
			var ruleA = groups[a].rule ? 0 : 1;
			var ruleB = groups[b].rule ? 0 : 1;
			if (ruleA !== ruleB) return ruleA - ruleB;
			if (groups[b].list.length !== groups[a].list.length) return groups[b].list.length - groups[a].list.length;
			return a.localeCompare(b);
		});

		var cited = findings.filter(function (f) { return f.rule; }).length;

		// A path on its own is something to copy and go hunting for. Linked to the
		// commit that was scanned, it is the line itself, and it still points at
		// the right line after the file moves on.
		function locate(finding) {
			var path = escapeHtml(finding.file || '');
			var at = finding.line != null ? ':' + escapeHtml(finding.line) : '';
			if (!payload.url || !payload.commit || !finding.file) return '<code>' + path + at + '</code>';
			var href =
				payload.url + '/blob/' + encodeURIComponent(payload.commit) + '/' +
				finding.file.split('/').map(encodeURIComponent).join('/') +
				(finding.line != null ? '#L' + encodeURIComponent(finding.line) : '');
			return '<a class="detail__where" href="' + escapeHtml(href) + '"><code>' + path + at + '</code></a>';
		}

		var html = '<h2>' + escapeHtml(repo) + '</h2>';
		html += '<p class="detail__meta">' + findings.length + ' finding' + (findings.length === 1 ? '' : 's');
		html += ', ' + cited + ' citing a standard';
		if (payload && payload.source) {
			html += '<span class="detail__source">' + escapeHtml(payload.source) + '</span>';
		}
		html += '</p>';

		order.forEach(function (sniff) {
			var group = groups[sniff];
			var errors = group.list.filter(function (f) { return f.severity === 'error'; }).length;

			html += '<section class="detail__rule">';
			html += '<h3><code>' + escapeHtml(sniff) + '</code><span class="detail__n">' + group.list.length + '</span></h3>';
			html += '<p class="detail__cite">';
			if (group.rule) {
				html += '<a href="' + escapeHtml(atlasBase) + '#' + escapeHtml(group.rule) + '">' + escapeHtml(group.rule) + '</a>';
			} else {
				// Said plainly rather than left blank. The gap between what is
				// found and what can be cited is the rules backlog, and an empty
				// space would read as an oversight in the finding instead.
				html += '<span class="detail__uncited">no rule cites this yet</span>';
			}
			html += '</p>';
			if (errors) html += '<p class="detail__errors">' + errors + ' at error severity</p>';

			html += '<ul class="detail__list">';
			group.list.slice(0, 25).forEach(function (finding) {
				html += '<li class="detail__hit detail__hit--' + escapeHtml(finding.severity) + '">';
				html += locate(finding);
				if (finding.message) html += '<span>' + escapeHtml(finding.message) + '</span>';
				html += '</li>';
			});
			if (group.list.length > 25) {
				html += '<li class="detail__more">and ' + (group.list.length - 25) + ' more</li>';
			}
			html += '</ul></section>';
		});

		return html;
	}

	function open(repo) {
		detail.hidden = false;
		board.classList.add('has-detail');

		if (cache[repo]) {
			detailBody.innerHTML = renderFindings(repo, cache[repo]);
			return;
		}

		detailBody.innerHTML = '<h2>' + escapeHtml(repo) + '</h2><p class="detail__meta">Loading findings&hellip;</p>';

		fetch(findingsBase + encodeURIComponent(repo) + '.json')
			.then(function (response) {
				if (!response.ok) throw new Error(String(response.status));
				return response.json();
			})
			.then(function (payload) {
				cache[repo] = payload;
				detailBody.innerHTML = renderFindings(repo, payload);
			})
			.catch(function () {
				// The detail file is written by the same sweep as the row, but a
				// board can be served from a cache that is a sweep behind. Say so
				// rather than showing an empty panel that reads as "no findings".
				detailBody.innerHTML =
					'<h2>' + escapeHtml(repo) + '</h2>' +
					'<p class="detail__meta">No findings file for this repository. ' +
					'It may have been swept since this page was cached.</p>';
			});
	}

	function close() {
		detail.hidden = true;
		board.classList.remove('has-detail');
	}

	body.addEventListener('click', function (event) {
		var trigger = event.target.closest('[data-open]');
		if (!trigger) return;
		event.preventDefault();
		open(trigger.dataset.open);
	});

	detailClose.addEventListener('click', close);

	document.addEventListener('keydown', function (event) {
		if (event.key === 'Escape' && !detail.hidden) close();
	});

	// ---- url ------------------------------------------------------------------

	function writeUrl() {
		var params = new URLSearchParams();
		if (state.q) params.set('q', state.q);
		if (state.levels.length) params.set('level', state.levels.join(','));
		if (state.types.length) params.set('type', state.types.join(','));
		if (state.privateOnly) params.set('private', '1');

		var query = params.toString();
		var url = window.location.pathname + (query ? '?' + query : '');
		window.history.replaceState(null, '', url);
	}

	function readUrl() {
		var params = new URLSearchParams(window.location.search);
		state.q = (params.get('q') || '').toLowerCase();
		state.levels = params.get('level') ? params.get('level').split(',') : [];
		state.types = params.get('type') ? params.get('type').split(',') : [];
		state.privateOnly = params.get('private') === '1';
		if (state.q) sift.value = state.q;
	}

	// ---- wiring ---------------------------------------------------------------

	sift.addEventListener('input', function () {
		state.q = sift.value.trim().toLowerCase();
		apply();
	});

	sift.addEventListener('keydown', function (event) {
		if (event.key === 'Escape') {
			sift.value = '';
			state.q = '';
			apply();
		}
	});

	levelButtons.forEach(function (button) {
		button.addEventListener('click', function () {
			toggle(state.levels, button.dataset.level);
			apply();
		});
	});

	chips.forEach(function (chip) {
		chip.addEventListener('click', function () {
			if (chip.dataset.type) toggle(state.types, chip.dataset.type);
			else state.privateOnly = !state.privateOnly;
			apply();
		});
	});

	readUrl();
	apply();
})();
