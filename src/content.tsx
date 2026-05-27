import cssText from "data-text:~style.css"
import type { PlasmoCSConfig } from "plasmo"
import { extractStyles } from "./utils/styleExtractor"
import { useEffect, useState } from "react"
import { extractAllFonts, extractAllColors } from "./utils/pageAnalyzer"
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

  useEffect(() => {
    // Initial check
    chrome.storage.sync.get(["inspectorActive"], (result) => {
      setIsActive(result.inspectorActive || false)
      if (result.inspectorActive) performPageAnalysis()
    })

    // Listen for toggle
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
    chrome.runtime.onMessage.addListener(messageListener)

    return () => {
      chrome.runtime.onMessage.removeListener(messageListener)
    }
  }, [])

  const performPageAnalysis = () => {
    // Run analysis and save to storage
    const pageFonts = extractAllFonts()
    const pageColors = extractAllColors()
    chrome.storage.local.set({
      pageFonts,
      pageColors
    })
  }

  useEffect(() => {
    if (!isActive) return

    const handleMouseMove = (e: MouseEvent) => {
      if (selectedElement) return // Don't change hover if something is selected
      
      // Ignore extension's own UI
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
        }
        return
      }

      e.preventDefault()
      e.stopPropagation()
      
      const target = e.target as HTMLElement
      if (target.closest('#plasmo-shadow-container')) return

      setSelectedElement(target)
      setStyles(extractStyles(target))
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

  // Calculate overlay position based on hovered or selected element
  const targetElement = selectedElement || hoveredElement
  const rect = targetElement?.getBoundingClientRect()

  // Fix SVG / non-string class names
  const getClassName = (el: HTMLElement) => {
    if (!el.className) return ''
    if (typeof el.className === 'string') return `.${el.className.split(' ')[0]}`
    if (el.className.baseVal) return `.${el.className.baseVal.split(' ')[0]}`
    return ''
  }

  const tagName = targetElement?.tagName?.toLowerCase() || ''
  const idName = targetElement?.id ? `#${targetElement.id}` : ''
  const clsName = targetElement ? getClassName(targetElement) : ''

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

  return (
    <div className="pixinspect-root font-sans">
      {/* Highlight Overlay */}
      {rect && targetElement && (
        <div
          style={{
            position: "fixed",
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
            backgroundColor: "rgba(37, 99, 235, 0.1)", // primary color with opacity
            border: "2px solid #2563eb",
            pointerEvents: "none",
            zIndex: 2147483640,
            boxSizing: "border-box",
            borderRadius: window.getComputedStyle(targetElement).borderRadius,
          }}
        >
          {/* Dimensions Label */}
          <div className="absolute -top-6 left-0 bg-primary text-white text-xs px-2 py-0.5 rounded font-mono whitespace-nowrap shadow-sm">
            {tagName} {idName} {clsName} | {Math.round(rect.width)} × {Math.round(rect.height)}
          </div>
        </div>
      )}
    </div>
  )
}
