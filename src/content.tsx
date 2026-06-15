import cssText from "data-text:~style.css"
import type { PlasmoCSConfig } from "plasmo"
import { extractStyles } from "./utils/styleExtractor"
import { useEffect, useState } from "react"
import { extractAllFonts, extractAllColors } from "./utils/pageAnalyzer"
import { extractAllAssets } from "./utils/assetExtractor"
import { extractDNA } from "./utils/dnaExtractor"

export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"],
  all_frames: true
}

export const getStyle = () => {
  const style = document.createElement("style")
  style.textContent = cssText
  return style
}

export default function Content() {
  const [isActive, setIsActive] = useState(false)
  const [hoveredElement, setHoveredElement] = useState<HTMLElement | null>(null)
  const [selectedElement, setSelectedElement] = useState<HTMLElement | null>(null)
  const [styles, setStyles] = useState<any>(null)
  const [scrollUpdate, setScrollUpdate] = useState(0)

  const performPageAnalysis = (el?: HTMLElement | null) => {
    try {
      const pageFonts = extractAllFonts(el || undefined)
      const pageColors = extractAllColors(el || undefined)
      const pageAssets = extractAllAssets() 
      const pageDna = extractDNA()
      
      chrome.storage.local.set({
        pageFonts,
        pageColors,
        pageAssets,
        pageDna
      })
    } catch (err) {
      console.warn("PixInspect: Extension context invalidated, please refresh the page.")
    }
  }

  useEffect(() => {
    try {
      chrome.storage.sync.get(["inspectorActive"], (result) => {
        setIsActive(result.inspectorActive || false)
        if (result.inspectorActive) performPageAnalysis()
      })
    } catch (err) {
      console.warn("PixInspect: Extension context invalidated, please refresh the page.")
      return;
    }

    const messageListener = (msg: any) => {
      if (msg.action === "TOGGLE_INSPECTOR") {
        setIsActive(msg.state)
        if (msg.state) {
          performPageAnalysis()
        } else {
          setHoveredElement(null)
          setSelectedElement(null)
        }
      }
    }
    
    try {
      chrome.runtime.onMessage.addListener(messageListener)
    } catch (e) {}

    return () => {
      try {
        chrome.runtime.onMessage.removeListener(messageListener)
      } catch (e) {}
    }
  }, [])

  useEffect(() => {
    if (!isActive) return

    const handleMouseMove = (e: MouseEvent) => {
      if (selectedElement) return // Don't change hover if something is selected
      
      const target = e.target as HTMLElement
      if (target.closest('#plasmo-shadow-container')) return

      setHoveredElement(target)
    }

    const handleClick = (e: MouseEvent) => {
      if (selectedElement) {
        // Click outside to deselect
        const target = e.target as HTMLElement
        if (!target.closest('#plasmo-shadow-container')) {
          setSelectedElement(null)
          performPageAnalysis(null) // Revert to full page
        }
        return
      }

      e.preventDefault()
      e.stopPropagation()
      
      const target = e.target as HTMLElement
      if (target.closest('#plasmo-shadow-container')) return

      setSelectedElement(target)
      setStyles(extractStyles(target))
      performPageAnalysis(target) // Context-aware extraction
    }

    const handleScroll = () => {
      setScrollUpdate(prev => prev + 1)
    }

    window.addEventListener("mousemove", handleMouseMove)
    window.addEventListener("click", handleClick, true) // use capture phase to prevent default actions
    window.addEventListener("scroll", handleScroll, true) // capture phase for nested scrollable elements
    window.addEventListener("resize", handleScroll)

    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("click", handleClick, true)
      window.removeEventListener("scroll", handleScroll, true)
      window.removeEventListener("resize", handleScroll)
    }
  }, [isActive, selectedElement])

  // Fix SVG / non-string class names
  const getClassName = (el: HTMLElement) => {
    if (!el.className) return ''
    if (typeof el.className === 'string') return `.${el.className.split(' ')[0]}`
    if (el.className.baseVal) return `.${el.className.baseVal.split(' ')[0]}`
    return ''
  }

  // When selected, save to storage
  useEffect(() => {
    if (selectedElement && styles) {
      chrome.storage.local.set({
        selectedStyles: styles,
        selectedHTML: selectedElement.outerHTML
      })
    }
  }, [selectedElement, styles])

  if (!isActive) return null

  const targetElement = selectedElement || hoveredElement
  if (!targetElement) return null

  const rect = targetElement.getBoundingClientRect()
  const computed = window.getComputedStyle(targetElement)
  
  const parsePx = (val: string) => parseFloat(val) || 0
  
  const mt = parsePx(computed.marginTop)
  const mr = parsePx(computed.marginRight)
  const mb = parsePx(computed.marginBottom)
  const ml = parsePx(computed.marginLeft)
  
  const pt = parsePx(computed.paddingTop)
  const pr = parsePx(computed.paddingRight)
  const pb = parsePx(computed.paddingBottom)
  const pl = parsePx(computed.paddingLeft)

  const tagName = targetElement.tagName?.toLowerCase() || ''
  const idName = targetElement.id ? `#${targetElement.id}` : ''
  const clsName = getClassName(targetElement)

  return (
    <div className="pixinspect-root font-sans">
      <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 2147483640 }}>
        {/* Margin Overlay (Orange Border) */}
        {(!selectedElement) && (mt > 0 || mr > 0 || mb > 0 || ml > 0) && (
          <div style={{
            position: "absolute",
            top: rect.top - mt, left: rect.left - ml,
            width: rect.width + ml + mr, height: rect.height + mt + mb,
            borderTop: `${mt}px solid rgba(255, 152, 0, 0.4)`,
            borderRight: `${mr}px solid rgba(255, 152, 0, 0.4)`,
            borderBottom: `${mb}px solid rgba(255, 152, 0, 0.4)`,
            borderLeft: `${ml}px solid rgba(255, 152, 0, 0.4)`,
            boxSizing: "border-box"
          }} />
        )}
        
        {/* Padding Overlay (Green Border) */}
        {(!selectedElement) && (pt > 0 || pr > 0 || pb > 0 || pl > 0) && (
          <div style={{
            position: "absolute",
            top: rect.top, left: rect.left,
            width: rect.width, height: rect.height,
            borderTop: `${pt}px solid rgba(76, 175, 80, 0.4)`,
            borderRight: `${pr}px solid rgba(76, 175, 80, 0.4)`,
            borderBottom: `${pb}px solid rgba(76, 175, 80, 0.4)`,
            borderLeft: `${pl}px solid rgba(76, 175, 80, 0.4)`,
            boxSizing: "border-box"
          }} />
        )}

        {/* Content Overlay (Blue Background) */}
        {(!selectedElement) && (
          <div style={{
            position: "absolute",
            top: rect.top + pt, left: rect.left + pl,
            width: Math.max(0, rect.width - pl - pr), height: Math.max(0, rect.height - pt - pb),
            backgroundColor: "rgba(37, 99, 235, 0.4)",
            boxSizing: "border-box"
          }} />
        )}

        {/* Final Outer Boundary for Selected Element */}
        {selectedElement && (
           <div style={{
             position: "absolute",
             top: rect.top, left: rect.left,
             width: rect.width, height: rect.height,
             border: "2px solid #2563eb",
             backgroundColor: "rgba(37, 99, 235, 0.1)",
             boxSizing: "border-box",
             borderRadius: computed.borderRadius
           }} />
        )}

        {/* Dimensions Label (Attached to Top Left of Rect) */}
        <div style={{
          position: "absolute",
          top: Math.max(0, rect.top - 24),
          left: rect.left,
        }} className="bg-primary text-white text-[11px] px-2 py-1 rounded font-mono shadow-sm z-50 whitespace-nowrap">
          {tagName} <span className="text-white/60">{idName}{clsName}</span> | {Math.round(rect.width)} × {Math.round(rect.height)}
        </div>
      </div>
    </div>
  )
}
