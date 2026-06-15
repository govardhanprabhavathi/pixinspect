export const convertToTailwind = (styles: Record<string, string>, prefix = '') => {
  const classes: string[] = []

  const add = (cls: string) => classes.push(`${prefix}${cls}`)

  // Helpers
  const pxToTw = (pxStr: string, pfx: string) => {
    const match = pxStr.match(/(\d+)px/)
    if (match) {
      const val = parseInt(match[1], 10)
      const twVal = val / 4
      if (Number.isInteger(twVal)) {
        add(`${pfx}-${twVal}`)
        return true
      }
    }
    return false
  }

  for (const [prop, value] of Object.entries(styles)) {
    // Skip if empty or default
    if (!value || value === 'none' || value === 'normal' || value === 'auto') continue;

    // Display
    if (prop === 'display') {
      if (value === 'flex' || value === 'grid' || value === 'block' || value === 'inline-block' || value === 'hidden') {
        add(value === 'hidden' ? 'hidden' : value)
      } else {
        add(`[display:${value}]`)
      }
      continue;
    }

    // Flex/Grid basic
    if (prop === 'flex-direction') {
      if (value === 'column') add('flex-col')
      else if (value === 'row') add('flex-row')
      else add(`flex-${value}`)
      continue;
    }

    if (prop === 'justify-content') {
      const v = value.replace('flex-', '')
      add(`justify-${v}`)
      continue;
    }

    if (prop === 'align-items') {
      const v = value.replace('flex-', '')
      add(`items-${v}`)
      continue;
    }

    // Spacing
    if (prop === 'padding' && pxToTw(value, 'p')) continue;
    if (prop === 'margin' && pxToTw(value, 'm')) continue;
    if (prop === 'gap' && pxToTw(value, 'gap')) continue;

    // Fonts
    if (prop === 'font-weight') {
      const weightMap: Record<string, string> = { '400': 'normal', '500': 'medium', '600': 'semibold', '700': 'bold', '800': 'extrabold', '900': 'black' }
      if (weightMap[value]) add(`font-${weightMap[value]}`)
      else if (value === 'bold' || value === 'normal') add(`font-${value}`)
      else add(`font-[${value}]`)
      continue;
    }

    if (prop === 'border-radius') {
      if (value === '9999px' || value === '50%') add('rounded-full')
      else if (value === '8px') add('rounded-lg')
      else if (value === '4px') add('rounded')
      else add(`rounded-[${value.replace(/\s+/g, '_')}]`)
      continue;
    }

    // Standard mappings
    if (prop === 'background-color') {
      if (value !== 'rgba(0, 0, 0, 0)') add(`bg-[${value.replace(/\s+/g, '')}]`)
      continue;
    }
    if (prop === 'color') {
      add(`text-[${value.replace(/\s+/g, '')}]`)
      continue;
    }

    // Arbitrary value fallback for advanced CSS (animations, transform, clip-path, filter, content)
    // Replace spaces inside values with underscores for Tailwind arbitrary value compatibility
    const safeValue = value.replace(/ /g, '_')
    add(`[${prop}:${safeValue}]`)
  }

  return classes.join(' ')
}
