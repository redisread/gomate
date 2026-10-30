import { useSyncExternalStore, type ReactNode } from "react";

const subscribe = () => () => {};
const clientReady = () => true;
const serverReady = () => false;

/** Native links work in SSR; stateful controls wait until their handlers exist. */
export function HydratedControls({ children }: { children: ReactNode }) {
  const ready = useSyncExternalStore(subscribe, clientReady, serverReady);
  return <fieldset disabled={!ready} className="contents">{children}</fieldset>;
}
