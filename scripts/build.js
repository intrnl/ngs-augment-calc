import * as esbuild from 'esbuild';
import processes from 'node:child_process';

import { config } from '../esbuild.config.js';

const COMMIT_HASH = processes.execSync(`git rev-parse HEAD`, { encoding: 'utf-8' });

await esbuild.build({
	minify: true,
	logLevel: 'info',
	...config,
	format: 'esm',
	bundle: true,
	splitting: true,
	define: {
		DEV: false,
	},
	plugins: [...(config.plugins || [])],

	define: {
		DEV: 'false',
		COMMIT_HASH: `"${COMMIT_HASH.slice(0, 6)}"`,
	},
});
