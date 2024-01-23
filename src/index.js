const { badgen } = require('badgen');
const fs = require('fs').promises;
const path = require('path');
const util = require('util');
const core = require('@actions/core');
const { glob } = require('glob-gitignore');
const execPromise = util.promisify(require('child_process').exec);
const tagPrefix = `${process.env.INPUT_VERSION_PREFIX || ''}*`;

var tagvers = process.env.INPUT_VERSION_FALLBACK || '';
var updvers = Math.floor(new Date().getTime() / 1000);

async function executeCommand(command) {
	try {
		const { stdout, stderr } = await execPromise(command);
		return stdout;
	} catch (error) {
		console.error('\x1b[31m%s\x1b[0m', error.stderr);
		throw error;
	}
}

(async () => {
	try {
		const tagResult = await executeCommand(`git for-each-ref --sort=-creatordate --count 1 --format="%(refname:short)" "refs/tags/${tagPrefix}"`);
		const tag = tagResult.trim();
		const timestampResult = await executeCommand(`git log -1 --format=%at ${tag}`);
		const timestamp = timestampResult.trim();

		tagvers = tag;
		updvers = timestamp;

		console.log('\x1b[32m%s\x1b[0m', `Found tag: ${tag}`);
		console.log('\x1b[32m%s\x1b[0m', `Found timestamp: ${timestamp}`);
	} catch (error) {
		console.log('\x1b[33m%s\x1b[0m', 'Error:', error.message);
	}
})();

const st = Date.now();
const dir = core.getInput('directory') || './';
const debug = core.getInput('debug') === 'true';
const version_badge = core.getInput('version_badge') || './output/version.svg';
const updated_badge = core.getInput('updated_badge') || './output/updated.svg';
const files_badge = core.getInput('files_badge') || './output/files.svg';
const lines_badge = core.getInput('lines_badge') || './output/lines.svg';
const patterns = (core.getInput('patterns') || '').split('|').map(s => s.trim()).filter(s => s);
const ignore = (core.getInput('ignore') || '').split('|').map(s => s.trim()).filter(s => s);

if (debug) core.info('Debugging enabled.');

const versionBadgeOpts = {};
for (const en of Object.keys(process.env)) {
	if (en.startsWith('INPUT_VERSION_BADGE_')) {
		versionBadgeOpts[en.replace('INPUT_VERSION_BADGE_', '').toLowerCase()] = process.env[en]
	}
}

const updatedBadgeOpts = {};
for (const en of Object.keys(process.env)) {
	if (en.startsWith('INPUT_UPDATED_BADGE_')) {
		updatedBadgeOpts[en.replace('INPUT_UPDATED_BADGE_', '').toLowerCase()] = process.env[en]
	}
}

const filesBadgeOpts = {};
for (const en of Object.keys(process.env)) {
	if (en.startsWith('INPUT_FILES_BADGE_')) {
		filesBadgeOpts[en.replace('INPUT_FILES_BADGE_', '').toLowerCase()] = process.env[en]
	}
}

const linesBadgeOpts = {};
for (const en of Object.keys(process.env)) {
	if (en.startsWith('INPUT_LINES_BADGE_')) {
		linesBadgeOpts[en.replace('INPUT_LINES_BADGE_', '').toLowerCase()] = process.env[en]
	}
}

async function countLines(fullPath) {
	return new Promise((res, rej) => {
		let count = 1;
		require('fs').createReadStream(fullPath)
			.on('data', function (chunk) {
				let index = -1;
				while ((index = chunk.indexOf(10, index + 1)) > -1) count++
			})
			.on('end', function () {
				res(count);
			})
			.on('error', function (err) {
				rej(err)
			});
	})
}

const countThrottled = throttle(countLines, 10);
/**
 * Recursively count the lines in all matching files within the given directory.
 * @param dir {string} The path to check.
 * @param patterns {string[]} array of patterns to match against.
 * @param negative {string[]} array of patterns to NOT match against.
 * @return {Promise<{ignored: number, lines: number, counted: number}>} An array of all files located, as absolute paths.
 */
async function getFiles(dir, patterns = [], negative = []) {
	let lines = 0, ignored = 0, counted = 0;

	await glob(patterns, {
		cwd: dir,
		ignore: negative,
		nodir: true
	}).then(files => {
		counted = files.length;
		return Promise.all(files.map(async f => {
			try {
				if (debug) core.info(`Counting: ${f}`);
				return await countThrottled(f);
			} catch (err) {
				core.error(err);
				return 0;
			}
		}))
	}).then(res => res.map(r => lines += r));

	return { lines, ignored, counted };
}

function throttle(callback, limit = 5) {
	let idx = 0;
	const queue = new Array(limit);

	return async (...args) => {
		const offset = idx++ % limit;
		const blocker = queue[offset];
		let cb = null;
		queue[offset] = new Promise((res) => cb = res);  // Next call waits for this call's resolution.

		if (blocker) await blocker;
		try {
			return await callback.apply(this, args);
		} finally {
			cb();
		}
	}
}

function makeVersionBadge(text, config) {
	let { label, color, style, scale, labelcolor } = (config || {});
	label = label || 'Current Version';
	labelcolor = labelcolor || '555';
	color = color || 'green';
	style = style || 'classic';
	scale = scale ? parseInt(scale) : 1;

	// only `status` is required.
	return badgen({
		label: `${label}`,     // <Text>
		labelcolor,            // <Color RGB> or <Color Name> (default: '555')
		color,                 // <Color RGB> or <Color Name> (default: 'blue')
		style,                 // 'flat' or 'classic' (default: 'classic')
		scale,                 // Set badge scale (default: 1)
		status: `${text}`      // <Text>, required
	});
}

function makeUpdatedBadge(text, config) {
	let { label, color, style, scale, labelcolor } = (config || {});
	label = label || 'Last Updated';
	labelcolor = labelcolor || '555';
	color = color || 'blue';
	style = style || 'classic';
	scale = scale ? parseInt(scale) : 1;

	// only `status` is required.
	return badgen({
		label: `${label}`,     // <Text>
		labelcolor,            // <Color RGB> or <Color Name> (default: '555')
		color,                 // <Color RGB> or <Color Name> (default: 'blue')
		style,                 // 'flat' or 'classic' (default: 'classic')
		scale,                 // Set badge scale (default: 1)
		status: `${text}`      // <Text>, required
	});
}

function makeFilesBadge(text, config) {
	let { label, color, style, scale, labelcolor } = (config || {});
	label = label || 'Total of Files';
	labelcolor = labelcolor || '555';
	color = color || 'blue';
	style = style || 'classic';
	scale = scale ? parseInt(scale) : 1;

	// only `status` is required.
	return badgen({
		label: `${label}`,     // <Text>
		labelcolor,            // <Color RGB> or <Color Name> (default: '555')
		color,                 // <Color RGB> or <Color Name> (default: 'blue')
		style,                 // 'flat' or 'classic' (default: 'classic')
		scale,                 // Set badge scale (default: 1)
		status: `${text}`      // <Text>, required
	});
}

function makeLinesBadge(text, config) {
	let { label, color, style, scale, labelcolor } = (config || {});
	label = label || 'Lines of Code';
	labelcolor = labelcolor || '555';
	color = color || 'blue';
	style = style || 'classic';
	scale = scale ? parseInt(scale) : 1;

	// only `status` is required.
	return badgen({
		label: `${label}`,     // <Text>
		labelcolor,            // <Color RGB> or <Color Name> (default: '555')
		color,                 // <Color RGB> or <Color Name> (default: 'green')
		style,                 // 'flat' or 'classic' (default: 'classic')
		scale,                 // Set badge scale (default: 1)
		status: `${text}`      // <Text>, required
	});
}

function numberFormatter(num) {
	if (num >= 1000000000) return (num / 1000000000).toFixed(1).replace(/\.0$/, '') + 'G';
	if (num >= 1000000) return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
	if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
	return num;
}

getFiles(dir, patterns, ignore).then(async ret => {
	core.info(`Counted ${ret.lines} Lines from ${ret.counted} Files, ignoring ${ret.ignored} Files.`)
	core.info(`Took: ${Date.now() - st}`);

	let datetime = new Date(parseInt(updvers) * 1000)
	let day = datetime.getDate();
	let month = datetime.toLocaleString('en', { month: 'short' });
	let year = datetime.getFullYear();
	let fulldate = `${month} ${day} ${year}`;

	await fs.mkdir(path.dirname(version_badge), { recursive: true })
	await fs.writeFile(version_badge, makeFilesBadge(tagvers, versionBadgeOpts));

	await fs.mkdir(path.dirname(updated_badge), { recursive: true })
	await fs.writeFile(updated_badge, makeFilesBadge(fulldate, updatedBadgeOpts));

	await fs.mkdir(path.dirname(files_badge), { recursive: true })
	await fs.writeFile(files_badge, makeFilesBadge(numberFormatter(ret.counted), filesBadgeOpts));

	await fs.mkdir(path.dirname(lines_badge), { recursive: true })
	await fs.writeFile(lines_badge, makeLinesBadge(numberFormatter(ret.lines), linesBadgeOpts));
})
