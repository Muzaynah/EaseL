/**
 * Walks up from elementFromPoint to find a reasonable click target for
 * head-pointer / dwell activation (buttons, links, inputs, labelled controls).
 */
export function resolvePointerTarget(rawEl) {
  if (!rawEl || rawEl.nodeType !== 1) return null;

  let node = rawEl;
  for (let depth = 0; node && depth < 28; depth++) {
    if (node.nodeType !== 1) break;
    if (node === document.documentElement || node === document.body) break;

    const disabled =
      node.disabled === true ||
      (typeof node.disabled === "boolean" && node.disabled) ||
      node.getAttribute?.("disabled") !== null ||
      node.getAttribute?.("aria-disabled") === "true";
    if (disabled) break;

    const tag = (node.tagName || "").toUpperCase();
    const role = node.getAttribute?.("role");

    if (tag === "BUTTON" || tag === "SUMMARY") return node;

    if (tag === "A") {
      const href = node.getAttribute("href");
      if (
        role === "button" ||
        node.onclick ||
        (href != null && href !== "")
      ) {
        return node;
      }
    }

    if (tag === "INPUT") {
      const type = (node.type || "text").toLowerCase();
      if (type !== "hidden") return node;
    }

    if (tag === "TEXTAREA" || tag === "SELECT") return node;
    if (tag === "LABEL") return node;

    if (
      role === "button" ||
      role === "tab" ||
      role === "menuitem" ||
      role === "link" ||
      role === "option"
    ) {
      return node;
    }

    const ti = node.getAttribute?.("tabindex");
    if (ti != null && ti !== "-1" && !Number.isNaN(Number(ti))) {
      const n = Number(ti);
      if (n >= 0) return node;
    }

    node = node.parentElement;
  }

  return null;
}
