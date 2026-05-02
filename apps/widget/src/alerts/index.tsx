import { render } from "preact";
import { AlertsBanner } from "./alerts-banner.tsx";

const MOUNT_ID = "aidey-alerts";

function mount() {
  const target = document.getElementById(MOUNT_ID);
  if (!target) {
    // Auto-create if the host page didn't include a mount point
    const el = document.createElement("div");
    el.id = MOUNT_ID;
    document.body.appendChild(el);
    render(<AlertsBanner />, el);
    return;
  }
  render(<AlertsBanner />, target);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", mount);
} else {
  mount();
}
