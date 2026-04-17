export async function extractMockTextFromImage(
  file: File,
  onProgress?: (value: number, status: string) => void,
): Promise<string> {
  const { default: Tesseract } = await import('tesseract.js')
  const result = await Tesseract.recognize(file, 'eng', {
    logger: (message) => {
      if (typeof message.progress === 'number') {
        onProgress?.(message.progress, message.status)
      }
    },
  })

  return result.data.text
}
