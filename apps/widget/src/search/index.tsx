import { render } from "preact";
import { SearchDropdown } from "./search-dropdown.tsx";

const MOUNT_ID = "aidey-search";

function mount() {
  const target = document.getElementById(MOUNT_ID);
  if (!target) {
    const el = document.createElement("div");
    el.id = MOUNT_ID;
    document.body.appendChild(el);
    render(<SearchDropdown />, el);
    return;
  }
  render(<SearchDropdown />, target);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", mount);
} else {
  mount();
}
