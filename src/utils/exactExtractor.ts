import { ExtractedStyles } from "./styleExtractor"

// Exclude properties that always differ or are noisy internal rendering properties
const excludedProps = new Set([
  'width', 'height', 'inline-size', 'block-size', 'perspective-origin', 'transform-origin',
  'd', 'x', 'y', 'cx', 'cy', 'rx', 'ry', 'r', // SVG path specific
])

const getDiffStyles = (element: Element, pseudo?: string): Record<string, string> => {
  if (!element.parentNode) return {}
  
  const dummy = document.createElement(element.tagName)
  
  // Clean dummy to ensure it only has default browser/inherited styles
  dummy.className = ''
  dummy.id = ''
  dummy.removeAttribute('style')
  
  // Insert quietly without triggering visual jumps (if possible)
  // To get real inherited computed styles, it must be in the DOM
  element.parentNode.appendChild(dummy)
  
  const computed = window.getComputedStyle(element, pseudo)
  const dummyComputed = window.getComputedStyle(dummy, pseudo)
  
  const diff: Record<string, string> = {}
  
  // Fast path: if content is empty or none on a pseudo-element, it doesn't exist
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
    
    // Only capture properties explicitly changed by the author's CSS (differ from dummy)
    if (val !== dummyVal) {
      diff[prop] = val
    }
  }
  
  // Handle dimensions separately since they are inherently different between elements,
  // we will manually add them if they were explicitly set in the stylesheet.
  // Actually, getComputedStyle resolves width/height to px regardless of CSS.
  // We'll rely on the visual inspector (CSS Peeper style) to show width/height, 
  // and omit them from the core CSS code block unless explicitly authored, which is hard to detect via diff.
  // For now, we omit width/height from the diff block to keep it purely stylistic CSS.

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
      try {
        if (!sheet.cssRules) continue;
      } catch (e) {
        continue; 
      }
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

export const extractExactStyles = (element: HTMLElement): ExtractedStyles => {
  const baseComputed = window.getComputedStyle(element)
  
  const elementStyles = getDiffStyles(element)
  const beforeStyles = getDiffStyles(element, '::before')
  const afterStyles = getDiffStyles(element, '::after')
  
  const result: ExtractedStyles = {
    element: elementStyles,
    computedFont: `${baseComputed.fontFamily} ${baseComputed.fontWeight} ${baseComputed.fontSize}`
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

  // To support CSS Peeper visual dimensions and typography, we explicitly attach full computed values 
  // for the sidepanel to parse visual specs (ignoring the diff).
  result.visualSpecs = {
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
    color: baseComputed.color,
    backgroundColor: baseComputed.backgroundColor,
    borderRadius: baseComputed.borderRadius,
    border: baseComputed.border
  }

  return result
}
