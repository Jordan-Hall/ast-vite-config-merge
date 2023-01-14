const isProd = process.env.NODE_ENV === "production";
export default defineConfig(({ command, mode }) => ({
    css: {
        postcss: {
            plugins: [
                combineMediaQueries(),
                combineSelectors({ removeDuplicatedValues: true }),
                autoprefixer(),
            ],
        },
    },
    build: { minify: mode === "development" ? false : "terser", brotliSize: false, manifest: false, outDir: "dist", sourcemap: command === "serve" ? "inline" : false, rollupOptions: {
            output: {
                assetFileNames: "clientlib-site/resources/[ext]/[name][extname]",
                chunkFileNames: "clientlib-site/resources/chunks/[name].[hash].js",
                entryFileNames: "clientlib-site/resources/js/[name].js",
            },
        } },
    plugins: [imageMin({
            svgo: {
                plugins: [
                    { name: "RemoveTitle", active: false },
                    { name: "RemoveDescription", active: false },
                    { name: "RemoveViewBox", active: false },
                    { name: "removeDimensions", active: true },
                    { name: "removeScriptElement", active: true },
                    { name: "removeStyleElement", active: true },
                ],
            },
        }), compress({
            algorithm: "brotliCompress",
        }), tsconfigPaths()],
    base: command === "build" ? "/etc.clientlibs/<project>/clientlibs/" : "/",
    publicDir: command === "build" ? false : "src/assets",
    server: {
        origin: "http://localhost:3000",
    }
}));
