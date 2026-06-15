export interface ExtractedStyles {
  element: Record<string, string>;
  before?: Record<string, string>;
  after?: Record<string, string>;
  keyframes?: string;
  computedFont: string;
  visualSpecs?: Record<string, string>;
}

// Exclude properties that always differ or are noisy internal rendering properties
const excludedProps = new Set([
  'width', 'height', 'inline-size', 'block-size', 'perspective-origin', 'transform-origin',
  'd', 'x', 'y', 'cx', 'cy', 'rx', 'ry', 'r', // SVG path specific
])

const getDiffStyles = (element: Element, pseudo?: string): Record<string, string> => {
  if (!element.parentNode) return {}
  
  const dummy = document.createElement(element.tagName)
  dummy.className = ''
  dummy.id = ''
  dummy.removeAttribute('style')
  
  element.parentNode.appendChild(dummy)
  
  const computed = window.getComputedStyle(element, pseudo)
  const dummyComputed = window.getComputedStyle(dummy, pseudo)
  
  const diff: Record<string, string> = {}
  
  if (pseudo && (!computed.content || computed.content === 'none' || computed.content === 'normal')) {
    element.parentNode.removeChild(dummy)
    return diff
  }

  for (let i = 0; i < computed.length; i++) {
    const prop = computed[i]
    if (prop.startsWith('-webkit-') || prop.startsWith('-moz-') || prop.startsWith('-ms-') || prop.startsWith('-o-')) continue
    if (excludedProps.has(prop)) continue
    
    const val = computed.getPropertyValue(prop)
    const dummyVal = dummyComputed.getPropertyValue(prop)
    
    if (val !== dummyVal) {
      diff[prop] = val
    }
  }
  
  element.parentNode.removeChild(dummy)
  return diff
}

const extractKeyframes = (animationName: string): string | undefined => {
  if (!animationName || animationName === 'none') return undefined;

  let keyframesRule = '';
  const names = animationName.split(',').map(n => n.trim());

  try {
    for (let i = 0; i < document.styleSheets.length; i++) {
      const sheet = document.styleSheets[i];
      try { if (!sheet.cssRules) continue; } catch (e) { continue; }
      for (let j = 0; j < sheet.cssRules.length; j++) {
        const rule = sheet.cssRules[j];
        if (rule.type === CSSRule.KEYFRAMES_RULE) {
          const kfRule = rule as CSSKeyframesRule;
          if (names.includes(kfRule.name)) {
            keyframesRule += kfRule.cssText + '\n\n';
          }
        }
      }
    }
  } catch (e) {}

  return keyframesRule.trim() || undefined;
}

export const extractStyles = (element: HTMLElement): ExtractedStyles => {
  const baseComputed = window.getComputedStyle(element)
  
  const elementStyles = getDiffStyles(element)
  const beforeStyles = getDiffStyles(element, '::before')
  const afterStyles = getDiffStyles(element, '::after')
  
  const rawColor = baseComputed.color;
  const sanitizeColor = (c: string) => {
    if (c === 'rgb(0, 0, 238)' || c === 'rgb(0, 0, 255)') return 'rgb(0, 0, 0)';
    return c;
  }

  const result: ExtractedStyles = {
    element: elementStyles,
    computedFont: `${baseComputed.fontFamily} ${baseComputed.fontWeight} ${baseComputed.fontSize}`,
    visualSpecs: {
      width: baseComputed.width,
      height: baseComputed.height,
      padding: baseComputed.padding,
      paddingTop: baseComputed.paddingTop,
      paddingRight: baseComputed.paddingRight,
      paddingBottom: baseComputed.paddingBottom,
      paddingLeft: baseComputed.paddingLeft,
      margin: baseComputed.margin,
      marginTop: baseComputed.marginTop,
      marginRight: baseComputed.marginRight,
      marginBottom: baseComputed.marginBottom,
      marginLeft: baseComputed.marginLeft,
      fontFamily: baseComputed.fontFamily,
      fontSize: baseComputed.fontSize,
      lineHeight: baseComputed.lineHeight,
      letterSpacing: baseComputed.letterSpacing,
      textAlign: baseComputed.textAlign,
      color: sanitizeColor(rawColor),
      backgroundColor: baseComputed.backgroundColor,
      borderRadius: baseComputed.borderRadius,
      border: baseComputed.border
    }
  }

  if (Object.keys(beforeStyles).length > 0) result.before = beforeStyles
  if (Object.keys(afterStyles).length > 0) result.after = afterStyles

  const allAnimations = [
    elementStyles['animation-name'],
    beforeStyles['animation-name'],
    afterStyles['animation-name']
  ].filter(Boolean).join(', ');

  if (allAnimations) {
    result.keyframes = extractKeyframes(allAnimations);
  }

  return result
}
