 

export type Overrides = Record<
	string,
	{
		style?: Record<string, string | number>;
		text?: string;
	}
>;

export const PIXEL_STYLES = new Set([
	"fontSize",
	"padding",
	"margin",
	"marginTop",
	"marginBottom",
	"marginLeft",
	"marginRight",
	"width",
	"height",
	"minWidth",
	"minHeight",
	"maxWidth",
	"maxHeight",
]);

export function extractRotationDeg(transform?: string): number {
	if (!transform) return 0;
	const m = transform.match(/rotate\(([-+]?\d+(?:\.\d+)?)deg\)/i);
	if (m) {
		const n = parseFloat(m[1]);
		return Number.isFinite(n) ? Math.round(n) : 0;
	}
	return 0;
}

export function renderOverridesCss(overrides: Overrides): string {
	const rules: string[] = [];
	for (const [selector, data] of Object.entries(overrides)) {
		if (data.style && Object.keys(data.style).length) {
			const decl: string[] = [];
			for (const [k, v] of Object.entries(data.style)) {
				const cssKey = k.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
				const cssVal = typeof v === "number" && PIXEL_STYLES.has(k) ? `${v}px` : String(v);
				decl.push(`${cssKey}: ${cssVal}`);
			}
			rules.push(`${selector} { ${decl.join("; ")} }`);
		}
	}
	return rules.join("\n");
}

export function renderOverridesCssWithScope(overrides: Overrides, scopeSelector: string): string {
	const rules: string[] = [];
	for (const [selector, data] of Object.entries(overrides)) {
		if (data.style && Object.keys(data.style).length) {
			const decl: string[] = [];
			for (const [k, v] of Object.entries(data.style)) {
				const cssKey = k.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
				const cssVal = typeof v === "number" && PIXEL_STYLES.has(k) ? `${v}px` : String(v);
				decl.push(`${cssKey}: ${cssVal} !important`);
			}
			rules.push(`${scopeSelector} ${selector} { ${decl.join("; ")} }`);
		}
	}
	return rules.join("\n");
}

export const OVERRIDES_TAG = "@reframe-overrides";
export const HISTORY_TAG = "@reframe-history";

export function extractOverrides(source: string): Overrides {
	const re = new RegExp(`/\\*\\s*${OVERRIDES_TAG}:(.*?)\\*/`, "s");
	const m = source.match(re);
	if (!m) return {};
	try {
		const json = m[1].trim();
		const obj = JSON.parse(json);
		if (obj && typeof obj === "object") return obj as Overrides;
	} catch { }
	return {};
}

export function injectOverrides(source: string, overrides: Overrides): string {
	const without = source
		.replace(new RegExp(`/\\*\\s*${OVERRIDES_TAG}:(.*?)\\*/`, "s"), "")
		.trimEnd();
	if (!overrides || Object.keys(overrides).length === 0) return without;
	const comment = `\n\n/* ${OVERRIDES_TAG}: ${JSON.stringify(overrides)} */\n`;
	return `${without}${comment}`;
}

export type HistoryPayload = { history: Overrides[]; future: Overrides[] };

export function extractHistory(source: string): HistoryPayload | null {
	const re = new RegExp(`/\\*\\s*${HISTORY_TAG}:(.*?)\\*/`, "s");
	const m = source.match(re);
	if (!m) return null;
	try {
		const json = m[1].trim();
		const obj = JSON.parse(json);
		if (obj && typeof obj === "object") return obj as HistoryPayload;
	} catch { }
	return null;
}

export function injectHistory(source: string, payload: HistoryPayload): string {
	const without = source.replace(new RegExp(`/\\*\\s*${HISTORY_TAG}:(.*?)\\*/`, "s"), "").trimEnd();
	if (!payload) return without;
	const comment = `\n\n/* ${HISTORY_TAG}: ${JSON.stringify(payload)} */\n`;
	return `${without}${comment}`;
}

export function stripReframeMetadata(source: string): string {
	return source
		.replace(new RegExp(`/\\*\\s*${OVERRIDES_TAG}:(.*?)\\*/`, "s"), "")
		.replace(new RegExp(`/\\*\\s*${HISTORY_TAG}:(.*?)\\*/`, "s"), "")
		.trim();
}

export function guessComponentNameFromSource(source: string): string {
	const m1 = source.match(/export\s+default\s+function\s+([A-Z][A-Za-z0-9_]*)\s*\(/);
	if (m1 && m1[1]) return m1[1];
	const m2 = source.match(/export\s+function\s+([A-Z][A-Za-z0-9_]*)\s*\(/);
	if (m2 && m2[1]) return m2[1];
	const m3 = source.match(/const\s+([A-Z][A-Za-z0-9_]*)\s*=\s*\(/);
	if (m3 && m3[1]) return m3[1];
	const m4 = source.match(/const\s+([A-Z][A-Za-z0-9_]*)\s*=\s*[^=]*=>/);
	if (m4 && m4[1]) return m4[1];
	const m5 = source.match(/class\s+([A-Z][A-Za-z0-9_]*)\s+/);
	if (m5 && m5[1]) return m5[1];
	return "Component";
}

export function buildTsxWithStyleOverrides(
	cleanedSource: string,
	overrides: Overrides,
	preferredName?: string
): string {
	// Always resolve the actual component identifier from source
	const innerName = guessComponentNameFromSource(cleanedSource);
	// Wrapper name can use the preferred name if provided, otherwise mirror the inner name
	const wrapperBase = preferredName?.trim() || innerName;
	const wrapperName = `${wrapperBase}WithOverrides`;
	const hasDefault = /export\s+default\s+/m.test(cleanedSource);
	const scopeAttr = `[data-reframe-scope="${wrapperName}"]`;
	const css = renderOverridesCssWithScope(overrides, scopeAttr);
	const suffix = `\n\nexport default function ${wrapperName}() {\n  return (\n    <div data-reframe-scope="${wrapperName}">\n      <div className=\"p-6 min-h-[730px]\">\n        <style>{${JSON.stringify(css)}}<\/style>\n        <div data-sandbox-root>\n          <${innerName} \/>\n        <\/div>\n      <\/div>\n    <\/div>\n  );\n}`;
	// Avoid duplicate default exports; if source already has default, just return cleaned source
	return hasDefault ? cleanedSource : `${cleanedSource}${suffix}`;
}


