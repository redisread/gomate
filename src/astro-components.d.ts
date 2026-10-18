// tsc checks the TS barrels; astro check checks concrete Astro component props.
declare module "*.astro" {
  const component: import("astro/runtime/server/index.js").AstroComponentFactory;
  export default component;
}
