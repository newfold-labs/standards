/*
 * The GitHub reads the sweep needs, and nothing else.
 *
 * The shape here is dictated by cost. Asking REST for one repository's metadata
 * and then one request per file it might carry is about five calls a repository,
 * so a 125-repository fleet is 600 round trips and several minutes. One GraphQL
 * query can carry both the metadata and the file contents for a batch of
 * repositories at once, which turns the same sweep into a handful of calls and
 * about ten seconds. Blobs are requested by path against HEAD, so nothing is
 * cloned and a large repository costs the same as a small one.
 *
 * Only artifacts still need REST: the Actions API has no GraphQL surface.
 */

const API = 'https://api.github.com';
const GRAPHQL = `${API}/graphql`;

/** Files read from every repository. Adding one here costs nothing per repository. */
export const BLOB_PATHS = {
	composer: 'composer.json',
	packageJson: 'package.json',
	codeowners: '.github/CODEOWNERS',
	codeownersRoot: 'CODEOWNERS',
	agents: 'AGENTS.md',
	claude: 'CLAUDE.md',
};

function must(token) {
	if (!token) {
		throw new Error(
			'No GitHub token. The sweep reads private repositories across the org, ' +
				'which a repository-scoped GITHUB_TOKEN cannot do: pass an org-installed ' +
				'GitHub App token as GITHUB_TOKEN or SCORECARD_TOKEN.'
		);
	}
	return token;
}

export function createClient({ token = process.env.SCORECARD_TOKEN || process.env.GITHUB_TOKEN, org }) {
	const auth = must(token);
	const headers = {
		authorization: `Bearer ${auth}`,
		accept: 'application/vnd.github+json',
		'user-agent': 'newfold-labs-standards-sweep',
	};

	let calls = 0;

	/**
	 * One HTTP attempt with retries. Secondary rate limits and 5xx are transient
	 * and worth waiting out; anything else is a real answer and returned as is.
	 */
	async function send(url, init, attempt = 0) {
		calls++;
		const response = await fetch(url, { ...init, headers: { ...headers, ...(init?.headers ?? {}) } });

		if (response.status === 403 || response.status === 429 || response.status >= 500) {
			if (attempt >= 4) return response;
			const retryAfter = Number(response.headers.get('retry-after'));
			const resetAt = Number(response.headers.get('x-ratelimit-reset'));
			let waitMs = 2 ** attempt * 1000;
			if (Number.isFinite(retryAfter) && retryAfter > 0) waitMs = retryAfter * 1000;
			else if (Number.isFinite(resetAt) && resetAt > 0) waitMs = Math.max(0, resetAt * 1000 - Date.now()) + 1000;
			// A reset can be an hour out. Waiting that long inside a nightly job
			// would hold a runner hostage, so cap it and let the caller see the 403.
			if (waitMs > 120_000) return response;
			await new Promise((resolve) => setTimeout(resolve, waitMs));
			return send(url, init, attempt + 1);
		}

		return response;
	}

	async function graphql(query, variables = {}) {
		const response = await send(GRAPHQL, {
			method: 'POST',
			body: JSON.stringify({ query, variables }),
		});
		if (!response.ok) {
			throw new Error(`GraphQL ${response.status}: ${(await response.text()).slice(0, 400)}`);
		}
		const body = await response.json();
		// A GraphQL response can be 200 and still be partly an error: one missing
		// repository nulls its own alias and reports here. Those are expected
		// (a repository can vanish mid-sweep), so only a wholly empty data block
		// is fatal.
		if (!body.data) {
			throw new Error(`GraphQL returned no data: ${JSON.stringify(body.errors ?? {}).slice(0, 400)}`);
		}
		return body;
	}

	async function rest(path) {
		const response = await send(`${API}${path}`, { method: 'GET' });
		if (response.status === 404) return null;
		if (!response.ok) {
			throw new Error(`REST ${response.status} on ${path}: ${(await response.text()).slice(0, 200)}`);
		}
		return response.json();
	}

	/** Every non-archived repository in the org, with the fields the sweep filters on. */
	async function listRepos() {
		const query = `
			query($org: String!, $cursor: String) {
				organization(login: $org) {
					repositories(first: 100, after: $cursor, isArchived: false, orderBy: { field: NAME, direction: ASC }) {
						pageInfo { hasNextPage endCursor }
						nodes { name url isPrivate isArchived pushedAt primaryLanguage { name } }
					}
				}
			}`;

		const found = [];
		let cursor = null;
		for (;;) {
			const body = await graphql(query, { org, cursor });
			const page = body.data.organization.repositories;
			found.push(...page.nodes);
			if (!page.pageInfo.hasNextPage) break;
			cursor = page.pageInfo.endCursor;
		}
		return found;
	}

	/**
	 * Metadata plus the contents of every path in BLOB_PATHS, for a batch of
	 * repositories in one request.
	 *
	 * Batches stay modest because GraphQL scores a query by how much it could
	 * return, and one oversized query is rejected outright rather than trimmed.
	 */
	async function readRepos(names, batchSize = 25) {
		const results = new Map();

		for (let start = 0; start < names.length; start += batchSize) {
			const batch = names.slice(start, start + batchSize);
			const fields = Object.entries(BLOB_PATHS)
				.map(([alias, path]) => `${alias}: object(expression: "HEAD:${path}") { ... on Blob { text isTruncated } }`)
				.join('\n\t\t\t\t\t');

			const query = `
				query($org: String!) {
					${batch
						.map(
							(name, index) => `
					r${index}: repository(owner: $org, name: ${JSON.stringify(name)}) {
						name url isPrivate isArchived pushedAt
						primaryLanguage { name }
						defaultBranchRef { name }
						${fields}
					}`
						)
						.join('')}
				}`;

			const body = await graphql(query, { org });
			for (let index = 0; index < batch.length; index++) {
				const node = body.data[`r${index}`];
				// Null means the repository went away or the token lost sight of it
				// between listing and reading. Recorded as absent, not as a failure.
				if (node) results.set(node.name, node);
			}
		}

		return results;
	}

	/**
	 * The most recent standards-compliance artifact for a repository, parsed.
	 *
	 * Artifacts expire, so absence is normal and means "has not reported
	 * recently" rather than "failed". Returns null in every such case.
	 */
	async function readComplianceArtifact(repo, artifactName) {
		const listing = await rest(
			`/repos/${org}/${repo}/actions/artifacts?name=${encodeURIComponent(artifactName)}&per_page=1`
		);
		const artifact = listing?.artifacts?.[0];
		if (!artifact || artifact.expired) return null;

		const response = await send(
			`${API}/repos/${org}/${repo}/actions/artifacts/${artifact.id}/zip`,
			{ method: 'GET' }
		);
		if (!response.ok) return null;

		return {
			createdAt: artifact.created_at,
			zip: Buffer.from(await response.arrayBuffer()),
		};
	}

	return {
		graphql,
		rest,
		listRepos,
		readRepos,
		readComplianceArtifact,
		get calls() {
			return calls;
		},
	};
}
