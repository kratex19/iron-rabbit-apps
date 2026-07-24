// Export a single note tile as a PNG image and either trigger a download
// or use the native share sheet (mobile). Uses html-to-image (no external service).
import { toPng } from "html-to-image";
import { saveAs } from "file-saver";
import { toast } from "sonner";

/**
 * Render the given DOM node to a PNG and either share via Web Share API
 * (if available) or save it as a download.
 * @param {HTMLElement} node
 * @param {string} filename
 * @param {string} title  Optional caption for Web Share.
 */
export async function shareNodeAsImage(node, filename = "iron-rabbit-tile.png", title = "Iron Rabbit") {
  if (!node) return;
  try {
    const dataUrl = await toPng(node, {
      pixelRatio: 2,
      cacheBust: true,
      backgroundColor: "#0B1221",
    });
    // Try native share first
    if (navigator.canShare && navigator.share) {
      try {
        const blob = await (await fetch(dataUrl)).blob();
        const file = new File([blob], filename, { type: "image/png" });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title, text: title });
          return;
        }
      } catch { /* fall through to download */ }
    }
    // Fallback: download
    const blob = await (await fetch(dataUrl)).blob();
    saveAs(blob, filename);
    toast.success("Image saved");
  } catch (err) {
    console.error("Share image error:", err);
    toast.error("Could not create image");
  }
}
