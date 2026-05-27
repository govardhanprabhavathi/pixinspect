export const convertToTailwind = (styles: Record<string, string>) => {
  const classes: string[] = []

  // Very basic heuristics for MVP
  if (styles.display === 'flex') classes.push('flex')
  if (styles.display === 'grid') classes.push('grid')
  
  if (styles['flex-direction'] === 'column') classes.push('flex-col')
  if (styles['flex-direction'] === 'row') classes.push('flex-row')

  if (styles['justify-content'] === 'center') classes.push('justify-center')
  if (styles['justify-content'] === 'space-between') classes.push('justify-between')
  
  if (styles['align-items'] === 'center') classes.push('items-center')

  if (styles['font-weight'] === '700' || styles['font-weight'] === 'bold') classes.push('font-bold')
  if (styles['font-weight'] === '600') classes.push('font-semibold')
  if (styles['font-weight'] === '500') classes.push('font-medium')

  // We can add a generic converter for padding and margin based on 4px increments
  const pxToTw = (pxStr: string, prefix: string) => {
    const match = pxStr.match(/(\d+)px/)
    if (match) {
      const val = parseInt(match[1], 10)
      const twVal = val / 4
      if (Number.isInteger(twVal)) {
        classes.push(`${prefix}-${twVal}`)
      } else {
        classes.push(`${prefix}-[${pxStr}]`)
      }
    }
  }

  if (styles['padding']) {
    // simplified, assumes uniform padding
    pxToTw(styles['padding'], 'p')
  }
  if (styles['margin']) {
    pxToTw(styles['margin'], 'm')
  }
  if (styles['border-radius']) {
    const radius = styles['border-radius']
    if (radius === '9999px' || radius === '50%') classes.push('rounded-full')
    else if (radius === '8px') classes.push('rounded-lg')
    else if (radius === '4px') classes.push('rounded')
    else classes.push(`rounded-[${radius}]`)
  }

  if (styles['background-color']) {
     // rgb to hex converter logic could go here, or arbitrary values
     const bg = styles['background-color']
     if (bg !== 'rgba(0, 0, 0, 0)') {
       classes.push(`bg-[${bg.replace(/\s/g, '')}]`)
     }
  }

  if (styles['color']) {
    const color = styles['color']
    classes.push(`text-[${color.replace(/\s/g, '')}]`)
  }

  return classes.join(' ')
}
