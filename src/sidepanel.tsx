import { useState, useEffect } from "react"
import { Power, Settings, Zap, Copy, Wand2, Code2, Type, Palette, MousePointer2 } from "lucide-react"
import { convertToTailwind } from "./utils/tailwindConverter"
import "./style.css"

type Tab = "inspector" | "typography" | "palette"

export default function SidePanel() {
  const [isActive, setIsActive] = useState(false)
  const [styles, setStyles] = useState<any>(null)
  const [outerHTML, setOuterHTML] = useState<string>("")
  
  // Page Analysis State
  const [pageFonts, setPageFonts] = useState<string[]>([])
  const [pageColors, setPageColors] = useState<string[]>([])
  
  const [aiLoading, setAiLoading] = useState(false)
  const [aiResponse, setAiResponse] = useState<string | null>(null)
  
  const [activeTab, setActiveTab] = useState<Tab>("inspector")

  useEffect(() => {
    // Get initial state
    chrome.storage.sync.get(["inspectorActive"], (result) => {
      setIsActive(result.inspectorActive || false)
    })
    chrome.storage.local.get(["selectedStyles", "selectedHTML", "pageFonts", "pageColors"], (result) => {
      if (result.selectedStyles) setStyles(result.selectedStyles)
      if (result.selectedHTML) setOuterHTML(result.selectedHTML)
      if (result.pageFonts) setPageFonts(result.pageFonts)
      if (result.pageColors) setPageColors(result.pageColors)
    })

    // Listen for changes
    const handleStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }, areaName: string) => {
      if (areaName === "sync" && changes.inspectorActive) {
        setIsActive(changes.inspectorActive.newValue)
      }
      if (areaName === "local") {
        if (changes.selectedStyles) {
          setStyles(changes.selectedStyles.newValue)
          setAiResponse(null) // clear old AI response on new selection
          setActiveTab("inspector") // auto-switch back to inspector on click
        }
        if (changes.selectedHTML) setOuterHTML(changes.selectedHTML.newValue)
        if (changes.pageFonts) setPageFonts(changes.pageFonts.newValue)
        if (changes.pageColors) setPageColors(changes.pageColors.newValue)
      }
    }
    chrome.storage.onChanged.addListener(handleStorageChange)

    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange)
    }
  }, [])

  const toggleInspector = () => {
    const newState = !isActive
    setIsActive(newState)
    chrome.storage.sync.set({ inspectorActive: newState })
    
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0].id) {
        chrome.tabs.sendMessage(tabs[0].id, { action: "TOGGLE_INSPECTOR", state: newState }).catch(() => {})
      }
    })

    if (!newState) {
      setStyles(null)
      setOuterHTML("")
      chrome.storage.local.remove(["selectedStyles", "selectedHTML"])
    }
  }

  const openOptions = () => chrome.runtime.openOptionsPage()

  const handleAiAction = (action: "EXPLAIN_UI" | "GENERATE_REACT") => {
    if (!styles || !outerHTML) return
    setAiLoading(true)
    setAiResponse(null)

    chrome.runtime.sendMessage(
      { action, html: outerHTML, styles: styles.rawCss || styles },
      (response) => {
        setAiLoading(false)
        if (chrome.runtime.lastError) {
          setAiResponse(`Error: ${chrome.runtime.lastError.message}`)
        } else if (response?.error) {
          setAiResponse(`Error: ${response.error}`)
        } else if (response?.result) {
          setAiResponse(response.result)
        } else {
          setAiResponse("Unknown error occurred.")
        }
      }
    )
  }

  const copyToClipboard = (text: string) => navigator.clipboard.writeText(text)

  const copyFonts = () => {
    const fontCss = pageFonts.map((f, i) => `--font-${i + 1}: ${f};`).join('\n')
    copyToClipboard(`:root {\n${fontCss}\n}`)
  }

  const copyColors = () => {
    const colorCss = pageColors.map((c, i) => `--color-${i + 1}: ${c};`).join('\n')
    copyToClipboard(`:root {\n${colorCss}\n}`)
  }

  const tailwindClasses = styles ? convertToTailwind(styles.rawCss || styles) : ""

  return (
    <div className="min-h-screen bg-cream-200 text-primary flex flex-col font-sans p-4">
      {/* Header section */}
      <div className="bg-cream-50 rounded-[24px] shadow-sm border border-cream-300 p-5 mb-4">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary text-cream-50 rounded-2xl flex items-center justify-center shadow-md">
              <Zap className="w-5 h-5 fill-current" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-primary">PixInspect</h1>
            </div>
          </div>
          <button onClick={openOptions} className="p-2 text-primary/40 hover:text-primary transition-colors bg-cream-100 hover:bg-cream-300 rounded-full">
             <Settings className="w-5 h-5" />
          </button>
        </div>

        <button
          onClick={toggleInspector}
          className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${
            isActive 
              ? "bg-primary text-cream-50 border-primary shadow-lg shadow-primary/20" 
              : "bg-cream-100 border-cream-300 text-primary hover:bg-cream-300/50"
          }`}
        >
          <div className="flex items-center gap-3">
            <Power className={`w-5 h-5 ${isActive ? "text-cream-50" : "text-primary/50"}`} />
            <span className="font-semibold text-[15px]">{isActive ? "Inspector Active" : "Enable Inspector"}</span>
          </div>
          <div className={`w-12 h-7 rounded-full p-1 transition-colors ${isActive ? "bg-cream-50/20" : "bg-primary/10"}`}>
            <div className={`w-5 h-5 bg-cream-50 rounded-full shadow-sm transition-transform ${isActive ? "translate-x-5" : "translate-x-0"}`} />
          </div>
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-2 p-1.5 bg-cream-50/80 rounded-2xl border border-cream-300 mb-4 backdrop-blur-md">
        <button onClick={() => setActiveTab("inspector")} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold transition-all ${activeTab === "inspector" ? "bg-primary text-cream-50 shadow-md" : "text-primary/60 hover:text-primary hover:bg-cream-200"}`}>
          <MousePointer2 className="w-3.5 h-3.5" /> Inspect
        </button>
        <button onClick={() => setActiveTab("typography")} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold transition-all ${activeTab === "typography" ? "bg-primary text-cream-50 shadow-md" : "text-primary/60 hover:text-primary hover:bg-cream-200"}`}>
          <Type className="w-3.5 h-3.5" /> Type
        </button>
        <button onClick={() => setActiveTab("palette")} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold transition-all ${activeTab === "palette" ? "bg-primary text-cream-50 shadow-md" : "text-primary/60 hover:text-primary hover:bg-cream-200"}`}>
          <Palette className="w-3.5 h-3.5" /> Colors
        </button>
      </div>

      {/* Main Content Area */}
      <div className="bg-cream-50 rounded-[24px] shadow-sm border border-cream-300 flex flex-col flex-1 overflow-hidden">
        
        {/* --- INSPECTOR TAB --- */}
        {activeTab === "inspector" && (
          styles ? (
            <div className="flex flex-col h-full">
              <div className="p-4 border-b border-cream-200 flex justify-between items-center bg-cream-100/50">
                <h2 className="font-bold text-[13px] text-primary flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  Element Selected
                </h2>
                <button 
                  onClick={() => { setStyles(null); chrome.storage.local.remove(["selectedStyles", "selectedHTML"]) }}
                  className="text-primary/50 hover:text-primary text-[11px] font-bold px-3 py-1.5 bg-cream-50 border border-cream-300 rounded-lg transition-colors"
                >
                  Clear
                </button>
              </div>
              
              <div className="p-5 overflow-y-auto custom-scrollbar flex flex-col gap-5 flex-1">
                 <div className="flex gap-2">
                   <button onClick={() => copyToClipboard(JSON.stringify(styles.rawCss || styles, null, 2))} className="flex items-center gap-2 px-4 py-2.5 bg-cream-200 hover:bg-cream-300 text-primary text-xs rounded-xl font-bold transition-colors flex-1 justify-center border border-cream-300">
                     <Copy className="w-4 h-4" /> Copy CSS
                   </button>
                   <button onClick={() => copyToClipboard(tailwindClasses)} className="flex items-center gap-2 px-4 py-2.5 bg-primary/5 hover:bg-primary/10 text-primary text-xs rounded-xl font-bold transition-colors flex-1 justify-center border border-primary/10">
                     <Copy className="w-4 h-4" /> Copy Tailwind
                   </button>
                 </div>

                 <div className="flex gap-2">
                   <button onClick={() => handleAiAction("EXPLAIN_UI")} disabled={aiLoading} className="flex items-center gap-2 px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs rounded-xl font-bold transition-colors flex-1 justify-center border border-indigo-100 disabled:opacity-50">
                     <Wand2 className="w-4 h-4" /> Explain UI
                   </button>
                   <button onClick={() => handleAiAction("GENERATE_REACT")} disabled={aiLoading} className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs rounded-xl font-bold transition-colors flex-1 justify-center border border-emerald-100 disabled:opacity-50">
                     <Code2 className="w-4 h-4" /> Build React
                   </button>
                 </div>

                 {aiLoading && (
                   <div className="p-4 text-center text-[13px] font-medium text-primary/50 animate-pulse bg-cream-100 rounded-xl">
                     Analyzing with AI...
                   </div>
                 )}

                 {aiResponse && (
                   <div className="p-4 bg-cream-100 border border-cream-300 rounded-xl text-[13px] text-primary whitespace-pre-wrap font-sans">
                     <div className="font-bold text-[10px] text-primary/40 mb-2 uppercase tracking-widest">AI Response</div>
                     {aiResponse}
                   </div>
                 )}

                 <div>
                   <div className="font-bold text-[10px] text-primary/40 mb-2 uppercase tracking-widest pl-1">Tailwind Classes</div>
                   <div className="text-[13px] font-mono bg-primary text-cream-200 p-4 rounded-2xl whitespace-pre-wrap break-all shadow-inner">
                      {tailwindClasses}
                   </div>
                 </div>

                 <div>
                   <div className="font-bold text-[10px] text-primary/40 mb-2 uppercase tracking-widest pl-1">Computed Styles</div>
                   <div className="text-[13px] font-mono bg-primary text-cream-200 p-4 rounded-2xl whitespace-pre-wrap overflow-x-auto shadow-inner">
                      {JSON.stringify(styles.rawCss || styles, null, 2)}
                   </div>
                 </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-primary/40 p-10 text-center">
              <div className="w-16 h-16 bg-cream-200 rounded-2xl flex items-center justify-center mb-4">
                <MousePointer2 className="w-8 h-8 opacity-50" />
              </div>
              <p className="text-[15px] font-bold text-primary/70">No element selected</p>
              <p className="text-[13px] mt-2 leading-relaxed px-4">Enable the inspector and click an element on the page to view its styles.</p>
            </div>
          )
        )}

        {/* --- TYPOGRAPHY TAB --- */}
        {activeTab === "typography" && (
          <div className="flex flex-col h-full">
            <div className="p-4 border-b border-cream-200 flex justify-between items-center bg-cream-100/50">
              <h2 className="font-bold text-[13px] text-primary flex items-center gap-2">
                Page Typography
              </h2>
              <button onClick={copyFonts} className="text-primary/70 hover:text-primary text-[11px] font-bold px-3 py-1.5 bg-cream-50 border border-cream-300 rounded-lg transition-colors flex items-center gap-1.5">
                <Copy className="w-3 h-3" /> Extract All
              </button>
            </div>
            <div className="p-5 overflow-y-auto custom-scrollbar flex-1">
              {styles?.computedFont && (
                <div className="mb-6 p-4 bg-primary/5 rounded-2xl border border-primary/10">
                  <div className="font-bold text-[10px] text-primary/40 mb-2 uppercase tracking-widest">Currently Inspected Font</div>
                  <div className="text-[15px] font-medium text-primary break-all">{styles.computedFont}</div>
                </div>
              )}
              
              <div className="font-bold text-[10px] text-primary/40 mb-3 uppercase tracking-widest pl-1">All Detected Font Families</div>
              {pageFonts.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {pageFonts.map((font, i) => (
                    <div key={i} className="px-4 py-3 bg-cream-100 rounded-xl text-[14px] font-medium text-primary border border-cream-300 flex justify-between items-center group">
                      <span style={{ fontFamily: font }}>{font}</span>
                      <button onClick={() => copyToClipboard(`font-family: ${font};`)} className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-cream-300 rounded-md transition-all text-primary/50 hover:text-primary">
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                 <div className="text-sm text-primary/40 text-center py-8">Turn on the Inspector to scan the page.</div>
              )}
            </div>
          </div>
        )}

        {/* --- PALETTE TAB --- */}
        {activeTab === "palette" && (
          <div className="flex flex-col h-full">
            <div className="p-4 border-b border-cream-200 flex justify-between items-center bg-cream-100/50">
              <h2 className="font-bold text-[13px] text-primary flex items-center gap-2">
                Color Palette
              </h2>
              <button onClick={copyColors} className="text-primary/70 hover:text-primary text-[11px] font-bold px-3 py-1.5 bg-cream-50 border border-cream-300 rounded-lg transition-colors flex items-center gap-1.5">
                <Copy className="w-3 h-3" /> Extract All
              </button>
            </div>
            <div className="p-5 overflow-y-auto custom-scrollbar flex-1">
               <div className="font-bold text-[10px] text-primary/40 mb-3 uppercase tracking-widest pl-1">Detected Colors ({pageColors.length})</div>
               {pageColors.length > 0 ? (
                 <div className="grid grid-cols-2 gap-3">
                   {pageColors.map((color, i) => (
                     <div key={i} className="flex items-center gap-3 p-2.5 bg-cream-100 border border-cream-300 rounded-xl group relative">
                        <div className="w-8 h-8 rounded-lg shadow-sm border border-black/5" style={{ backgroundColor: color }} />
                        <span className="text-[12px] font-mono font-semibold text-primary">{color}</span>
                        <button onClick={() => copyToClipboard(color)} className="absolute right-2 opacity-0 group-hover:opacity-100 p-1.5 hover:bg-cream-300 rounded-md transition-all text-primary/50 hover:text-primary">
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                     </div>
                   ))}
                 </div>
               ) : (
                 <div className="text-sm text-primary/40 text-center py-8">Turn on the Inspector to scan the page.</div>
               )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
