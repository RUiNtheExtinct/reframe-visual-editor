/* eslint-disable  @typescript-eslint/no-explicit-any */
"use client";

import Link from "next/link";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FONT_OPTIONS } from "@/constants";
import { ColorInputRow, GradientControls, ensureColor } from "./Controls";
import { extractRotationDeg } from "./overrides";

type SandboxInspectorProps = {
  name: string;
  description: string;
  setName: (v: string) => void;
  setDescription: (v: string) => void;

  selectedSelector: string | null;
  selectedText: string;
  selectedStyle: Record<string, string | number>;

  applyTextChange: (text: string) => void;
  applyStyleChange: (styleKey: string, value: string | number) => void;
};

export default function SandboxInspector(props: SandboxInspectorProps) {
  const {
    name,
    description,
    setName,
    setDescription,
    selectedSelector,
    selectedText,
    selectedStyle,
    applyTextChange,
    applyStyleChange,
  } = props;

  return (
    <section className="space-y-4" style={{ flex: "1 1 0%" }}>
      <div className="rounded-xl border p-4 bg-card">
        <div className="flex flex-row items-center justify-between mb-3">
          <h4 className="text-md font-semibold text-red-600 dark:text-red-300">Meta</h4>
          <div className="flex flex-row items-center gap-3">
            <Link
              className="text-sm underline decoration-dotted text-red-700 dark:text-red-200"
              href="/components"
            >
              Components
            </Link>
            <Link className="text-sm text-red-600 dark:text-red-400 hover:underline" href="/">
              New import
            </Link>
          </div>
        </div>
        <div className="space-y-3">
          <label className="block text-xs text-foreground/70">Name</label>
          <input
            className="w-full rounded-md border px-3 py-2 bg-background text-sm"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <label className="block text-xs text-foreground/70">Description</label>
          <input
            className="w-full rounded-md border px-3 py-2 bg-background text-sm"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
      </div>

      <div className="rounded-xl border p-4 bg-card">
        <h4 className="text-md font-semibold mb-3 text-red-600 dark:text-red-300">Inspector</h4>
        {selectedSelector ? (
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-foreground/70 mb-1">Selected</label>
              <input
                className="w-full rounded-md border bg-background px-3 py-2 text-xs text-foreground/70"
                value={selectedSelector}
                readOnly
              />
            </div>
            <Tabs defaultValue="formatting">
              <TabsList className="w-full grid grid-cols-4">
                <TabsTrigger value="formatting">Formatting</TabsTrigger>
                <TabsTrigger value="borders">Borders</TabsTrigger>
                <TabsTrigger value="gradients">Gradients</TabsTrigger>
                <TabsTrigger value="layout">Layout</TabsTrigger>
              </TabsList>
              <TabsContent value="formatting">
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-foreground/70 mb-1">Text</label>
                    <input
                      className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                      value={selectedText}
                      onChange={(e) => applyTextChange(e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2 grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-foreground/70 mb-1">Text Color</label>
                        <ColorInputRow
                          value={ensureColor(selectedStyle["color"] as string | undefined)}
                          onChange={(c) => applyStyleChange("color", c)}
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-foreground/70 mb-1">
                          Background Color
                        </label>
                        <ColorInputRow
                          value={ensureColor(
                            selectedStyle["backgroundColor"] as string | undefined
                          )}
                          onChange={(c) => applyStyleChange("backgroundColor", c)}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-foreground/70 mb-1">
                        Font Size (px)
                      </label>
                      <input
                        type="number"
                        className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                        value={Number(selectedStyle["fontSize"] ?? 16)}
                        onChange={(e) => applyStyleChange("fontSize", Number(e.target.value || 0))}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-foreground/70 mb-1">Padding (px)</label>
                      <input
                        type="number"
                        className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                        value={Number((selectedStyle as any)["padding"] ?? 0)}
                        onChange={(e) => applyStyleChange("padding", Number(e.target.value || 0))}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-foreground/70 mb-1">Font Family</label>
                      <Select
                        value={(selectedStyle["fontFamily"] as string) || "default"}
                        onValueChange={(val) =>
                          applyStyleChange("fontFamily", val === "default" ? "" : val)
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Choose font" />
                        </SelectTrigger>
                        <SelectContent>
                          {FONT_OPTIONS.map((opt) => (
                            <SelectItem
                              key={opt.label}
                              value={opt.value === "default" ? "default" : opt.value}
                            >
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-end gap-2">
                      <button
                        className={`rounded-md w-fit border px-4 py-2 text-sm ${selectedStyle["fontStyle"] === "italic" ? "bg-foreground text-background" : ""}`}
                        onClick={() =>
                          applyStyleChange(
                            "fontStyle",
                            selectedStyle["fontStyle"] === "italic" ? "normal" : "italic"
                          )
                        }
                      >
                        Italic
                      </button>
                      <div className="w-full">
                        <label className="block text-xs text-foreground/70 mb-1">Weight</label>
                        <Select
                          value={String(selectedStyle["fontWeight"] ?? 400)}
                          onValueChange={(val) => applyStyleChange("fontWeight", Number(val))}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {[100, 200, 300, 400, 500, 600, 700, 800, 900].map((w) => (
                              <SelectItem key={w} value={String(w)}>
                                {w}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="borders">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-foreground/70 mb-1">Border Style</label>
                    <Select
                      value={(selectedStyle["borderStyle"] as string) || "none"}
                      onValueChange={(val) =>
                        applyStyleChange("borderStyle", val === "none" ? "" : val)
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {["none", "solid", "dashed", "dotted", "double"].map((s) => (
                          <SelectItem key={s} value={s}>
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-xs text-foreground/70 mb-1">
                      Border Width (px)
                    </label>
                    <input
                      type="number"
                      className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                      value={Number((selectedStyle as any)["borderWidth"] ?? 0)}
                      onChange={(e) => applyStyleChange("borderWidth", Number(e.target.value || 0))}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-foreground/70 mb-1">
                      Border Radius (px)
                    </label>
                    <input
                      type="number"
                      className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                      value={Number((selectedStyle as any)["borderRadius"] ?? 0)}
                      onChange={(e) =>
                        applyStyleChange("borderRadius", Number(e.target.value || 0))
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-foreground/70 mb-1">Border Color</label>
                    <ColorInputRow
                      value={ensureColor(
                        (selectedStyle as any)["borderColor"] as string | undefined
                      )}
                      onChange={(c) => applyStyleChange("borderColor", c)}
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="gradients">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="text-xs font-semibold text-foreground/70">Text Gradient</div>
                    <GradientControls
                      current={(selectedStyle as any)["backgroundImage"] as string | undefined}
                      onChange={(g) => {
                        const bi = (selectedStyle as any)["backgroundImage"] as string | undefined;
                        const parts = (bi && bi.match(/linear-gradient\([^\)]*\)/g)) || [];
                        const bg = parts.length >= 2 ? parts[0] : undefined;
                        const layers: string[] = [];
                        if (bg) layers.push(bg);
                        if (g) layers.push(g);
                        applyStyleChange("backgroundImage", layers.join(", "));
                        applyStyleChange("WebkitBackgroundClip", g ? "text" : "");
                        applyStyleChange("WebkitTextFillColor", g ? "transparent" : "");
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="text-xs font-semibold text-foreground/70">
                      Background Gradient
                    </div>
                    <GradientControls
                      current={(selectedStyle as any)["backgroundImage"] as string | undefined}
                      onChange={(g) => {
                        const bi = (selectedStyle as any)["backgroundImage"] as string | undefined;
                        const parts = (bi && bi.match(/linear-gradient\([^\)]*\)/g)) || [];
                        const text = parts.length >= 2 ? parts[1] : undefined;
                        const layers: string[] = [];
                        if (g) layers.push(g);
                        if (text) layers.push(text);
                        applyStyleChange("backgroundImage", layers.join(", "));
                        applyStyleChange("WebkitBackgroundClip", text ? "text" : "");
                        applyStyleChange("WebkitTextFillColor", text ? "transparent" : "");
                        if (g) applyStyleChange("backgroundColor", "");
                      }}
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="layout">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-foreground/70 mb-1">Width (px)</label>
                    <input
                      type="number"
                      className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                      value={Number((selectedStyle as any)["width"] ?? 0)}
                      onChange={(e) => applyStyleChange("width", Number(e.target.value || 0))}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-foreground/70 mb-1">Height (px)</label>
                    <input
                      type="number"
                      className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                      value={Number((selectedStyle as any)["height"] ?? 0)}
                      onChange={(e) => applyStyleChange("height", Number(e.target.value || 0))}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-foreground/70 mb-1">
                      Margin Left (px)
                    </label>
                    <input
                      type="number"
                      className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                      value={Number((selectedStyle as any)["marginLeft"] ?? 0)}
                      onChange={(e) => applyStyleChange("marginLeft", Number(e.target.value || 0))}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-foreground/70 mb-1">Margin Top (px)</label>
                    <input
                      type="number"
                      className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                      value={Number((selectedStyle as any)["marginTop"] ?? 0)}
                      onChange={(e) => applyStyleChange("marginTop", Number(e.target.value || 0))}
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs text-foreground/70 mb-1">Rotation (deg)</label>
                    <input
                      type="number"
                      className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                      value={extractRotationDeg(
                        (selectedStyle as any)["transform"] as string | undefined
                      )}
                      onChange={(e) => {
                        const deg = Math.round(Number(e.target.value || 0));
                        applyStyleChange("transform", `rotate(${deg}deg)`);
                      }}
                    />
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        ) : (
          <p className="text-sm text-foreground/70">Click any element in the preview to edit it.</p>
        )}
      </div>
    </section>
  );
}
