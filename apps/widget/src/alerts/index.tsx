import { render } from "preact";
import { AlertsBanner } from "./alerts-banner.tsx";

const MOUNT_ID = "aidey-alerts";

/**
 * Where to drop the alerts banner when the storefront theme doesn't provide
 * a `<div id="aidey-alerts">` placeholder. Tries to land just below the
 * site header so it reads as part of the page chrome; falls back to the top
 * of body if no header element exists.
 */
function autoMountPoint(): HTMLElement {
  const el = document.createElement("div");
  el.id = MOUNT_ID;
  const header = document.querySelector("header");
  if (header?.parentElement) {
    header.parentElement.insertBefore(el, header.nextSibling);
  } else {
    document.body.insertBefore(el, document.body.firstChild);
  }
  return el;
}

function mount() {
  const target = document.getElementById(MOUNT_ID) ?? autoMountPoint();
  render(<AlertsBanner />, target);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", mount);
} else {
  mount();
}
