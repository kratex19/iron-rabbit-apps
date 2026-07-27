# Image Testing Rules (for OCR / vision integrations)

- Always use base64-encoded images for tests.
- Accepted formats: JPEG, PNG, WEBP only. No SVG/BMP/HEIC.
- Every test image must contain real visual features — do not use blank/solid-color images.
- If an animated image is provided (GIF/APNG/animated WEBP), extract the first frame only.
- Resize large images to reasonable bounds (max 4 MB per request suggested).
- Always re-detect MIME after any transcoding/compression.

## Endpoint under test: POST /api/ocr

Payload:
```json
{
  "image_base64": "<pure base64, no data: prefix>",
  "mime_type": "image/png"
}
```

Response:
```json
{ "extracted_text": "..." }
```

- Empty base64 → 400
- Unsupported mime → 400
- Payload > ~5 MB → 413
