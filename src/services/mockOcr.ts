import Tesseract from 'tesseract.js'

async function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  const objectUrl = URL.createObjectURL(file)

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const nextImage = new Image()
      nextImage.onload = () => resolve(nextImage)
      nextImage.onerror = () => reject(new Error('Could not decode screenshot.'))
      nextImage.src = objectUrl
    })

    return image
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

async function buildOcrCanvas(file: File): Promise<HTMLCanvasElement> {
  const image = await loadImageFromFile(file)
  const scale = 1.75
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale))
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale))

  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error('Could not prepare screenshot for OCR.')
  }

  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.drawImage(image, 0, 0, canvas.width, canvas.height)

  const snapshot = context.getImageData(0, 0, canvas.width, canvas.height)
  const pixels = snapshot.data

  for (let index = 0; index < pixels.length; index += 4) {
    const red = pixels[index] ?? 0
    const green = pixels[index + 1] ?? 0
    const blue = pixels[index + 2] ?? 0
    const luminance = red * 0.299 + green * 0.587 + blue * 0.114
    const contrasted = Math.max(0, Math.min(255, (luminance - 128) * 1.45 + 128))
    pixels[index] = contrasted
    pixels[index + 1] = contrasted
    pixels[index + 2] = contrasted
  }

  context.putImageData(snapshot, 0, 0)
  return canvas
}

function looksUseful(text: string): boolean {
  const normalized = text.toLowerCase()
  return /(rank|score|accuracy|percentile|attempted)/.test(normalized)
}

export async function extractMockTextFromImage(
  file: File,
  onProgress?: (value: number, status: string) => void,
): Promise<string> {
  const preparedCanvas = await buildOcrCanvas(file)

  const result = await Tesseract.recognize(preparedCanvas, 'eng', {
    logger: (message) => {
      if (typeof message.progress === 'number') {
        onProgress?.(message.progress, message.status)
      }
    },
  })

  if (looksUseful(result.data.text)) {
    return result.data.text
  }

  const fallback = await Tesseract.recognize(file, 'eng')
  return fallback.data.text
}
