import fs from 'fs';
import path from 'path';

import { minify } from 'terser';

import { nth_identifier } from './identifier.js';

const define = {
    'process.env.RUNEJS_SERVER_PROT': JSON.stringify(process.env.RUNEJS_SERVER_PROT ?? 'true'),
    'process.env.RUNEJS_CUSTOM_COL': JSON.stringify(process.env.RUNEJS_CUSTOM_COL ?? 'true'),
    'process.env.LOGIN_RSAE': JSON.stringify(process.env.LOGIN_RSAE ?? '65537'),
    'process.env.LOGIN_RSAN': JSON.stringify(process.env.LOGIN_RSAN ?? '119568088839203297999728368933573315070738693395974011872885408638642676871679245723887367232256427712869170521351089799352546294030059890127723509653145359924771433131004387212857375068629466435244653901851504845054452735390701003613803443469723435116497545687393297329052988014281948392136928774011011998343'),
    'process.env.BUILD_TIME': JSON.stringify(new Date().toISOString())
};

// ----

type BunOutput = {
    source: string;
    sourcemap: string;
}

async function bunBuild(entry: string, external: string[] = [], minify = true, drop: string[] = []): Promise<BunOutput> {
    const build = await Bun.build({
        entrypoints: [entry],
        sourcemap: 'external',
        define,
        external,
        minify,
        drop,
    });

    if (!build.success) {
        build.logs.forEach((x: any) => console.log(x));
        process.exit(1);
    }

    return {
        source: await build.outputs[0].text(),
        sourcemap: build.outputs[0].sourcemap ? await build.outputs[0].sourcemap.text() : ''
    };
}

async function applyTerser(script: BunOutput): Promise<boolean> {
    const mini = await minify(script.source, {
        sourceMap: {
            content: script.sourcemap
        },
        toplevel: true,
        // format: {
        //     beautify: true
        // },
        compress: {
            ecma: 2020
        },
        mangle: {
            nth_identifier: nth_identifier,
            properties: {
                reserved: [
                    // stdlib
                    'willReadFrequently',
                    'usedJSHeapSize',

                    // wasm
                    // must be callable:
                    '_abort_js',
                    'emscripten_resize_heap',
                    'fd_close',
                    'fd_seek',
                    'fd_write',
                    // must be an object:
                    'env',
                    'wasi_snapshot_preview1',
                    // is not an object:
                    'instance',
                    // is not a function:
                    'emscripten_stack_init',
                    'emscripten_stack_get_end',
                    '__wasm_call_ctors',
                    // imports:
                    'HEAPU8',
                    // exports:
                    '_emscripten_stack_restore',
                    '_emscripten_stack_alloc',
                    'emscripten_stack_get_current',
                    'memory',
                    '_malloc',
                    'malloc',
                    '_free',
                    'free',
                    '_realloc',
                    'realloc',
                    '__indirect_function_table',
                    '_tsf_load_memory',
                    'tsf_load_memory',
                    '_tsf_close',
                    'tsf_close',
                    '_tsf_reset',
                    'tsf_reset',
                    '_tsf_set_output',
                    'tsf_set_output',
                    '_tsf_channel_set_bank_preset',
                    'tsf_channel_set_bank_preset',
                    '_tml_load_memory',
                    'tml_load_memory',
                    '_midi_render',
                    'midi_render',
                    'setValue',
                    'getValue',
                    'calledRun',

                    // dns-json response fields
                    'Status',
                    'Answer',

                    // main thread <-> js5 protocol/debug payloads
                    'type',
                    'versions',
                    'crcs',
                    'host',
                    'secured',
                    'ingame',
                    'dbEnabled',
                    'archive',
                    'file',
                    'priority',
                    'urgent',
                    'data',
                    'message',
                    'failCount',
                    'error',
                    'id'
                ]
            }
        }
    });

    script.source = mini.code ?? '';
    script.sourcemap = mini.map?.toString() ?? '';
    return true;
}

// ----

if (!fs.existsSync('out')) {
    fs.mkdirSync('out');
}

fs.copyFileSync('src/3rdparty/tinymidipcm/tinymidipcm.wasm', 'out/tinymidipcm.wasm');

const args = process.argv.slice(2);
const prod = args[0] !== 'dev';

const entrypoints = [
    'src/client/Client.ts'
];

for (const file of entrypoints) {
    const output = path.basename(file).replace('.ts', '.js').toLowerCase();

    const script = await bunBuild(file, [], prod, prod ? ['console'] : []);
    if (script) {
        if (prod) {
            await applyTerser(script);
        }

        fs.writeFileSync(`out/${output}`, script.source);
        fs.writeFileSync(`out/${output}.map`, script.sourcemap);
    }
}
