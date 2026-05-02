/**
 * Read CSS custom properties from the host page (or supplied element)
 * and apply them as inline CSS variables on the widget root, so the widget
 * inherits the storefront's accent color, border radius, etc.
 *
 * Pure DOM logic — testable with happy-dom.
 */
export interface ThemeVars {
  accentColor?: string | null;
  borderRadius?: string | null;
  fontFamily?: string | null;
}

export function readHostTheme(host: HTMLElement = document.documentElement): ThemeVars {
  const styles = getComputedStyle(host);
  const accentColor =
    styles.getPropertyValue("--aidey-accent")?.trim() ||
    styles.getPropertyValue("--accent")?.trim() ||
    null;
  const borderRadius =
    styles.getPropertyValue("--aidey-radius")?.trim() ||
    styles.getPropertyValue("--radius")?.trim() ||
    null;
  const fontFamily = styles.getPropertyValue("--aidey-font")?.trim() || null;
  return {
    accentColor: accentColor || null,
    borderRadius: borderRadius || null,
    fontFamily: fontFamily || null,
  };
}

export function applyTheme(target: HTMLElement, vars: ThemeVars): void {
  if (vars.accentColor) target.style.setProperty("--aidey-accent", vars.accentColor);
  if (vars.borderRadius) target.style.setProperty("--aidey-radius", vars.borderRadius);
  if (vars.fontFamily) target.style.setProperty("--aidey-font", vars.fontFamily);
}
