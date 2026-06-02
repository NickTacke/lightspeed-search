import { render } from "preact";
import { SearchDropdown } from "./search-dropdown.tsx";

const MOUNT_ID = "aidey-search";

/**
 * Common storefront search-input selectors. We try to replace the existing
 * search form so the merchant doesn't have to add markup. Order matters —
 * the most specific match wins.
 */
const SEARCH_INPUT_SELECTORS = [
  'input[type="search"]',
  'input[name="q"]',
  'input[name="query"]',
  'input[name="search"]',
  '[role="search"] input',
].join(",");

function findExistingSearchSlot(): Element | null {
  const input = document.querySelector(SEARCH_INPUT_SELECTORS);
  if (!input) return null;
  // Replace the enclosing form when present so we swap the storefront's
  // search submit too. If the input is standalone, swap just the input.
  return input.closest("form") ?? input;
}

function autoMountPoint(): HTMLElement {
  const el = document.createElement("div");
  el.id = MOUNT_ID;
  const existing = findExistingSearchSlot();
  if (existing?.parentElement) {
    existing.parentElement.insertBefore(el, existing);
    existing.remove();
  } else {
    document.body.appendChild(el);
  }
  return el;
}

function mount() {
  const target = document.getElementById(MOUNT_ID) ?? autoMountPoint();
  render(<SearchDropdown />, target);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", mount);
} else {
  mount();
}
