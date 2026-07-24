import React, { useRef } from "react";
import { toast } from "sonner";
import { Share2, Copy, Mail, MessageSquare, Image as ImageIcon } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import NoteTile from "../components/NoteTile";
import { shareNodeAsImage } from "../utils/shareTile";

/**
 * Tiny share sheet — copy, email, SMS, share-as-image.
 * The image export renders the note's tile off-screen and either shares
 * via the Web Share API (mobile) or downloads a PNG (desktop).
 */
export default function ShareModal({ isOpen, onClose, note, isDark }) {
  const tileRef = useRef(null);
  if (!isOpen || !note) return null;
  const shareText = `${note.title}\n\n${note.content}`;
  const copyToClipboard = async () => {
    try { await navigator.clipboard.writeText(shareText); toast.success("Copied!"); }
    catch { toast.error("Failed"); }
  };
  const shareViaEmail = () => {
    window.open(`mailto:?subject=${encodeURIComponent(note.title || "Note")}&body=${encodeURIComponent(shareText)}`, "_blank");
  };
  const shareViaSMS = () => {
    window.open(`sms:?body=${encodeURIComponent(shareText)}`, "_blank");
  };
  const shareAsImage = async () => {
    const node = tileRef.current;
    if (!node) return;
    await shareNodeAsImage(node, `${(note.title || "note").replace(/[^\w-]+/g, "_")}.png`, note.title || "Iron Rabbit note");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={`max-w-xs ${isDark ? 'bg-[#0B1221] border-white/10' : 'bg-white border-gray-200'}`}>
        <DialogHeader>
          <DialogTitle className={`font-semibold flex items-center gap-2 text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>
            <Share2 className="w-4 h-4 text-indigo-500" /> Share
          </DialogTitle>
          <DialogDescription className="sr-only">Share this note via copy, email, SMS, or as a shareable image.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-4 gap-2">
          <button onClick={copyToClipboard}  className={`share-btn-sm ${isDark ? '' : 'light'}`} data-testid="share-copy"><Copy className="w-5 h-5" /><span className="text-xs">Copy</span></button>
          <button onClick={shareViaEmail}    className={`share-btn-sm ${isDark ? '' : 'light'}`} data-testid="share-email"><Mail className="w-5 h-5" /><span className="text-xs">Email</span></button>
          <button onClick={shareViaSMS}      className={`share-btn-sm ${isDark ? '' : 'light'}`} data-testid="share-sms"><MessageSquare className="w-5 h-5" /><span className="text-xs">SMS</span></button>
          <button onClick={shareAsImage}     className={`share-btn-sm ${isDark ? '' : 'light'}`} data-testid="share-image"><ImageIcon className="w-5 h-5" /><span className="text-xs">Image</span></button>
        </div>

        {/* Hidden render target for image export. Positioned off-screen so it
            doesn't affect layout but is still measurable by html-to-image. */}
        <div style={{ position: "fixed", top: -9999, left: -9999, width: 360, height: 360, pointerEvents: "none" }} aria-hidden="true">
          <div ref={tileRef} style={{ width: 360, height: 360 }}>
            <NoteTile note={note} onOpen={() => {}} onEdit={() => {}} isDark={true} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
