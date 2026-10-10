# public/models/

Development-time drop point for ONNX weights (served as static assets by Vite).

In production builds this directory stays empty: models are downloaded on
first use into the app data directory so the installer remains under 150 MB.
See `models/README.md` at the repository root for the full manifest.
