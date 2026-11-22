/**
 * 12 haneli random barkod üretir (eski projedeki generateRandomBarcode mantığı).
 * EAN-13 değil — basit numeric string.
 */
export function generateBarcode(): string {
  let barcode = ''
  for (let i = 0; i < 12; i++) {
    barcode += Math.floor(Math.random() * 10)
  }
  return barcode
}
