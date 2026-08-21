/*
 * Scorecard.
 *
 * Three views, one dataset, all of it already in the HTML before this file runs.
 * What this adds is the switch between views, the filters, the sort and the
 * findings panel. No data, and nothing that changes what the page says.
 *
 * Two rules kept throughout. Every bit of state is in the URL, so a view narrowed
 * to one team's repositories or opened on one issue is a link you can send them.
 * And rows are never reordered except by an explicit sort, so a view you come
 * back to looks the way you left it.
 *
 * With JavaScript off the views stack rather than switch, every issue is a real
 * <details>, and the page reads top to bottom as one long report. Nothing below
 * is needed to understand it.
 */
(function () {
	'use strict';

	var dash = document.getElementById('dash');
	if (!dash) return;

	var findingsBase = dash.dataset.findingsBase;
	var atlasBase = dash.dataset.atlasBase;

	var views = Array.prototype.slice.call(dash.querySelectorAll('.view'));
	var tabs = Array.prototype.slice.call(dash.querySelectorAll('.switch__opt'));

	dash.classList.add('is-live');

	// ---- views ----------------------------------------------------------------

	function show(name, push) {
		if (!name || !views.some(function (view) { return view.dataset.view === name; })) name = 'overview';

		views.forEach(function (view) { view.classList.toggle('is-on', view.dataset.view === name); });
		tabs.forEach(function (tab) {
			var on = tab.dataset.view === name;
			tab.classList.toggle('is-on', on);
			if (on) tab.setAttribute('aria-current', 'page');
			else tab.removeAttribute('aria-current');
		});

		if (push) writeUrl(name);
		return name;
	}

	var current = 'overview';

	tabs.forEach(function (tab) {
		tab.addEventListener('click', function (event) {
			event.preventDefault();
			current = show(tab.dataset.view, true);
		});
	});

	// ---- repositories ---------------------------------------------------------

	var grid = document.getElementById('grid');
	var gridBody = grid.querySelector('tbody');
	var rows = Array.prototype.slice.call(gridBody.querySelectorAll('.row'));
	var sift = document.getElementById('sift');
	var tally = document.getElementById('tally');
	var gridEmpty = document.getElementById('board-empty');
	var chips = Array.prototype.slice.call(document.querySelectorAll('.chips .chip'));

	var state = { q: '', types: [], privateOnly: false, withFindings: false, sort: 'name', dir: 1 };

	function matches(row) {
		if (state.q && row.dataset.repo.indexOf(state.q) === -1) return false;
		if (state.types.length && state.types.indexOf(row.dataset.type) === -1) return false;
		if (state.privateOnly && row.dataset.private !== 'true') return false;
		if (state.withFindings && Number(row.dataset.findings) === 0) return false;
		return true;
	}

	function applyRepos() {
		var shown = 0;
		rows.forEach(function (row) {
			var hit = matches(row);
			row.hidden = !hit;
			if (hit) shown++;
		});

		tally.textContent = shown === rows.length ? shown + ' shown' : shown + ' of ' + rows.length + ' shown';
		gridEmpty.hidden = shown !== 0;

		chips.forEach(function (chip) {
			var on = chip.dataset.type
				? state.types.indexOf(chip.dataset.type) !== -1
				: chip.dataset.has
					? state.withFindings
					: state.privateOnly;
			chip.setAttribute('aria-pressed', String(on));
		});

		writeUrl(current);
	}

	function sortBy(key) {
		if (state.sort === key) {
			state.dir = -state.dir;
		} else {
			state.sort = key;
			// Name reads best A to Z. The numeric columns get asked about because
			// somebody wants the worst offenders, so they start high.
			state.dir = key === 'name' ? 1 : -1;
		}

		var sorted = rows.slice().sort(function (a, b) {
			if (key === 'name') return a.dataset.repo.localeCompare(b.dataset.repo) * state.dir;
			var left = Number(a.dataset[key]);
			var right = Number(b.dataset[key]);
			// Ties fall back to name so the order is total and a re-sort never
			// shuffles rows that compare equal.
			if (left === right) return a.dataset.repo.localeCompare(b.dataset.repo);
			return (left - right) * state.dir;
		});

		var fragment = document.createDocumentFragment();
		sorted.forEach(function (row) { fragment.appendChild(row); });
		gridBody.appendChild(fragment);
		rows = sorted;

		grid.querySelectorAll('.grid__sort').forEach(function (header) {
			var active = header.dataset.sort === key;
			header.setAttribute('aria-sort', active ? (state.dir === 1 ? 'ascending' : 'descending') : 'none');
		});

		applyRepos();
	}

	grid.querySelectorAll('.grid__sort button').forEach(function (button) {
		button.addEventListener('click', function () { sortBy(button.parentNode.dataset.sort); });
	});

	sift.addEventListener('input', function () {
		state.q = sift.value.trim().toLowerCase();
		applyRepos();
	});
	sift.addEventListener('keydown', function (event) {
		if (event.key === 'Escape') { sift.value = ''; state.q = ''; applyRepos(); }
	});

	chips.forEach(function (chip) {
		chip.addEventListener('click', function () {
			if (chip.dataset.type) {
				var at = state.types.indexOf(chip.dataset.type);
				if (at === -1) state.types.push(chip.dataset.type);
				else state.types.splice(at, 1);
			} else if (chip.dataset.has) {
				state.withFindings = !state.withFindings;
			} else {
				state.privateOnly = !state.privateOnly;
			}
			applyRepos();
		});
	});

	// ---- issues ---------------------------------------------------------------

	var issues = Array.prototype.slice.call(document.querySelectorAll('.issue'));
	var siftIssue = document.getElementById('sift-issue');
	var tallyIssue = document.getElementById('tally-issue');
	var issuesEmpty = document.getElementById('issues-empty');
	var onlyCited = document.getElementById('only-cited');

	var issueState = { q: '', cited: false };

	function applyIssues() {
		var shown = 0;
		issues.forEach(function (issue) {
			var hit =
				(!issueState.q || issue.dataset.sniff.indexOf(issueState.q) !== -1) &&
				(!issueState.cited || issue.dataset.cited === '1');
			issue.hidden = !hit;
			if (hit) shown++;
		});

		tallyIssue.textContent = shown === issues.length ? shown + ' shown' : shown + ' of ' + issues.length + ' shown';
		issuesEmpty.hidden = shown !== 0;
		onlyCited.setAttribute('aria-pressed', String(issueState.cited));
		writeUrl(current);
	}

	siftIssue.addEventListener('input', function () {
		issueState.q = siftIssue.value.trim().toLowerCase();
		applyIssues();
	});
	siftIssue.addEventListener('keydown', function (event) {
		if (event.key === 'Escape') { siftIssue.value = ''; issueState.q = ''; applyIssues(); }
	});
	onlyCited.addEventListener('click', function () {
		issueState.cited = !issueState.cited;
		applyIssues();
	});

	// Jumping from the overview into a view, landing on the thing that was clicked
	// rather than at the top of a list of a hundred and twenty.
	dash.addEventListener('click', function (event) {
		var toIssue = event.target.closest('[data-goto-issue]');
		if (toIssue) {
			event.preventDefault();
			current = show('issues', true);
			var target = document.getElementById('issue-' + toIssue.dataset.gotoIssue);
			if (target) {
				var open = target.querySelector('details');
				if (open) open.open = true;
				target.scrollIntoView({ block: 'center', behavior: 'smooth' });
				target.classList.add('is-lit');
				window.setTimeout(function () { target.classList.remove('is-lit'); }, 1600);
			}
			return;
		}

		var toRepo = event.target.closest('[data-goto-repo]');
		if (toRepo) {
			event.preventDefault();
			current = show('repositories', true);
			openDetail(toRepo.dataset.gotoRepo);
		}
	});

	// ---- findings panel -------------------------------------------------------

	var detail = document.getElementById('detail');
	var detailBody = document.getElementById('detail-body');
	var detailClose = document.getElementById('detail-close');
	var cache = {};

	function escapeHtml(value) {
		return String(value == null ? '' : value).replace(/[&<>"']/g, function (character) {
			return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character];
		});
	}

	function renderFindings(repo, payload) {
		var findings = (payload && payload.findings) || [];

		// Grouped by sniff, because the fix is per sniff and not per line: whoever
		// opens this is deciding what to go and change. Cited sniffs sort first,
		// since those have a documented reason behind them rather than an inherited
		// default.
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

		// A path on its own is something to copy and go hunting for. Linked to the
		// commit that was scanned it is the line itself, and it keeps pointing at
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

		var cited = findings.filter(function (f) { return f.rule; }).length;
		var shownOf =
			payload && payload.total && payload.total > findings.length
				? findings.length + ' of ' + payload.total + ' shown'
				: findings.length + ' finding' + (findings.length === 1 ? '' : 's');

		var html = '<h2>' + escapeHtml(repo) + '</h2>';
		html += '<p class="detail__meta">' + shownOf + ', ' + cited + ' citing a standard';
		if (payload && payload.source) html += '<span class="detail__source">' + escapeHtml(payload.source) + '</span>';
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
				// Said plainly rather than left blank. The gap between what is found
				// and what can be cited is the rules backlog, and empty space would
				// read as something missing from the finding instead.
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
			if (group.list.length > 25) html += '<li class="detail__more">and ' + (group.list.length - 25) + ' more</li>';
			html += '</ul></section>';
		});

		return html;
	}

	function openDetail(repo) {
		detail.hidden = false;
		dash.classList.add('has-detail');

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
				// The detail file is written by the same sweep as the row, but a board
				// can be served from a cache a sweep behind. Say so rather than showing
				// an empty panel, which reads as "nothing wrong here".
				detailBody.innerHTML =
					'<h2>' + escapeHtml(repo) + '</h2>' +
					'<p class="detail__meta">No findings file for this repository. ' +
					'It may have been swept since this page was cached.</p>';
			});
	}

	function closeDetail() {
		detail.hidden = true;
		dash.classList.remove('has-detail');
	}

	gridBody.addEventListener('click', function (event) {
		var trigger = event.target.closest('[data-open]');
		if (!trigger) return;
		event.preventDefault();
		openDetail(trigger.dataset.open);
	});

	detailClose.addEventListener('click', closeDetail);
	document.addEventListener('keydown', function (event) {
		if (event.key === 'Escape' && !detail.hidden) closeDetail();
	});

	// ---- url ------------------------------------------------------------------

	function writeUrl(view) {
		var params = new URLSearchParams();
		if (view && view !== 'overview') params.set('view', view);
		if (state.q) params.set('q', state.q);
		if (state.types.length) params.set('type', state.types.join(','));
		if (state.privateOnly) params.set('private', '1');
		if (state.withFindings) params.set('found', '1');
		if (issueState.q) params.set('issue', issueState.q);
		if (issueState.cited) params.set('cited', '1');

		var query = params.toString();
		window.history.replaceState(null, '', window.location.pathname + (query ? '?' + query : ''));
	}

	function readUrl() {
		var params = new URLSearchParams(window.location.search);
		state.q = (params.get('q') || '').toLowerCase();
		state.types = params.get('type') ? params.get('type').split(',') : [];
		state.privateOnly = params.get('private') === '1';
		state.withFindings = params.get('found') === '1';
		issueState.q = (params.get('issue') || '').toLowerCase();
		issueState.cited = params.get('cited') === '1';

		if (state.q) sift.value = state.q;
		if (issueState.q) siftIssue.value = issueState.q;

		// The hash is what the no-JavaScript links use, so it is honoured as a view
		// name before falling back to the query parameter.
		var hash = (window.location.hash || '').replace('#', '');
		return params.get('view') || hash || 'overview';
	}

	current = show(readUrl(), false);
	applyRepos();
	applyIssues();
})();
