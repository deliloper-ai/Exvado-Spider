const turkishMap: Record<string, string> = {
  'ş': 's', 'Ş': 's',
  'ğ': 'g', 'Ğ': 'g',
  'ü': 'u', 'Ü': 'u',
  'ö': 'o', 'Ö': 'o',
  'ç': 'c', 'Ç': 'c',
  'ı': 'i', 'İ': 'i',
}

export function generateSlug(text: string): string {
  return text
    .replace(/[şŞğĞüÜöÖçÇıİ]/g, (char) => turkishMap[char] || char)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}
