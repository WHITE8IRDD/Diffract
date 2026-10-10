# models/ — local AI weights (not in Git)

Diffract runs every AI feature **locally** on the user's GPU via ONNX Runtime
Web. Model weights are **never bundled** with the installer (the install-size
budget is 150 MB) and are **never committed** to this repository (see
`.gitignore`).

On first use of an AI feature, Diffract downloads the required model from the
project's model registry into the app data directory (`%APPDATA%/diffract/models`
on Windows) and loads it fully offline from then on.

| Model | Task | Phase | ~Size |
| --- | --- | --- | --- |
| `birefnet-matting.onnx` | Background removal | 3 | 82 MB |
| `sam-vit-b-encoder.onnx` + decoder | Object selection / Select Subject | 3 | 180 MB |
| `sd15-inpaint.onnx` | Generative fill | 3 | 1.7 GB |
| `realesrgan-x4.onnx` | AI upscale ×2/×4 | 3 | 67 MB |
| `style-transfer.onnx` | Artistic styles | 3 | 24 MB |
| `sky-seg.onnx` | Sky detection / replacement | 3 | 45 MB |

Declarations live in `src/ai/ModelRegistry.ts`; the session/download manager is
`src/ai/OnnxSession.ts`.
