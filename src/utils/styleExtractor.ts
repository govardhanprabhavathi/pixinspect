export const extractStyles = (element: HTMLElement) => {
  const computed = window.getComputedStyle(element)
  
  // Basic properties to extract
  const relevantProps = [
    'display', 'flex-direction', 'justify-content', 'align-items', 'gap',
    'margin', 'padding', 
    'width', 'height', 'max-width', 'min-width',
    'color', 'background-color', 'background-image',
    'font-family', 'font-size', 'font-weight', 'line-height', 'letter-spacing',
    'border', 'border-radius', 'box-shadow', 'opacity', 'transition'
  ]

  const styles: Record<string, string> = {}
  relevantProps.forEach(prop => {
    const value = computed.getPropertyValue(prop)
    // Only include if it's not the default empty or 'none' (mostly)
    // Actually, sometimes 'none' or '0px' is important, but we filter some noise
    if (value && value !== 'none' && value !== '0px' && value !== 'normal' && value !== 'rgba(0, 0, 0, 0)') {
      styles[prop] = value
    }
  })
  
  // Specific fallbacks to make it cleaner
  if (computed.display !== 'flex' && computed.display !== 'grid') {
    delete styles['flex-direction']
    delete styles['justify-content']
    delete styles['align-items']
    delete styles['gap']
  }

  return {
    rawCss: styles,
    computedColor: computed.color,
    computedBg: computed.backgroundColor,
    computedFont: `${computed.fontFamily} ${computed.fontWeight} ${computed.fontSize}`
  }
}
