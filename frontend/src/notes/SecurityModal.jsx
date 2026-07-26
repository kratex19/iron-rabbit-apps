import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  ShieldCheck, Fingerprint, KeyRound, Lock, EyeOff, HardDrive,
  Timer, Cloud, ChevronRight, X, Check, Info, ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import SecurityService, { AUTO_LOCK_OPTIONS, DEFAULT_TOGGLES } from "../security/SecurityService";

const METHODS = [
  { value: "none",       label: "No App Lock (default)",              icon: Lock },
  { value: "biometric",  label: "Biometrics (Fingerprint / Face)",    icon: Fingerprint },
  { value: "pin",        label: "Iron Rabbit Local PIN (4–8 digits)", icon: KeyRound },
];

export default function SecurityModal({ isOpen, onClose, isDark, categories = {} }) {
  const [method, setMethod] = useState("none");
  const [autoLockMs, setAutoLockMs] = useState(60_000);
  const [toggles, setToggles] = useState(DEFAULT_TOGGLES);
  const [bioAvailable, setBioAvailable] = useState(false);
  const [hasPIN, setHasPIN] = useState(false);
  const [hasPanicPIN, setHasPanicPIN] = useState(false);
  const [safeCategory, setSafeCategory] = useState("");
  const [isNative, setIsNative] = useState(false);

  // PIN dialog state
  const [pinDialog, setPinDialog] = useState(null); // null | "set" | "change" | "remove" | "panic-set" | "panic-remove"
  const [newPIN, setNewPIN] = useState("");
  const [confirmPIN, setConfirmPIN] = useState("");
  const [currentPIN, setCurrentPIN] = useState("");
  const [pinError, setPinError] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    (async () => {
      setMethod(await SecurityService.getMethod());
      setAutoLockMs(await SecurityService.getAutoLockMs());
      setToggles(await SecurityService.getToggles());
      setBioAvailable(await SecurityService.biometricAvailable());
      setHasPIN(await SecurityService.hasPIN());
      setHasPanicPIN(await SecurityService.hasPanicPIN());
      setSafeCategory(await SecurityService.getSafeCategory());
      setIsNative(await SecurityService.isNative());
    })();
  }, [isOpen]);

  const persistToggle = async (key, val) => {
    const next = { ...toggles, [key]: val };
    setToggles(next);
    await SecurityService.setToggles(next);
  };

  const persistAutoLock = async (ms) => {
    setAutoLockMs(ms);
    await SecurityService.setAutoLockMs(ms);
  };

  const selectMethod = async (m) => {
    if (m === "biometric") {
      if (!bioAvailable) {
        toast.error("Biometrics not available on this device");
        return;
      }
      try {
        await SecurityService.enableBiometric();
        setMethod("biometric");
        toast.success("Biometric lock enabled");
      } catch (e) {
        toast.error(e?.message || "Could not enable biometrics");
      }
      return;
    }
    if (m === "pin") {
      setPinDialog(hasPIN ? "change" : "set");
      return;
    }
    // "none" — clear everything
    await SecurityService.clearMethod();
    setMethod("none");
    setHasPIN(false);
    toast.success("App lock disabled");
  };

  const savePIN = async () => {
    setPinError("");
    if (pinDialog === "change") {
      const cur = await SecurityService.verifyPIN(currentPIN);
      if (!cur.ok || cur.panic) {
        setPinError("Current PIN is incorrect");
        return;
      }
    }
    if (!/^\d{4,8}$/.test(newPIN)) {
      setPinError("PIN must be 4–8 digits");
      return;
    }
    if (newPIN !== confirmPIN) {
      setPinError("PINs do not match");
      return;
    }
    try {
      await SecurityService.setPIN(newPIN);
      setMethod("pin");
      setHasPIN(true);
      setPinDialog(null);
      setNewPIN(""); setConfirmPIN(""); setCurrentPIN("");
      toast.success("PIN set — app is now locked when idle");
    } catch (e) {
      setPinError(e?.message || "Could not set PIN");
    }
  };

  const removePINFlow = async () => {
    const cur = await SecurityService.verifyPIN(currentPIN);
    if (!cur.ok || cur.panic) {
      setPinError("PIN is incorrect");
      return;
    }
    await SecurityService.removePIN();
    setHasPIN(false);
    setHasPanicPIN(false);
    setMethod("none");
    setPinDialog(null);
    setCurrentPIN("");
    toast.success("PIN removed");
  };

  const savePanicPIN = async () => {
    setPinError("");
    if (!/^\d{4,8}$/.test(newPIN)) { setPinError("PIN must be 4–8 digits"); return; }
    if (newPIN !== confirmPIN)     { setPinError("PINs do not match"); return; }
    try {
      await SecurityService.setPanicPIN(newPIN);
      setHasPanicPIN(true);
      setPinDialog(null);
      setNewPIN(""); setConfirmPIN("");
      toast.success("Panic PIN set");
    } catch (e) {
      setPinError(e?.message || "Could not set Panic PIN");
    }
  };

  const removePanicPINFlow = async () => {
    await SecurityService.removePanicPIN();
    setHasPanicPIN(false);
    setPinDialog(null);
    toast.success("Panic PIN removed");
  };

  const updateSafeCategory = async (cat) => {
    setSafeCategory(cat);
    await SecurityService.setSafeCategory(cat);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent
          className={`max-w-md max-h-[90vh] overflow-y-auto ${isDark ? "bg-[#0B1221] border-white/10" : "bg-white border-gray-200"}`}
          data-testid="security-modal"
        >
          <DialogHeader>
            <DialogTitle className={`flex items-center gap-2 ${isDark ? "text-white" : "text-gray-900"}`}>
              <ShieldCheck className="w-5 h-5 text-indigo-500" /> Security &amp; Privacy
            </DialogTitle>
            <DialogDescription className={isDark ? "text-slate-400" : "text-gray-500"}>
              Choose how to secure Iron Rabbit. All security data stays on this device.
            </DialogDescription>
          </DialogHeader>

          {/* Welcome / Privacy statement */}
          <div
            className={`rounded-xl p-4 space-y-2.5 border ${
              isDark
                ? "bg-gradient-to-br from-indigo-500/10 to-purple-500/5 border-indigo-500/30 text-slate-200"
                : "bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-200 text-gray-700"
            }`}
            data-testid="security-welcome-card"
          >
            <div className={`text-sm font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
              Welcome to Iron Rabbit Apps
            </div>
            <div className={`text-[11px] font-semibold uppercase tracking-wider ${isDark ? "text-indigo-300" : "text-indigo-600"}`}>
              Your privacy and security are important to us.
            </div>
            <p className="text-xs leading-relaxed">
              Iron Rabbit Apps is designed to give you complete control over how your information is
              protected. Unlike many apps, creating an online account is <strong>not required</strong> to
              use Iron Rabbit Apps. Your notes can remain securely stored on your device, allowing you to
              work even when you don&apos;t have an internet connection.
            </p>
            <p className="text-xs leading-relaxed">
              To help protect your personal information, you can choose the security method that best
              fits your needs. Available options may include:
            </p>
            <ul className={`text-xs leading-relaxed pl-4 space-y-0.5 ${isDark ? "text-slate-300" : "text-gray-700"}`}>
              <li>• No App Lock</li>
              <li>• Fingerprint Authentication</li>
              <li>• Face ID / Face Unlock</li>
              <li>• Your Device PIN or Passcode</li>
              <li>• Iron Rabbit Apps PIN</li>
              <li>• Iron Rabbit Apps Password</li>
            </ul>
            <p className="text-xs leading-relaxed">
              You can change these settings at any time from <strong>Settings &gt; Security &amp; Privacy</strong>.
            </p>
            <p className="text-xs leading-relaxed">
              Your biometric information, device PIN, and device password are <strong>never stored</strong> by
              Iron Rabbit Apps. When you choose fingerprint, Face ID, or your device passcode,
              authentication is handled securely by your phone&apos;s operating system.
            </p>
            <p className="text-xs leading-relaxed">
              If you later decide to use premium cloud features, signing in will always remain{" "}
              <strong>optional</strong>. The free version of Iron Rabbit Apps is designed to work
              independently on your device without requiring an account.
            </p>
            <p className="text-xs leading-relaxed italic">
              Thank you for choosing Iron Rabbit Apps. We are committed to providing a secure, private,
              and reliable experience while giving you the flexibility to decide how your information is
              protected.
            </p>
            <div className={`text-center text-xs font-bold pt-2 border-t ${
              isDark ? "border-indigo-500/20 text-indigo-300" : "border-indigo-200 text-indigo-700"
            }`}>
              Your Notes. Your Privacy. Your Choice.
            </div>
          </div>

          {/* Authentication method */}
          <Section title="Authentication method" isDark={isDark}>
            {METHODS.map((m) => {
              const Ico = m.icon;
              const active = method === m.value;
              const disabled = m.value === "biometric" && !bioAvailable;
              return (
                <button
                  key={m.value}
                  type="button"
                  disabled={disabled}
                  onClick={() => selectMethod(m.value)}
                  className={`w-full text-left flex items-center gap-3 rounded-md px-3 py-2.5 border transition-colors ${
                    active
                      ? isDark ? "bg-indigo-500/15 border-indigo-500/60 text-white" : "bg-indigo-50 border-indigo-400"
                      : isDark ? "bg-white/5 border-transparent hover:bg-white/10 text-slate-200" : "bg-gray-50 border-transparent hover:bg-gray-100"
                  } ${disabled ? "opacity-40 cursor-not-allowed" : ""}`}
                  data-testid={`security-method-${m.value}`}
                >
                  <Ico className={`w-4 h-4 ${active ? "text-indigo-400" : ""}`} />
                  <span className="flex-1 text-sm">{m.label}</span>
                  {active && <Check className="w-4 h-4 text-indigo-400" />}
                </button>
              );
            })}
            {method === "pin" && (
              <div className="flex gap-2 mt-2">
                <Button variant="outline" size="sm" onClick={() => setPinDialog("change")}
                  className={`flex-1 h-8 text-xs ${isDark ? "border-white/10 text-slate-300" : ""}`}
                  data-testid="security-change-pin">
                  Change PIN
                </Button>
                <Button variant="outline" size="sm" onClick={() => setPinDialog("remove")}
                  className="flex-1 h-8 text-xs text-red-400 border-red-500/30 hover:bg-red-500/10"
                  data-testid="security-remove-pin">
                  Remove PIN
                </Button>
              </div>
            )}
            {method === "biometric" && hasPIN && (
              <p className={`text-[11px] mt-2 ${isDark ? "text-slate-500" : "text-gray-500"}`}>
                Local PIN is kept as a fallback for when biometrics fail.
              </p>
            )}
          </Section>

          {/* Panic PIN — only when main PIN is set */}
          {hasPIN && (
            <Section title="Panic PIN (optional)" isDark={isDark} icon={ShieldAlert}>
              <p className={`text-[11px] mb-2 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                A second PIN that opens Iron Rabbit into a <strong>safe view</strong> — only notes from
                your chosen category appear. Everything else stays hidden. Useful if someone forces you
                to unlock the app.
              </p>
              {!hasPanicPIN ? (
                <Button
                  size="sm"
                  onClick={() => { setNewPIN(""); setConfirmPIN(""); setPinError(""); setPinDialog("panic-set"); }}
                  className="w-full h-8 text-xs bg-amber-500 hover:bg-amber-600 text-white"
                  data-testid="security-set-panic-pin"
                >
                  <ShieldAlert className="w-3.5 h-3.5 mr-1" /> Set Panic PIN
                </Button>
              ) : (
                <>
                  <div className={`text-[11px] mb-2 flex items-center gap-1.5 ${isDark ? "text-emerald-400" : "text-emerald-600"}`}>
                    <Check className="w-3 h-3" /> Panic PIN is active
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline" size="sm"
                      onClick={() => { setNewPIN(""); setConfirmPIN(""); setPinError(""); setPinDialog("panic-set"); }}
                      className={`flex-1 h-8 text-xs ${isDark ? "border-white/10 text-slate-300" : ""}`}
                      data-testid="security-change-panic-pin"
                    >
                      Change
                    </Button>
                    <Button
                      variant="outline" size="sm"
                      onClick={removePanicPINFlow}
                      className="flex-1 h-8 text-xs text-red-400 border-red-500/30 hover:bg-red-500/10"
                      data-testid="security-remove-panic-pin"
                    >
                      Remove
                    </Button>
                  </div>
                </>
              )}

              <div className="mt-3">
                <label className={`text-[11px] mb-1 block ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                  Safe view: show only notes from category
                </label>
                <Select value={safeCategory || "__none"} onValueChange={(v) => updateSafeCategory(v === "__none" ? "" : v)}>
                  <SelectTrigger className={`h-9 text-xs ${isDark ? "bg-black/20 border-white/10 text-white" : ""}`}
                    data-testid="security-safe-category">
                    <SelectValue placeholder="No category (empty view)" />
                  </SelectTrigger>
                  <SelectContent className={isDark ? "bg-[#0B1221] border-white/10 text-white" : ""}>
                    <SelectItem value="__none" className="text-xs">— Empty view —</SelectItem>
                    {Object.keys(categories).map((cat) => (
                      <SelectItem key={cat} value={cat} className="text-xs">{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className={`text-[10px] mt-1 ${isDark ? "text-slate-500" : "text-gray-500"}`}>
                  Pick a category with innocuous notes (e.g., Shopping, Recipes). Leave as &quot;Empty view&quot;
                  to show nothing.
                </p>
              </div>
            </Section>
          )}

          {/* Auto-lock */}
          <Section title="Auto-lock" isDark={isDark} icon={Timer}>
            <Select value={String(autoLockMs)} onValueChange={(v) => persistAutoLock(Number(v))}>
              <SelectTrigger className={`h-9 text-xs ${isDark ? "bg-black/20 border-white/10 text-white" : ""}`}
                data-testid="security-autolock">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className={isDark ? "bg-[#0B1221] border-white/10 text-white" : ""}>
                {AUTO_LOCK_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={String(o.value)} className="text-xs">{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className={`text-[11px] mt-1.5 ${isDark ? "text-slate-500" : "text-gray-500"}`}>
              Locks after the app has been in the background for this duration.
            </p>
          </Section>

          {/* Toggles */}
          <Section title="Security options" isDark={isDark}>
            <ToggleRow label="Lock on app launch"                 val={toggles.lockOnLaunch}      onChange={(v) => persistToggle("lockOnLaunch", v)}      isDark={isDark} testid="tog-lock-launch" />
            <ToggleRow label="Lock when returning from background" val={toggles.lockOnBackground}  onChange={(v) => persistToggle("lockOnBackground", v)}  isDark={isDark} testid="tog-lock-bg" />
            <ToggleRow
              label="Hide app content in Recent Apps"
              val={toggles.hideInRecents}
              onChange={(v) => persistToggle("hideInRecents", v)}
              isDark={isDark}
              testid="tog-hide-recent"
              hint={!isNative ? "Native builds only (blur overlay used in browser)" : null}
            />
            <ToggleRow label="Require authentication before exporting notes" val={toggles.requireAuthExport}   onChange={(v) => persistToggle("requireAuthExport", v)}   isDark={isDark} testid="tog-auth-export" />
            <ToggleRow label="Require authentication before clearing all data" val={toggles.requireAuthClearAll} onChange={(v) => persistToggle("requireAuthClearAll", v)} isDark={isDark} testid="tog-auth-clear" />
            <ToggleRow label="Require authentication before restoring backups" val={toggles.requireAuthRestore}  onChange={(v) => persistToggle("requireAuthRestore", v)}  isDark={isDark} testid="tog-auth-restore" />
          </Section>

          {/* Privacy */}
          <Section title="Privacy" isDark={isDark} icon={HardDrive}>
            <PrivacyItem text="All data stays on this device" ok isDark={isDark} />
            <PrivacyItem text="No account required" ok isDark={isDark} />
            <PrivacyItem text="Works offline" ok isDark={isDark} />
            <PrivacyItem text="Export data manually anytime" ok isDark={isDark} />
            <PrivacyItem text="Import backups manually" ok isDark={isDark} />
          </Section>

          {/* Future premium */}
          <Section title="Cloud features (future)" isDark={isDark} icon={Cloud}>
            <p className={`text-xs ${isDark ? "text-slate-400" : "text-gray-500"}`}>
              Optional Google/Apple sign-in, cross-device sync and cloud backup are on the roadmap.
              They will remain <strong>optional</strong> — Iron Rabbit will always work fully offline
              without an account.
            </p>
          </Section>

          <div className={`text-[10px] text-center pt-2 ${isDark ? "text-slate-600" : "text-gray-400"}`}>
            Environment: {isNative ? "Native (Keystore / Keychain)" : "Web (IndexedDB + WebAuthn)"}
          </div>
        </DialogContent>
      </Dialog>

      {/* PIN set/change dialog (main OR panic) */}
      <Dialog open={pinDialog === "set" || pinDialog === "change" || pinDialog === "panic-set"} onOpenChange={() => setPinDialog(null)}>
        <DialogContent className={`max-w-sm ${isDark ? "bg-[#0B1221] border-white/10" : "bg-white"}`} data-testid="pin-dialog">
          <DialogHeader>
            <DialogTitle className={isDark ? "text-white" : ""}>
              {pinDialog === "panic-set"
                ? (hasPanicPIN ? "Change Panic PIN" : "Set Panic PIN")
                : (pinDialog === "change" ? "Change PIN" : "Set PIN")}
            </DialogTitle>
            <DialogDescription className={isDark ? "text-slate-400" : "text-gray-500"}>
              {pinDialog === "panic-set"
                ? "4–8 digits. This PIN opens Iron Rabbit into the safe view. It must differ from your main PIN."
                : "4–8 digits. You'll be asked to enter this when the app unlocks."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {pinDialog === "change" && (
              <Input
                type="password" inputMode="numeric" maxLength={8}
                value={currentPIN} onChange={(e) => setCurrentPIN(e.target.value.replace(/\D/g, ""))}
                placeholder="Current PIN"
                className={`h-9 ${isDark ? "bg-black/20 border-white/10 text-white" : ""}`}
                data-testid="pin-current"
              />
            )}
            <Input
              type="password" inputMode="numeric" maxLength={8}
              value={newPIN} onChange={(e) => setNewPIN(e.target.value.replace(/\D/g, ""))}
              placeholder={pinDialog === "panic-set" ? "New Panic PIN" : "New PIN"}
              className={`h-9 ${isDark ? "bg-black/20 border-white/10 text-white" : ""}`}
              data-testid="pin-new"
            />
            <Input
              type="password" inputMode="numeric" maxLength={8}
              value={confirmPIN} onChange={(e) => setConfirmPIN(e.target.value.replace(/\D/g, ""))}
              placeholder="Confirm"
              className={`h-9 ${isDark ? "bg-black/20 border-white/10 text-white" : ""}`}
              data-testid="pin-confirm"
            />
            {pinError && <p className="text-xs text-red-400">{pinError}</p>}
            <p className={`text-[11px] flex items-start gap-1 ${isDark ? "text-slate-500" : "text-gray-500"}`}>
              <Info className="w-3 h-3 mt-0.5 shrink-0" />
              {pinDialog === "panic-set"
                ? "The Panic PIN looks identical to a normal unlock — no visible indicator to observers."
                : "Forgot your PIN? Clear all data from Settings — this erases everything on the device."}
            </p>
            <div className="flex gap-2 pt-1">
              <Button variant="outline" onClick={() => { setPinDialog(null); setNewPIN(""); setConfirmPIN(""); setCurrentPIN(""); setPinError(""); }}
                className={`flex-1 h-9 ${isDark ? "border-white/10 text-slate-300" : ""}`}>Cancel</Button>
              <Button
                onClick={pinDialog === "panic-set" ? savePanicPIN : savePIN}
                className={`flex-1 h-9 text-white ${pinDialog === "panic-set" ? "bg-amber-500 hover:bg-amber-600" : "bg-indigo-500 hover:bg-indigo-600"}`}
                data-testid="pin-save"
              >
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* PIN remove dialog */}
      <Dialog open={pinDialog === "remove"} onOpenChange={() => setPinDialog(null)}>
        <DialogContent className={`max-w-sm ${isDark ? "bg-[#0B1221] border-white/10" : "bg-white"}`}>
          <DialogHeader>
            <DialogTitle className="text-red-400">Remove PIN</DialogTitle>
            <DialogDescription className={isDark ? "text-slate-400" : "text-gray-500"}>
              This will disable the app lock. Enter your current PIN to confirm.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              type="password" inputMode="numeric" maxLength={8}
              value={currentPIN} onChange={(e) => setCurrentPIN(e.target.value.replace(/\D/g, ""))}
              placeholder="Current PIN"
              className={`h-9 ${isDark ? "bg-black/20 border-white/10 text-white" : ""}`}
              data-testid="pin-remove-current"
            />
            {pinError && <p className="text-xs text-red-400">{pinError}</p>}
            <div className="flex gap-2 pt-1">
              <Button variant="outline" onClick={() => { setPinDialog(null); setCurrentPIN(""); setPinError(""); }}
                className={`flex-1 h-9 ${isDark ? "border-white/10 text-slate-300" : ""}`}>Cancel</Button>
              <Button onClick={removePINFlow} className="flex-1 h-9 bg-red-500 hover:bg-red-600 text-white" data-testid="pin-remove-confirm">
                Remove PIN
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ---- Presentational subcomponents ----------------------------------------

function Section({ title, icon: Ico, isDark, children }) {
  return (
    <div className={`border-t pt-3 mt-3 ${isDark ? "border-white/10" : "border-gray-200"}`}>
      <div className={`text-xs font-semibold mb-2 flex items-center gap-1.5 ${isDark ? "text-slate-300" : "text-gray-700"}`}>
        {Ico && <Ico className="w-3.5 h-3.5" />} {title}
      </div>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function ToggleRow({ label, val, onChange, isDark, hint, testid }) {
  return (
    <div className={`flex items-center justify-between rounded-md px-3 py-2 ${isDark ? "bg-white/5" : "bg-gray-50"}`}>
      <div className="flex-1 min-w-0 pr-2">
        <div className={`text-xs ${isDark ? "text-slate-200" : "text-gray-700"}`}>{label}</div>
        {hint && <div className={`text-[10px] mt-0.5 ${isDark ? "text-slate-500" : "text-gray-400"}`}>{hint}</div>}
      </div>
      <Switch checked={!!val} onCheckedChange={onChange} data-testid={testid} />
    </div>
  );
}

function PrivacyItem({ text, ok, isDark }) {
  return (
    <div className={`flex items-center gap-2 text-xs ${isDark ? "text-slate-300" : "text-gray-700"}`}>
      <span className={`w-4 h-4 rounded-full flex items-center justify-center ${ok ? "bg-emerald-500/20 text-emerald-400" : "bg-slate-500/20 text-slate-400"}`}>
        {ok ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
      </span>
      {text}
    </div>
  );
}
