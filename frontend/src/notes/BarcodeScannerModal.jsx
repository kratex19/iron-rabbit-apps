import React, { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Camera, CameraOff, Barcode, Search, X, Check, AlertCircle, Loader2, Info,
} from "lucide-react";
import { Capacitor } from "@capacitor/core";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { haptic } from "../utils/haptic";
import { lookupBarcode } from "../utils/openFoodFacts";

/**
 * Barcode Scanner + OpenFoodFacts lookup.
 *
 * Uses the browser BarcodeDetector API when available. Falls back to
 * manual entry when the API is unavailable (e.g. iOS Safari) or the user
 * denies camera access.
 *
 * After a barcode is captured we hit OpenFoodFacts (free, no auth) to
 * pull product name + nutrition data. If lookup fails, the raw barcode
 * is still returned so the user can name it themselves.
 *
 * `onCapture({ code, name, nutrition })` is called when the user
 * accepts a scanned/looked-up product.
 */
export default function BarcodeScannerModal({ isOpen, onClose, onCapture, isDark }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const detectorRef = useRef(null);
  const rafRef = useRef(null);
  const [status, setStatus] = useState("idle"); // idle | starting | scanning | error | unsupported
  const [error, setError] = useState("");
  const [manualCode, setManualCode] = useState("");
  const [scanned, setScanned] = useState(null); // { code }
  const [lookup, setLookup] = useState(null);   // { name, brand, image, nutrition } | null
  const [lookupState, setLookupState] = useState("idle"); // idle | loading | ok | not_found | offline | error
  const [customName, setCustomName] = useState("");
  const [fromCache, setFromCache] = useState(false);

  const IS_NATIVE = (() => {
    try { return Capacitor?.isNativePlatform?.() === true; } catch { return false; }
  })();

  const stopCamera = () => {
    try {
      if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
      if (videoRef.current) videoRef.current.srcObject = null;
    } catch { /* ignore */ }
  };

  const startCamera = async () => {
    setError("");
    setStatus("starting");

    // NATIVE (iOS/Android via Capacitor) → use Google ML Kit for scanning.
    // Much faster than BarcodeDetector, works offline, better low-light detection.
    if (IS_NATIVE) {
      try {
        const mod = await import("@capacitor-mlkit/barcode-scanning");
        const BarcodeScanner = mod.BarcodeScanner;
        // Check module availability (ML Kit ships as a Play Services module on Android)
        const { available } = await BarcodeScanner.isSupported();
        if (!available) {
          setStatus("unsupported");
          return;
        }
        // Ensure permission
        const perm = await BarcodeScanner.checkPermissions();
        if (perm.camera !== "granted") {
          const req = await BarcodeScanner.requestPermissions();
          if (req.camera !== "granted") {
            setError("Camera permission denied");
            setStatus("error");
            return;
          }
        }
        // Ensure ML Kit module is installed (Android only; no-op on iOS)
        if (typeof BarcodeScanner.isGoogleBarcodeScannerModuleAvailable === "function") {
          const modCheck = await BarcodeScanner.isGoogleBarcodeScannerModuleAvailable();
          if (!modCheck.available) {
            await BarcodeScanner.installGoogleBarcodeScannerModule();
          }
        }
        setStatus("scanning");
        const { barcodes } = await BarcodeScanner.scan();
        if (barcodes && barcodes.length > 0) {
          const raw = String(barcodes[0].rawValue || "").trim();
          if (raw) {
            haptic("success");
            setScanned({ code: raw });
            setStatus("idle");
            return;
          }
        }
        setStatus("idle");
      } catch (err) {
        console.error("ML Kit scan error:", err);
        setError(err?.message || "Native scanner failed");
        setStatus("error");
      }
      return;
    }

    // WEB → BarcodeDetector API when available
    if (typeof window === "undefined" || !("BarcodeDetector" in window)) {
      setStatus("unsupported");
      return;
    }
    try {
      const formats = await window.BarcodeDetector.getSupportedFormats?.().catch(() => null);
      const supported = formats && formats.length ? formats : ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "code_39"];
      detectorRef.current = new window.BarcodeDetector({ formats: supported });

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setStatus("scanning");
      scanLoop();
    } catch (err) {
      console.error("Camera error:", err);
      setError(err?.message || "Could not start camera");
      setStatus("error");
    }
  };

  const scanLoop = async () => {
    if (!videoRef.current || !detectorRef.current) return;
    try {
      const codes = await detectorRef.current.detect(videoRef.current);
      if (codes && codes.length > 0) {
        const raw = String(codes[0].rawValue || "").trim();
        if (raw) {
          haptic("tap");
          setScanned({ code: raw });
          stopCamera();
          setStatus("idle");
          return;
        }
      }
    } catch { /* keep scanning */ }
    rafRef.current = requestAnimationFrame(scanLoop);
  };

  // Lookup on OpenFoodFacts (with 90-day localforage cache) when we have a scanned code
  useEffect(() => {
    if (!scanned?.code) return;
    let cancelled = false;
    (async () => {
      setLookupState("loading");
      setFromCache(false);
      const result = await lookupBarcode(scanned.code);
      if (cancelled) return;
      if (result.state === "ok" && result.product) {
        setLookup(result.product);
        setCustomName(result.product.name || "");
        setLookupState("ok");
        setFromCache(!!result.cached);
      } else {
        setLookupState(result.state); // not_found | offline | error
        setCustomName("");
        setFromCache(false);
      }
    })();
    return () => { cancelled = true; };
  }, [scanned?.code]);

  useEffect(() => {
    if (isOpen) {
      // auto-start scanner: ML Kit on native, BarcodeDetector on web
      if (IS_NATIVE) {
        startCamera();
      } else if (typeof window !== "undefined" && "BarcodeDetector" in window) {
        startCamera();
      } else {
        setStatus("unsupported");
      }
    } else {
      // cleanup on close
      stopCamera();
      setScanned(null);
      setLookup(null);
      setLookupState("idle");
      setCustomName("");
      setManualCode("");
      setStatus("idle");
      setError("");
    }
    // startCamera intentionally omitted — recreating it triggers a scan restart loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const handleManualSubmit = (e) => {
    e?.preventDefault();
    const code = manualCode.trim();
    if (!code) return;
    setScanned({ code });
    stopCamera();
  };

  const handleAccept = () => {
    if (!scanned) return;
    const name = customName.trim() || lookup?.name || `Item ${scanned.code}`;
    onCapture({
      code: scanned.code,
      name,
      brand: lookup?.brand || "",
      nutrition: lookup?.nutrition || null,
      nutriscore: lookup?.nutriscore || null,
    });
    onClose();
  };

  const handleScanAnother = () => {
    setScanned(null);
    setLookup(null);
    setLookupState("idle");
    setCustomName("");
    startCamera();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className={`max-w-lg max-h-[92vh] overflow-y-auto ${isDark ? "bg-[#0B1221] border-white/10" : "bg-gray-50 border-gray-200"}`}
        data-testid="barcode-scanner-modal"
      >
        <DialogHeader>
          <DialogTitle className={`flex items-center gap-2 ${isDark ? "text-white" : "text-gray-900"}`}>
            <Barcode className="w-5 h-5 text-emerald-400" /> Barcode Scanner
          </DialogTitle>
          <DialogDescription className={isDark ? "text-slate-400" : "text-gray-500"}>
            Point at a barcode or enter it manually — product info via Open Food Facts (free, offline-friendly).
          </DialogDescription>
        </DialogHeader>

        {!scanned && (
          <div className="space-y-3">
            {/* Video / status area */}
            <div className={`relative aspect-video rounded-xl overflow-hidden border ${isDark ? "border-white/10 bg-black" : "border-gray-200 bg-gray-900"}`}>
              {status === "scanning" && !IS_NATIVE && (
                <>
                  <video ref={videoRef} className="w-full h-full object-cover" playsInline muted data-testid="barcode-video" />
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <div className="w-3/4 h-1/3 border-4 border-emerald-400/70 rounded-lg" />
                  </div>
                  <div className="absolute top-2 left-2 bg-emerald-500/90 text-white text-[10px] uppercase tracking-wider px-2 py-0.5 rounded">
                    scanning
                  </div>
                </>
              )}
              {status === "scanning" && IS_NATIVE && (
                <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-white text-center px-4">
                  <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
                  <div className="text-sm font-medium">Native ML Kit scanner active</div>
                  <div className="text-xs text-slate-400">Point at a barcode — result is captured instantly.</div>
                </div>
              )}
              {status === "starting" && (
                <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-white">
                  <Loader2 className="w-6 h-6 animate-spin" />
                  <div className="text-sm">Starting camera…</div>
                </div>
              )}
              {status === "unsupported" && (
                <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-white text-center px-4">
                  <CameraOff className="w-8 h-8 text-slate-400" />
                  <div className="text-sm font-medium">Camera scan not supported</div>
                  <div className="text-xs text-slate-400">Type the barcode manually below.</div>
                </div>
              )}
              {status === "error" && (
                <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-white text-center px-4">
                  <AlertCircle className="w-8 h-8 text-red-400" />
                  <div className="text-sm font-medium">Couldn&apos;t start camera</div>
                  <div className="text-xs text-slate-400 max-w-xs">{error}</div>
                  <Button size="sm" onClick={startCamera} className="mt-2 bg-emerald-500 hover:bg-emerald-600" data-testid="barcode-retry-btn">
                    <Camera className="w-4 h-4 mr-1" /> Try again
                  </Button>
                </div>
              )}
              {status === "idle" && (
                <div className="w-full h-full flex items-center justify-center">
                  <Button size="sm" onClick={startCamera} className="bg-emerald-500 hover:bg-emerald-600" data-testid="barcode-start-btn">
                    <Camera className="w-4 h-4 mr-1" /> {IS_NATIVE ? "Open ML Kit scanner" : "Start camera"}
                  </Button>
                </div>
              )}
            </div>

            {/* Manual fallback */}
            <form onSubmit={handleManualSubmit} className="flex gap-2">
              <Input
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value.replace(/\D/g, ""))}
                inputMode="numeric"
                placeholder="Enter barcode manually (e.g. 3017620422003)"
                className={`h-9 flex-1 ${isDark ? "bg-white/5 border-white/10 text-white placeholder:text-slate-500" : ""}`}
                data-testid="barcode-manual-input"
              />
              <Button type="submit" disabled={!manualCode.trim()} className="bg-emerald-500 hover:bg-emerald-600" data-testid="barcode-manual-submit">
                <Search className="w-4 h-4 mr-1" /> Look up
              </Button>
            </form>
          </div>
        )}

        {scanned && (
          <div className="space-y-3">
            <div className={`rounded-xl p-3 border ${isDark ? "bg-white/5 border-white/10" : "bg-white border-gray-200"}`}>
              <div className="flex items-center gap-3">
                {lookup?.image ? (
                  <img
                    src={lookup.image}
                    alt=""
                    className="w-16 h-16 rounded object-cover shrink-0 border border-white/10"
                  />
                ) : (
                  <div className={`w-16 h-16 rounded shrink-0 flex items-center justify-center ${isDark ? "bg-white/5 text-slate-500" : "bg-gray-100 text-gray-400"}`}>
                    <Barcode className="w-6 h-6" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className={`text-[10px] font-mono uppercase tracking-wider ${isDark ? "text-slate-500" : "text-gray-500"}`}>
                    {scanned.code}
                  </div>
                  {lookupState === "loading" && (
                    <div className={`text-sm flex items-center gap-1.5 mt-0.5 ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Looking up…
                    </div>
                  )}
                  {lookupState === "ok" && lookup && (
                    <div className={`text-sm font-medium truncate ${isDark ? "text-white" : "text-gray-900"}`}>
                      {lookup.name || "Unnamed product"}
                      {lookup.brand && (
                        <span className={`ml-2 text-[11px] font-normal ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                          {lookup.brand}
                        </span>
                      )}
                      {fromCache && (
                        <span
                          className={`ml-2 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${isDark ? "bg-indigo-500/20 text-indigo-300" : "bg-indigo-100 text-indigo-700"}`}
                          title="Loaded from offline cache — no network hit"
                          data-testid="barcode-from-cache-badge"
                        >
                          cached
                        </span>
                      )}
                    </div>
                  )}
                  {lookupState === "not_found" && (
                    <div className={`text-sm mt-0.5 ${isDark ? "text-amber-300" : "text-amber-700"}`}>
                      Not in Open Food Facts — name it yourself.
                    </div>
                  )}
                  {lookupState === "offline" && (
                    <div className={`text-sm mt-0.5 ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                      You&apos;re offline — name it yourself.
                    </div>
                  )}
                  {lookupState === "error" && (
                    <div className={`text-sm mt-0.5 ${isDark ? "text-red-300" : "text-red-700"}`}>
                      Lookup failed — name it yourself.
                    </div>
                  )}
                  {lookup?.nutriscore && (
                    <div className="mt-1">
                      <span className={`inline-block text-[10px] uppercase font-bold px-1.5 py-0.5 rounded text-white ${{
                        a: "bg-green-600",
                        b: "bg-lime-500",
                        c: "bg-yellow-500",
                        d: "bg-orange-500",
                        e: "bg-red-600",
                      }[String(lookup.nutriscore).toLowerCase()] || "bg-gray-500"}`}>
                        Nutri-Score {String(lookup.nutriscore).toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Editable name */}
            <div>
              <label className={`text-[10px] uppercase tracking-wider font-semibold ${isDark ? "text-slate-500" : "text-gray-500"}`}>
                Item name (as it appears on your list)
              </label>
              <Input
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="e.g. Nutella 400g"
                className={`h-9 mt-1 ${isDark ? "bg-white/5 border-white/10 text-white placeholder:text-slate-500" : ""}`}
                data-testid="barcode-name-input"
                autoFocus
              />
            </div>

            {/* Nutrition */}
            {lookup?.nutrition && Object.values(lookup.nutrition).some(v => v !== null && v !== undefined) && (
              <div className={`rounded-xl p-3 border ${isDark ? "bg-white/[0.02] border-white/10" : "bg-white border-gray-200"}`}>
                <div className={`flex items-center gap-1.5 mb-2 text-xs font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
                  <Info className="w-3.5 h-3.5 text-emerald-400" /> Nutrition per 100g
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
                  <NutrientCell label="Energy" value={lookup.nutrition.energy_kcal_100g} unit="kcal" isDark={isDark} />
                  <NutrientCell label="Fat" value={lookup.nutrition.fat_100g} unit="g" isDark={isDark} />
                  <NutrientCell label="Sat. fat" value={lookup.nutrition.saturated_fat_100g} unit="g" isDark={isDark} />
                  <NutrientCell label="Carbs" value={lookup.nutrition.carbs_100g} unit="g" isDark={isDark} />
                  <NutrientCell label="Sugars" value={lookup.nutrition.sugars_100g} unit="g" isDark={isDark} />
                  <NutrientCell label="Protein" value={lookup.nutrition.protein_100g} unit="g" isDark={isDark} />
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <Button variant="outline" onClick={handleScanAnother} className="flex-1" data-testid="barcode-scan-another">
                <Camera className="w-4 h-4 mr-1" /> Scan another
              </Button>
              <Button
                onClick={handleAccept}
                disabled={!customName.trim() && lookupState !== "ok"}
                className="flex-1 bg-emerald-500 hover:bg-emerald-600"
                data-testid="barcode-accept-btn"
              >
                <Check className="w-4 h-4 mr-1" /> Add to list
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function NutrientCell({ label, value, unit, isDark }) {
  const v = value === null || value === undefined ? "—" : Number(value).toFixed(1);
  return (
    <div className={`rounded-lg py-1.5 px-1 ${isDark ? "bg-white/[0.03]" : "bg-gray-50"}`}>
      <div className={`text-[9px] uppercase tracking-wider font-semibold ${isDark ? "text-slate-500" : "text-gray-500"}`}>
        {label}
      </div>
      <div className={`text-xs font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
        {v}{v !== "—" ? unit : ""}
      </div>
    </div>
  );
}
