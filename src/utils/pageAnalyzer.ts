// Utility to convert rgb/rgba strings to HEX
const rgbToHex = (rgb: string) => {
  const result = rgb.match(/^rgba?[\s+]?\([\s+]?(\d+)[\s+]?,[\s+]?(\d+)[\s+]?,[\s+]?(\d+)[\s+]?/i)
  if (result && result.length === 4) {
    return "#" +
      ("0" + parseInt(result[1], 10).toString(16)).slice(-2) +
      ("0" + parseInt(result[2], 10).toString(16)).slice(-2) +
      ("0" + parseInt(result[3], 10).toString(16)).slice(-2)
  }
  return rgb
}

export const extractAllFonts = (rootElement?: HTMLElement): string[] => {
  const elements = rootElement ? rootElement.querySelectorAll('*') : document.querySelectorAll('*')
  const fonts = new Set<string>()

  // If a root element is provided, we must also check the root element itself
  const elementsArray = Array.from(elements)
  if (rootElement) elementsArray.push(rootElement)

  elementsArray.forEach((el) => {
    // Skip extension UI
    if (el.tagName.toLowerCase().includes('plasmo') || el.id === 'plasmo-shadow-container') return;

    const computed = window.getComputedStyle(el)
    const fontFamily = computed.getPropertyValue('font-family')
    if (fontFamily) {
      const cleanFonts = fontFamily.split(',').map(f => f.trim().replace(/['"]/g, ''))
      if (cleanFonts.length > 0 && cleanFonts[0]) {
        fonts.add(cleanFonts[0]) 
      }
    }
  })

  return Array.from(fonts)
}

export const extractAllColors = (rootElement?: HTMLElement): string[] => {
  const elements = rootElement ? rootElement.querySelectorAll('*') : document.querySelectorAll('*')
  const colors = new Set<string>()

  const addColor = (colorString: string) => {
    if (!colorString || colorString === 'rgba(0, 0, 0, 0)' || colorString === 'transparent') return
    const hex = rgbToHex(colorString).toUpperCase()
    
    // Filter out bounding box colors and default browser link blue
    const ignoredColors = ['#2563EB', '#FF9800', '#4CAF50', '#0000EE', '#0000FF']
    if (ignoredColors.includes(hex)) return

    colors.add(hex)
  }

  const elementsArray = Array.from(elements)
  if (rootElement) elementsArray.push(rootElement)

  elementsArray.forEach((el) => {
    // Skip extension UI
    if (el.tagName.toLowerCase().includes('plasmo') || el.id === 'plasmo-shadow-container') return;

    const computed = window.getComputedStyle(el)
    addColor(computed.getPropertyValue('color'))
    addColor(computed.getPropertyValue('background-color'))
    
    if (computed.getPropertyValue('border-width') !== '0px') {
        addColor(computed.getPropertyValue('border-color'))
    }
  })

  return Array.from(colors)
}
