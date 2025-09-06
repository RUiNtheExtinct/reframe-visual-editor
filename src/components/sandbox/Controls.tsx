 
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { useEffect, useState } from "react";

export function ensureColor(value?: string) {
  return value || "#e11d48"; // tailwind red-600
}

export function GradientControls({
  current,
  onChange,
}: {
  current?: string;
  onChange: (value: string | null) => void;
}) {
  const parsed = parseLinearGradient(current);
  const [angle, setAngle] = useState<number>(parsed?.angle ?? 90);
  const [stop, setStop] = useState<number>(parsed?.stop ?? 50);
  const [start, setStart] = useState<string>(parsed?.start ?? "#e11d48");
  const [end, setEnd] = useState<string>(parsed?.end ?? "#16a34a");
  const [enabled, setEnabled] = useState<boolean>(Boolean(parsed));

  useEffect(() => {
    if (!enabled) return;
    const clamped = Math.max(0, Math.min(100, stop));
    const spread = 20; // softness of blend region (in percent)
    const half = spread / 2;
    const a = Math.max(0, Math.min(100, clamped - half));
    const b = Math.max(0, Math.min(100, clamped + half));
    const val = `linear-gradient(${angle}deg, ${start} 0%, ${start} ${a}%, ${end} ${b}%, ${end} 100%)`;
    onChange(val);
  }, [enabled, angle, stop, start, end]);

  return (
    <div
      className="rounded-md border p-3 bg-background space-y-3"
      onClick={() => !enabled && setEnabled(!enabled)}
    >
      <div className="flex items-center gap-2">
        <Checkbox
          checked={enabled}
          onCheckedChange={(v) => {
            const next = Boolean(v);
            setEnabled(next);
            if (!next) onChange(null);
          }}
        />
        <span className="text-xs text-foreground/70" onClick={() => setEnabled(!enabled)}>
          Enable
        </span>
      </div>
      {enabled && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-foreground/70 mb-1">Angle</label>
            <Slider
              value={[angle]}
              onValueChange={(vals) => setAngle(Number(vals?.[0] ?? 0))}
              min={0}
              max={360}
            />
            <div className="mt-1 text-[10px] text-foreground/60">{angle}°</div>
          </div>
          <div>
            <label className="block text-xs text-foreground/70 mb-1">Balance</label>
            <Slider
              value={[stop]}
              onValueChange={(vals) => setStop(Number(vals?.[0] ?? 0))}
              min={0}
              max={100}
            />
            <div className="mt-1 text-[10px] text-foreground/60">{stop}%</div>
          </div>
          <div className="col-span-2 grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-foreground/70 mb-1">Start</label>
              <ColorInputRow value={ensureColor(start)} onChange={setStart} />
            </div>
            <div>
              <label className="block text-xs text-foreground/70 mb-1">End</label>
              <ColorInputRow value={ensureColor(end)} onChange={setEnd} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function parseLinearGradient(
  input?: string
): { angle: number; stop: number; start: string; end: string } | null {
  if (!input) return null;
  // Try four-stop format: start 0%, start P%, end P%, end 100%
  let m = input.match(
    /linear-gradient\((\d+)deg,\s*([^,]+?)\s*0%\s*,\s*\2\s*(\d+)%\s*,\s*([^,]+?)\s*\3%\s*,\s*\4\s*100%\)/i
  );
  if (m) {
    const angle = parseInt(m[1], 10);
    const start = m[2].trim();
    const stop = parseInt(m[3], 10);
    const end = m[4].trim();
    if (Number.isNaN(angle)) return null;
    return { angle, stop: Number.isNaN(stop) ? 50 : stop, start, end };
  }
  // Fallback to two-stop format: start 0%, end P%
  m = input.match(/linear-gradient\((\d+)deg,\s*([^,]+?)\s*0%\s*,\s*([^\s,]+)\s*(\d+)%\)/i);
  if (m) {
    const angle = parseInt(m[1], 10);
    const start = m[2].trim();
    const end = m[3].trim();
    const stop = parseInt(m[4], 10);
    if (Number.isNaN(angle)) return null;
    return { angle, stop: Number.isNaN(stop) ? 50 : stop, start, end };
  }
  return null;
}

export function ColorInputRow({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const display = normalizeColorForInput(value);
  return (
    <input
      type="color"
      className="w-full h-10 rounded-md bg-background appearance-none"
      value={display}
      onChange={(e) => onChange(e.target.value)}
      aria-label="Pick color"
    />
  );
}

export function normalizeColorForInput(value?: string): string {
  if (!value) return "#000000";
  const v = value.trim().toLowerCase();
  if (v.startsWith("#")) {
    return v.length === 4 ? `#${v[1]}${v[1]}${v[2]}${v[2]}${v[3]}${v[3]}` : v.slice(0, 7);
  }
  const rgba = v.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  if (rgba) {
    const toHex = (n: number) => Math.max(0, Math.min(255, n)).toString(16).padStart(2, "0");
    const r = parseInt(rgba[1], 10);
    const g = parseInt(rgba[2], 10);
    const b = parseInt(rgba[3], 10);
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }
  return "#000000";
}
