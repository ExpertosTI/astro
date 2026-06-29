const MAX_DIMENSION = 1280;
const TARGET_MAX_CHARS = 520_000;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("No se pudo leer la imagen. Prueba JPG o PNG."));
    img.src = src;
  });
}

function fitDimensions(w: number, h: number, max: number) {
  if (w <= max && h <= max) return { width: w, height: h };
  const ratio = Math.min(max / w, max / h);
  return {
    width: Math.round(w * ratio),
    height: Math.round(h * ratio),
  };
}

function canvasToJpeg(canvas: HTMLCanvasElement, quality: number): string {
  return canvas.toDataURL("image/jpeg", quality);
}

function renderToCanvas(img: HTMLImageElement, maxDim: number): HTMLCanvasElement {
  const { width, height } = fitDimensions(img.naturalWidth, img.naturalHeight, maxDim);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas no disponible");
  ctx.fillStyle = "#0a0505";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);
  return canvas;
}

/**
 * Comprime y normaliza cualquier imagen decodificable del navegador a JPEG optimizado.
 */
export async function processImageFile(file: File): Promise<string> {
  if (!file.size) throw new Error("Archivo vacío");

  const maxInput = 25 * 1024 * 1024;
  if (file.size > maxInput) {
    throw new Error("Imagen muy grande. Máximo 25MB — la comprimiremos automáticamente.");
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await loadImage(objectUrl);
    let maxDim = MAX_DIMENSION;
    let canvas = renderToCanvas(img, maxDim);

    const qualities = [0.9, 0.82, 0.72, 0.62, 0.5];
    for (let attempt = 0; attempt < 6; attempt += 1) {
      for (const q of qualities) {
        const dataUrl = canvasToJpeg(canvas, q);
        if (dataUrl.length <= TARGET_MAX_CHARS) return dataUrl;
      }
      maxDim = Math.round(maxDim * 0.75);
      canvas = renderToCanvas(img, maxDim);
    }

    const fallback = canvasToJpeg(canvas, 0.4);
    if (fallback.length > TARGET_MAX_CHARS * 1.2) {
      throw new Error("No pudimos optimizar la imagen. Prueba otra foto.");
    }
    return fallback;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export function isLikelyImageFile(file: File): boolean {
  if (file.type.startsWith("image/")) return true;
  return /\.(jpe?g|png|gif|webp|bmp|heic|heif|avif)$/i.test(file.name);
}
