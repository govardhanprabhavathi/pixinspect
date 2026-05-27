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

export const extractAllFonts = (): string[] => {
  const elements = document.querySelectorAll('*')
  const fonts = new Set<string>()

  elements.forEach((el) => {
    const computed = window.getComputedStyle(el)
    const fontFamily = computed.getPropertyValue('font-family')
    if (fontFamily) {
      // Clean up the font string (remove quotes)
      const cleanFonts = fontFamily.split(',').map(f => f.trim().replace(/['"]/g, ''))
      if (cleanFonts.length > 0 && cleanFonts[0]) {
        fonts.add(cleanFonts[0]) // Add primary font in stack
      }
    }
  })

  return Array.from(fonts)
}

export const extractAllColors = (): string[] => {
  const elements = document.querySelectorAll('*')
  const colors = new Set<string>()

  const addColor = (colorString: string) => {
    // Ignore transparent and basic colors
    if (!colorString || colorString === 'rgba(0, 0, 0, 0)' || colorString === 'transparent') return
    
    // Convert to HEX for consistency
    const hex = rgbToHex(colorString).toUpperCase()
    colors.add(hex)
  }

  elements.forEach((el) => {
    const computed = window.getComputedStyle(el)
    addColor(computed.getPropertyValue('color'))
    addColor(computed.getPropertyValue('background-color'))
    
    // Check borders
    if (computed.getPropertyValue('border-width') !== '0px') {
        addColor(computed.getPropertyValue('border-color'))
    }
  })

  return Array.from(colors)
}
