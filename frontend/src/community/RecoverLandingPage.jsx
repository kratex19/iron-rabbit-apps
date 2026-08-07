/**
 * RecoverLandingPage — magic-link entry point.
 *
 * Route: `/recover?n=<nickname>&c=<6-digit code>`
 *
 * Landing here from the recovery email opens NicknameRecoveryDialog directly
 * on step 2 with the code pre-filled — user only has to type a new email.
 * If the params are missing/invalid we fall back to a friendly explainer
 * with a link back to the Contributor Wall.
 */

import React, { useMemo, useEffect } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { KeyRound, ArrowLeft } from "lucide-react";
import NicknameRecoveryDialog from "./NicknameRecoveryDialog";

function isValidNickname(n) {
  return typeof n === "string" && /^[A-Za-z0-9_]{2,20}$/.test(n);
}

function isValidCode(c) {
  return typeof c === "string" && /^\d{6}$/.test(c);
}

export default function RecoverLandingPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const nickname = params.get("n") || "";
  const code = params.get("c") || "";

  const valid = useMemo(
    () => isValidNickname(nickname) && isValidCode(code),
    [nickname, code]
  );

  // Fire the magic-link funnel event once per valid landing. Best-effort —
  // failures are swallowed so the recovery flow itself is never blocked.
  useEffect(() => {
    if (!valid) return;
    try {
      const base = process.env.REACT_APP_BACKEND_URL;
      fetch(`${base}/api/community/recovery/track`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event: "magic_link_opened" }),
        keepalive: true,
      }).catch(() => { /* funnel is best-effort */ });
    } catch (e) { /* ignore */ }
  }, [valid]);

  return (
    <div className="min-h-screen bg-[#0B1221] text-white flex flex-col" data-testid="recover-landing">
      <div className="max-w-lg mx-auto px-4 py-8 sm:py-12 w-full flex-1">
        <div className="flex items-center gap-3 mb-8">
          <Link
            to="/contributors"
            className="w-9 h-9 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
            aria-label="Back to Contributor Wall"
            data-testid="recover-back"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "linear-gradient(135deg,#6366F1 0%,#EC4899 100%)" }}>
            <KeyRound className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Recover your nickname</h1>
            <div className="text-xs text-slate-400 mt-0.5">
              {valid ? `Signing @${nickname} over to a new email…` : "The link looks incomplete"}
            </div>
          </div>
        </div>

        {!valid && (
          <div className="rounded-xl border border-amber-400/20 bg-amber-500/10 p-4 text-sm text-amber-200" data-testid="recover-invalid">
            <p className="mb-3">
              This recovery link is missing a nickname or code. Open the email link on the
              same device where you want to sign in.
            </p>
            <Link
              to="/contributors"
              className="inline-flex items-center gap-1 h-9 px-3 rounded-md bg-amber-500/20 hover:bg-amber-500/30 text-xs font-medium"
              data-testid="recover-open-wall"
            >
              Open the Contributor Wall
            </Link>
          </div>
        )}
      </div>

      {valid && (
        <NicknameRecoveryDialog
          isOpen={true}
          nickname={nickname}
          prefillCode={code}
          onClose={() => navigate("/contributors")}
        />
      )}
    </div>
  );
}
