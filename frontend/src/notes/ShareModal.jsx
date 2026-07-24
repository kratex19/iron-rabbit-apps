import React from "react";
import { toast } from "sonner";
import { Share2, Copy, Mail, MessageSquare } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

/**
 * Tiny share sheet — copy, email, SMS.
 */
export default function ShareModal({ isOpen, onClose, note, isDark }) {
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={`max-w-xs ${isDark ? 'bg-[#0B1221] border-white/10' : 'bg-white border-gray-200'}`}>
        <DialogHeader>
          <DialogTitle className={`font-semibold flex items-center gap-2 text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>
            <Share2 className="w-4 h-4 text-indigo-500" /> Share
          </DialogTitle>
          <DialogDescription className="sr-only">Share this note via copy, email, or SMS.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-3 gap-2">
          <button onClick={copyToClipboard}  className={`share-btn-sm ${isDark ? '' : 'light'}`}><Copy className="w-5 h-5" /><span className="text-xs">Copy</span></button>
          <button onClick={shareViaEmail}    className={`share-btn-sm ${isDark ? '' : 'light'}`}><Mail className="w-5 h-5" /><span className="text-xs">Email</span></button>
          <button onClick={shareViaSMS}      className={`share-btn-sm ${isDark ? '' : 'light'}`}><MessageSquare className="w-5 h-5" /><span className="text-xs">SMS</span></button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
