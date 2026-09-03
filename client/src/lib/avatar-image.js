const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_INPUT_BYTES = 5 * 1024 * 1024;
const MAX_DATA_URL_LENGTH = 75000;
const OUTPUT_SIZE = 256;

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("We couldn't read that image. Try another file."));
    };
    image.src = url;
  });
}

export async function prepareAvatarImage(file) {
  if (!file) return null;
  if (!ACCEPTED_TYPES.has(file.type))
    throw new Error("Choose a JPEG, PNG, or WebP image.");
  if (file.size > MAX_INPUT_BYTES)
    throw new Error("Choose an image smaller than 5 MB.");

  const image = await loadImage(file);
  const size = Math.min(image.naturalWidth, image.naturalHeight);
  const canvas = document.createElement("canvas");
  canvas.width = OUTPUT_SIZE;
  canvas.height = OUTPUT_SIZE;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Image processing is unavailable.");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
  context.drawImage(
    image,
    (image.naturalWidth - size) / 2,
    (image.naturalHeight - size) / 2,
    size,
    size,
    0,
    0,
    OUTPUT_SIZE,
    OUTPUT_SIZE,
  );

  for (const quality of [0.82, 0.72, 0.62, 0.52]) {
    const value = canvas.toDataURL("image/jpeg", quality);
    if (value.length <= MAX_DATA_URL_LENGTH) return value;
  }
  throw new Error(
    "This image could not be compressed enough. Try another one.",
  );
}
