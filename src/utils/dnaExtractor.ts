export interface WebsiteDNA {
  spacing: string[];
  radii: string[];
  shadows: string[];
  fontSizes: string[];
}

const getFrequencyMap = (values: string[]): Map<string, number> => {
  const map = new Map<string, number>()
  values.forEach(val => {
    if (!val || val === 'none' || val === '0px' || val === 'transparent' || val === 'auto') return
    map.set(val, (map.get(val) || 0) + 1)
  })
  return map
}

const getTopValues = (map: Map<string, number>, limit: number = 6, numericSort: boolean = true): string[] => {
  const top = Array.from(map.entries())
    .sort((a, b) => b[1] - a[1]) // Sort by frequency descending
    .slice(0, limit)
    .map(entry => entry[0])
    
  if (numericSort) {
    return top.sort((a, b) => parseFloat(a) - parseFloat(b))
  }
  return top
}

export const extractDNA = (): WebsiteDNA => {
  const elements = document.querySelectorAll('*')
  
  const allSpacing: string[] = []
  const allRadii: string[] = []
  const allShadows: string[] = []
  const allFontSizes: string[] = []

  elements.forEach((el) => {
    if (el.tagName.toLowerCase().includes('plasmo') || el.id === 'plasmo-shadow-container') return
    
    try {
      const computed = window.getComputedStyle(el)
      
      // Spacing (Paddings and Margins)
      const spaces = [computed.paddingTop, computed.paddingRight, computed.paddingBottom, computed.paddingLeft,
                      computed.marginTop, computed.marginRight, computed.marginBottom, computed.marginLeft]
      spaces.forEach(s => {
        const val = parseFloat(s)
        // Only include standard spacing scale (ignore 1px borders masquerading as margins, etc)
        // Common design systems use multiples of 2 or 4. We filter out values < 4px.
        if (!isNaN(val) && val >= 4) {
          allSpacing.push(`${Math.round(val)}px`)
        }
      })
      
      // Border Radius
      if (computed.borderRadius && computed.borderRadius !== '0px') {
        const radiusVals = computed.borderRadius.split(' ')
        // Get the primary radius value
        const primaryRadius = parseFloat(radiusVals[0])
        if (!isNaN(primaryRadius) && primaryRadius > 0) {
          // Normalize massive radii (pills/circles) to 9999px (full)
          if (primaryRadius > 40) {
            allRadii.push('9999px')
          } else {
            allRadii.push(`${Math.round(primaryRadius)}px`)
          }
        }
      }
      
      // Box Shadow
      if (computed.boxShadow && computed.boxShadow !== 'none') {
        allShadows.push(computed.boxShadow)
      }
      
      // Font Sizes
      if (computed.fontSize) {
        const size = parseFloat(computed.fontSize)
        if (!isNaN(size) && size >= 8) {
          allFontSizes.push(`${Math.round(size)}px`)
        }
      }
    } catch (e) {}
  })

  return {
    spacing: getTopValues(getFrequencyMap(allSpacing), 8, true),
    radii: getTopValues(getFrequencyMap(allRadii), 5, true),
    shadows: getTopValues(getFrequencyMap(allShadows), 4, false), // Shadows cannot be sorted numerically
    fontSizes: getTopValues(getFrequencyMap(allFontSizes), 6, true)
  }
}

