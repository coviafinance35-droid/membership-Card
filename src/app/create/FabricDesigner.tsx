"use client";

import { useEffect, useRef, useState } from "react";
import { Canvas, FabricImage, FabricObject, Rect, Textbox } from "fabric";
import { Download, ImagePlus, RotateCcw, Square, Type } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = { initial?: string; onChange?: (json: string) => void };

export function FabricDesigner({ initial, onChange }: Props) {
  const elementRef = useRef<HTMLCanvasElement>(null);
  const canvasRef = useRef<Canvas | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!elementRef.current) return;
    const canvas = new Canvas(elementRef.current, { width: 760, height: 480, backgroundColor: "#0e1828", preserveObjectStacking: true });
    canvasRef.current = canvas;
    if (initial) {
      try { canvas.loadFromJSON(JSON.parse(initial)).then(() => { canvas.requestRenderAll(); setReady(true); }).catch(() => setReady(true)); } catch { queueMicrotask(() => setReady(true)); }
    } else {
      canvas.add(new Rect({ left: 24, top: 24, width: 712, height: 432, rx: 24, ry: 24, fill: "#172943", stroke: "#65d5c8", strokeWidth: 2 }));
      canvas.add(new Textbox("YOUR FAN CARD", { left: 58, top: 64, width: 420, fontSize: 34, fontFamily: "Arial", fontWeight: "700", fill: "#f7fafc" }));
      canvas.add(new Textbox("Drag, resize, and rotate every layer", { left: 60, top: 118, width: 430, fontSize: 16, fontFamily: "Arial", fill: "#a9b8cf" }));
      canvas.add(new Textbox("MEMBER  /  2026", { left: 60, top: 382, width: 300, fontSize: 15, fontFamily: "monospace", fill: "#65d5c8" }));
      canvas.requestRenderAll(); queueMicrotask(() => setReady(true));
    }
    const save = () => onChange?.(JSON.stringify(canvas.toJSON()));
    canvas.on("object:modified", save);
    return () => { canvas.off("object:modified", save); canvas.dispose(); canvasRef.current = null; };
  }, [initial, onChange]);

  function addText() { const canvas = canvasRef.current; if (!canvas) return; canvas.add(new Textbox("New text", { left: 180, top: 200, width: 240, fontSize: 24, fill: "#ffffff", fontFamily: "Arial" })); canvas.setActiveObject(canvas.getObjects().at(-1) as FabricObject); canvas.requestRenderAll(); }
  function addShape() { const canvas = canvasRef.current; if (!canvas) return; canvas.add(new Rect({ left: 220, top: 220, width: 120, height: 80, rx: 16, ry: 16, fill: "#65d5c8", opacity: 0.9 })); canvas.requestRenderAll(); }
  function exportAs(format: "png" | "jpeg" | "svg") { const canvas = canvasRef.current; if (!canvas) return; const link = document.createElement("a"); link.download = `fan-card.${format}`; link.href = format === "svg" ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(canvas.toSVG())}` : canvas.toDataURL({ format: format === "jpeg" ? "jpeg" : "png", multiplier: 2 }); link.click(); }
  async function addPhoto(file: File | undefined) { if (!file || !canvasRef.current) return; const url = URL.createObjectURL(file); const image = await FabricImage.fromURL(url); image.scaleToWidth(170); image.set({ left: 540, top: 150, rx: 18, ry: 18 }); canvasRef.current.add(image); canvasRef.current.setActiveObject(image); canvasRef.current.requestRenderAll(); URL.revokeObjectURL(url); }

  return <section className="overflow-hidden rounded-2xl border bg-card shadow-card"><div className="flex flex-wrap items-center gap-2 border-b bg-muted/30 p-3"><span className="mr-auto text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Canvas editor</span><input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => void addPhoto(e.target.files?.[0])} /><Button type="button" size="sm" variant="outline" onClick={() => fileRef.current?.click()} disabled={!ready}><ImagePlus data-icon="inline-start" /> Photo</Button><Button type="button" size="sm" variant="outline" onClick={addText} disabled={!ready}><Type data-icon="inline-start" /> Text</Button><Button type="button" size="sm" variant="outline" onClick={addShape} disabled={!ready}><Square data-icon="inline-start" /> Shape</Button><Button type="button" size="sm" variant="outline" onClick={() => canvasRef.current?.discardActiveObject()} disabled={!ready}><RotateCcw data-icon="inline-start" /> Clear selection</Button><Button type="button" size="sm" onClick={() => exportAs("png")} disabled={!ready}><Download data-icon="inline-start" /> PNG</Button></div><div className="overflow-x-auto bg-[#0a101c] p-3"><canvas ref={elementRef} className="mx-auto block max-w-full rounded-xl" aria-label="Editable fan card canvas" /></div><div className="flex flex-wrap gap-2 border-t p-3"><Button type="button" variant="ghost" size="sm" onClick={() => exportAs("jpeg")} disabled={!ready}>Export JPEG</Button><Button type="button" variant="ghost" size="sm" onClick={() => exportAs("svg")} disabled={!ready}>Export SVG</Button><span className="ml-auto text-xs text-muted-foreground">Select an element to move, resize, or rotate it.</span></div></section>;
}

export default FabricDesigner;
