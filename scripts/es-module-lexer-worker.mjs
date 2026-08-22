// Astro's server runtime imports es-module-lexer even when the project has no
// Astro Actions. Cloudflare Workers forbid runtime WebAssembly.compile(), so
// use the package's pure-JavaScript lexer entry and keep the init contract.
export { parse } from "es-module-lexer/js";

export const init = Promise.resolve();
export const initSync = () => undefined;
