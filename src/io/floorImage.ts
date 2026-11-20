// Reads a picture of a floor plan and shrinks it so that it fits comfortably in a project file.
const MAX_SIDE = 2000;
const MAX_CHARS = 3_500_000;

export interface LoadedFloorImage {
  data: string;
  w: number;
  h: number;
}

function decode(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('This file is not a picture the browser can read (use PNG, JPEG or WebP).'));
    };
    img.src = url;
  });
}

/** Scale the picture down (JPEG on white) until it is at most 2000 px wide or tall and a few MB of text. */
export async function loadFloorImage(file: File): Promise<LoadedFloorImage> {
  if (!/^image\/(png|jpeg|webp|gif|bmp)$/.test(file.type)) throw new Error('Choose a PNG, JPEG or WebP picture of the floor plan.');
  const img = await decode(file);
  let scale = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
  for (let attempt = 0; attempt < 5; attempt++) {
    const w = Math.max(1, Math.round(img.naturalWidth * scale));
    const h = Math.max(1, Math.round(img.naturalHeight * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('The browser cannot process pictures here.');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    const data = canvas.toDataURL('image/jpeg', attempt ? 0.7 : 0.85);
    if (data.length <= MAX_CHARS) return { data, w, h };
    scale *= 0.75;
  }
  throw new Error('This picture is too large even after shrinking it.');
}
