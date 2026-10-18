import "@testing-library/jest-dom/vitest";

// jsdom has no layout engine; browser tests cover actual rendered visibility.
if (!Element.prototype.checkVisibility) {
  Element.prototype.checkVisibility = function () {
    return (
      !this.closest("[hidden], [inert]") &&
      window.getComputedStyle(this).visibility !== "hidden" &&
      window.getComputedStyle(this).display !== "none"
    );
  };
}

// jsdom 不提供 matchMedia，提供一个最小 mock
if (!window.matchMedia) {
  window.matchMedia = (query: string): MediaQueryList =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList;
}
