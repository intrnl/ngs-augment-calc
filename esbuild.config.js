import * as esbuild from 'esbuild';

/** @type {esbuild.BuildOptions} */
export let config = {
	entryPoints: ['src/app.js'],
	entryNames: 'app',
	chunkNames: '[name]',
	outdir: 'dist/_assets',

	sourcemap: true,
};
