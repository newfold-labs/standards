/*
 * Reading one JSON file out of an Actions artifact.
 *
 * `upload-artifact` always hands back a zip, and Node ships no zip reader. The
 * format's two compression methods in practice are store and deflate, and
 * `zlib` already does deflate, so the only work left is walking the central
 * directory. That is about seventy lines and no new dependency, which is the
 * better trade for a repository whose entire toolchain is ajv and gray-matter.
 *
 * Deliberately not a general zip library: no encryption, no zip64, no
 * directories. An artifact this cannot read is reported as unreadable, and the
 * repository shows as not reporting rather than failing.
 */
import { inflateRawSync } from 'node:zlib';

const END_OF_CENTRAL_DIRECTORY = 0x06054b50;
const CENTRAL_FILE_HEADER = 0x02014b50;

/** Walk back from the end for the end-of-central-directory record. */
function findEndRecord(buffer) {
	// The record is 22 bytes plus a comment of up to 64K.
	const earliest = Math.max(0, buffer.length - 22 - 0xffff);
	for (let at = buffer.length - 22; at >= earliest; at--) {
		if (buffer.readUInt32LE(at) === END_OF_CENTRAL_DIRECTORY) return at;
	}
	return -1;
}

/**
 * Every file in the archive as { name, data }.
 *
 * Entries are read from the central directory rather than by scanning for local
 * headers, because a local header may declare sizes of zero and defer them to a
 * trailing data descriptor. The central directory always carries the real ones.
 */
export function readZipEntries(buffer) {
	const end = findEndRecord(buffer);
	if (end < 0) throw new Error('not a zip archive: no end-of-central-directory record');

	const count = buffer.readUInt16LE(end + 10);
	let at = buffer.readUInt32LE(end + 16);

	const entries = [];
	for (let index = 0; index < count; index++) {
		if (at + 46 > buffer.length || buffer.readUInt32LE(at) !== CENTRAL_FILE_HEADER) {
			throw new Error(`corrupt central directory at entry ${index}`);
		}

		const method = buffer.readUInt16LE(at + 10);
		const compressedSize = buffer.readUInt32LE(at + 20);
		const nameLength = buffer.readUInt16LE(at + 28);
		const extraLength = buffer.readUInt16LE(at + 30);
		const commentLength = buffer.readUInt16LE(at + 32);
		const localHeaderOffset = buffer.readUInt32LE(at + 42);
		const name = buffer.toString('utf8', at + 46, at + 46 + nameLength);

		at += 46 + nameLength + extraLength + commentLength;

		// Directory entries carry no payload.
		if (name.endsWith('/')) continue;

		// The local header repeats the name and extra fields, and its extra
		// length can differ from the central one, so it has to be read rather
		// than assumed.
		const localNameLength = buffer.readUInt16LE(localHeaderOffset + 26);
		const localExtraLength = buffer.readUInt16LE(localHeaderOffset + 28);
		const dataAt = localHeaderOffset + 30 + localNameLength + localExtraLength;
		const raw = buffer.subarray(dataAt, dataAt + compressedSize);

		if (method === 0) {
			entries.push({ name, data: raw });
		} else if (method === 8) {
			entries.push({ name, data: inflateRawSync(raw) });
		} else {
			throw new Error(`unsupported compression method ${method} for ${name}`);
		}
	}

	return entries;
}

/**
 * Parse the first entry whose name matches, as JSON.
 *
 * Returns null when the archive holds no such entry, which is the normal
 * outcome for a repository running an older version of the check.
 */
export function readJsonFromZip(buffer, matches) {
	for (const entry of readZipEntries(buffer)) {
		if (!matches(entry.name)) continue;
		return JSON.parse(entry.data.toString('utf8'));
	}
	return null;
}
