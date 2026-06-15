import { useState, useEffect } from "react"
import { Power, Settings, Zap, Copy, Wand2, Code2, Type, Palette, MousePointer2, Image as ImageIcon, Download, Dna } from "lucide-react"
import { convertToTailwind } from "./utils/tailwindConverter"
import { ExtractedStyles } from "./utils/styleExtractor"
import { Asset } from "./utils/assetExtractor"
import { WebsiteDNA } from "./utils/dnaExtractor"
import "./style.css"

type Tab = "inspector" | "typography" | "palette" | "assets" | "dna"
type SubTab = "element" | "before" | "after" | "keyframes"

export default function SidePanel() {
  const [isActive, setIsActive] = useState(false)
  const [styles, setStyles] = useState<ExtractedStyles | null>(null)
  const [outerHTML, setOuterHTML] = useState<string>("")
  
  const [pageFonts, setPageFonts] = useState<string[]>([])
  const [pageColors, setPageColors] = useState<string[]>([])
  const [pageAssets, setPageAssets] = useState<Asset[]>([])
  const [pageDna, setPageDna] = useState<WebsiteDNA | null>(null)
  
  const [aiLoading, setAiLoading] = useState(false)
  const [aiResponse, setAiResponse] = useState<string | null>(null)
  
  const [activeTab, setActiveTab] = useState<Tab>("inspector")
  const [subTab, setSubTab] = useState<SubTab>("element")

  useEffect(() => {
    chrome.storage.sync.get(["inspectorActive"], (result) => {
      setIsActive(result.inspectorActive || false)
    })
    chrome.storage.local.get(["selectedStyles", "selectedHTML", "pageFonts", "pageColors", "pageAssets", "pageDna"], (result) => {
      if (result.selectedStyles) {
        setStyles(result.selectedStyles)
        setSubTab("element")
      }
      if (result.selectedHTML) setOuterHTML(result.selectedHTML)
      if (result.pageFonts) setPageFonts(result.pageFonts)
      if (result.pageColors) setPageColors(result.pageColors)
      if (result.pageAssets) setPageAssets(result.pageAssets)
      if (result.pageDna) setPageDna(result.pageDna)
    })

    const handleStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }, areaName: string) => {
      if (areaName === "sync" && changes.inspectorActive) setIsActive(changes.inspectorActive.newValue)
      if (areaName === "local") {
        if (changes.selectedStyles) {
          setStyles(changes.selectedStyles.newValue)
          setAiResponse(null)
          setActiveTab("inspector")
          setSubTab("element")
        }
        if (changes.selectedHTML) setOuterHTML(changes.selectedHTML.newValue)
        if (changes.pageFonts) setPageFonts(changes.pageFonts.newValue)
        if (changes.pageColors) setPageColors(changes.pageColors.newValue)
        if (changes.pageAssets) setPageAssets(changes.pageAssets.newValue)
        if (changes.pageDna) setPageDna(changes.pageDna.newValue)
      }
    }
    chrome.storage.onChanged.addListener(handleStorageChange)
    return () => chrome.storage.onChanged.removeListener(handleStorageChange)
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
    const aiContextStyles = { element: styles.element, before: styles.before, after: styles.after, keyframes: styles.keyframes }
    chrome.runtime.sendMessage(
      { action, html: outerHTML, styles: aiContextStyles },
      (response) => {
        setAiLoading(false)
        if (chrome.runtime.lastError) setAiResponse(`Error: ${chrome.runtime.lastError.message}`)
        else if (response?.error) setAiResponse(`Error: ${response.error}`)
        else if (response?.result) setAiResponse(response.result)
        else setAiResponse("Unknown error occurred.")
      }
    )
  }

  const copyToClipboard = (text: string) => navigator.clipboard.writeText(text)
  const downloadAsset = (url: string, filename: string) => {
    const a = document.createElement("a")
    a.href = url
    a.download = filename || "asset"
    a.target = "_blank"
    a.click()
  }

  const downloadDNAKit = () => {
    if (!pageDna) return
    
    const tailwindConfig = `/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
${pageColors.map((c, i) => `        'brand-${i+1}': '${c}'`).join(',\n')}
      },
      fontFamily: {
        'sans': [${pageFonts.length > 0 ? `'${pageFonts[0]}'` : "'Inter'"}, 'sans-serif'],
      },
      borderRadius: {
${pageDna.radii.map((r, i) => `        'sys-${i}': '${r}'`).join(',\n')}
      },
      boxShadow: {
${pageDna.shadows.map((s, i) => `        'sys-${i}': '${s}'`).join(',\n')}
      }
    },
  },
  plugins: [],
}`

    const baseCss = `@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
${pageColors.map((c, i) => `    --color-brand-${i+1}: ${c};`).join('\n')}
${pageDna.radii.map((r, i) => `    --radius-sys-${i}: ${r};`).join('\n')}
${pageDna.spacing.map((s, i) => `    --space-sys-${i}: ${s};`).join('\n')}
${pageDna.fontSizes.map((s, i) => `    --font-size-${i}: ${s};`).join('\n')}
  }
  
  body {
    font-family: ${pageFonts.length > 0 ? `'${pageFonts[0]}'` : 'sans-serif'};
    background-color: var(--color-brand-1, #ffffff);
    color: var(--color-brand-2, #000000);
  }
}`
    
    const downloadFile = (content: string, filename: string, type: string) => {
      const blob = new Blob([content], { type })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
    }

    downloadFile(tailwindConfig, "tailwind.config.txt", "text/plain")
    
    setTimeout(() => {
      downloadFile(baseCss, "base.css.txt", "text/plain")
    }, 100)
  }

  return (
    <div className="min-h-screen bg-cream-200 text-primary flex flex-col font-sans p-4">
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

      <div className="flex gap-1 p-1 bg-cream-50/80 rounded-2xl border border-cream-300 mb-4 backdrop-blur-md">
        <button onClick={() => setActiveTab("inspector")} className={`flex-1 flex flex-col items-center justify-center gap-1 py-1.5 rounded-xl text-[10px] font-bold transition-all ${activeTab === "inspector" ? "bg-primary text-cream-50 shadow-md" : "text-primary/60 hover:text-primary hover:bg-cream-200"}`}><MousePointer2 className="w-4 h-4" /> Inspect</button>
        <button onClick={() => setActiveTab("typography")} className={`flex-1 flex flex-col items-center justify-center gap-1 py-1.5 rounded-xl text-[10px] font-bold transition-all ${activeTab === "typography" ? "bg-primary text-cream-50 shadow-md" : "text-primary/60 hover:text-primary hover:bg-cream-200"}`}><Type className="w-4 h-4" /> Type</button>
        <button onClick={() => setActiveTab("palette")} className={`flex-1 flex flex-col items-center justify-center gap-1 py-1.5 rounded-xl text-[10px] font-bold transition-all ${activeTab === "palette" ? "bg-primary text-cream-50 shadow-md" : "text-primary/60 hover:text-primary hover:bg-cream-200"}`}><Palette className="w-4 h-4" /> Colors</button>
        <button onClick={() => setActiveTab("assets")} className={`flex-1 flex flex-col items-center justify-center gap-1 py-1.5 rounded-xl text-[10px] font-bold transition-all ${activeTab === "assets" ? "bg-primary text-cream-50 shadow-md" : "text-primary/60 hover:text-primary hover:bg-cream-200"}`}><ImageIcon className="w-4 h-4" /> Assets</button>
        <button onClick={() => setActiveTab("dna")} className={`flex-1 flex flex-col items-center justify-center gap-1 py-1.5 rounded-xl text-[10px] font-bold transition-all ${activeTab === "dna" ? "bg-indigo-600 text-cream-50 shadow-md" : "text-indigo-600/60 hover:text-indigo-600 hover:bg-indigo-50"}`}><Dna className="w-4 h-4" /> DNA</button>
      </div>

      <div className="bg-cream-50 rounded-[24px] shadow-sm border border-cream-300 flex flex-col flex-1 overflow-hidden relative">
        
        {/* --- INSPECTOR TAB --- */}
        {activeTab === "inspector" && (
          styles ? (
            <div className="flex flex-col h-full overflow-y-auto custom-scrollbar pb-10">
              {/* CSS Peeper Visual Specs */}
              <div className="p-4 border-b border-cream-200 bg-cream-50">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="font-bold text-[13px] text-primary flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary" /> Visual Specs
                  </h2>
                  <button onClick={() => { setStyles(null); chrome.storage.local.remove(["selectedStyles", "selectedHTML"]) }} className="text-primary/50 hover:text-primary text-[10px] font-bold px-2 py-1 bg-cream-100 rounded-md transition-colors">Clear</button>
                </div>

                {/* Dimensions */}
                <div className="grid grid-cols-2 gap-2 mb-4">
                  <div className="bg-cream-100 p-2.5 rounded-xl border border-cream-200">
                    <div className="text-[10px] text-primary/40 font-bold uppercase mb-0.5">Width</div>
                    <div className="text-[13px] font-mono text-primary">{styles.visualSpecs?.width || '-'}</div>
                  </div>
                  <div className="bg-cream-100 p-2.5 rounded-xl border border-cream-200">
                    <div className="text-[10px] text-primary/40 font-bold uppercase mb-0.5">Height</div>
                    <div className="text-[13px] font-mono text-primary">{styles.visualSpecs?.height || '-'}</div>
                  </div>
                </div>

                {/* Typography Block */}
                <div className="bg-cream-100 p-3 rounded-xl border border-cream-200 mb-4">
                   <div className="text-[10px] text-primary/40 font-bold uppercase mb-2">Typography</div>
                   <div className="text-[14px] font-medium text-primary mb-2 break-all">{styles.visualSpecs?.fontFamily}</div>
                   <div className="flex gap-4 border-t border-cream-200 pt-2 mt-2">
                     <div>
                       <div className="text-[9px] text-primary/40 uppercase">Size</div>
                       <div className="text-[12px] font-mono">{styles.visualSpecs?.fontSize}</div>
                     </div>
                     <div>
                       <div className="text-[9px] text-primary/40 uppercase">Line</div>
                       <div className="text-[12px] font-mono">{styles.visualSpecs?.lineHeight}</div>
                     </div>
                     <div>
                       <div className="text-[9px] text-primary/40 uppercase">Align</div>
                       <div className="text-[12px] font-mono">{styles.visualSpecs?.textAlign}</div>
                     </div>
                   </div>
                </div>

                {/* Colors Block */}
                <div className="flex gap-2">
                  <div className="flex-1 bg-cream-100 p-2.5 rounded-xl border border-cream-200 flex items-center gap-2">
                    <div className="w-6 h-6 rounded border border-black/10" style={{ backgroundColor: styles.visualSpecs?.backgroundColor }} />
                    <div>
                      <div className="text-[9px] text-primary/40 uppercase font-bold">Fill</div>
                      <div className="text-[11px] font-mono">{styles.visualSpecs?.backgroundColor === 'rgba(0, 0, 0, 0)' ? 'None' : 'Set'}</div>
                    </div>
                  </div>
                  <div className="flex-1 bg-cream-100 p-2.5 rounded-xl border border-cream-200 flex items-center gap-2">
                    <div className="w-6 h-6 rounded border border-black/10" style={{ backgroundColor: styles.visualSpecs?.color }} />
                    <div>
                      <div className="text-[9px] text-primary/40 uppercase font-bold">Text</div>
                      <div className="text-[11px] font-mono">Color</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Advanced Developer Extract */}
              <div className="p-4 bg-cream-100/50 flex-1">
                <div className="font-bold text-[13px] text-primary flex items-center gap-2 mb-3">
                  <Code2 className="w-4 h-4" /> Exact Code
                </div>
                
                <div className="flex gap-1.5 p-1 bg-cream-200/50 rounded-xl mb-3">
                  <button onClick={() => setSubTab("element")} className={`flex-1 py-1 rounded-lg text-[10px] font-bold transition-colors ${subTab === "element" ? "bg-white shadow-sm text-primary" : "text-primary/60 hover:text-primary"}`}>Base</button>
                  {styles.before && <button onClick={() => setSubTab("before")} className={`flex-1 py-1 rounded-lg text-[10px] font-bold transition-colors ${subTab === "before" ? "bg-white shadow-sm text-primary" : "text-primary/60 hover:text-primary"}`}>::before</button>}
                  {styles.after && <button onClick={() => setSubTab("after")} className={`flex-1 py-1 rounded-lg text-[10px] font-bold transition-colors ${subTab === "after" ? "bg-white shadow-sm text-primary" : "text-primary/60 hover:text-primary"}`}>::after</button>}
                  {styles.keyframes && <button onClick={() => setSubTab("keyframes")} className={`flex-1 py-1 rounded-lg text-[10px] font-bold transition-colors ${subTab === "keyframes" ? "bg-white shadow-sm text-primary" : "text-primary/60 hover:text-primary"}`}>@keyframes</button>}
                </div>
              
                <div className="mb-3">
                   <div className="flex justify-between items-end mb-1.5">
                     <div className="font-bold text-[9px] text-primary/40 uppercase tracking-widest pl-1">Extracted Properties</div>
                     <button onClick={() => copyToClipboard(subTab === "keyframes" ? styles.keyframes || "" : JSON.stringify(styles[subTab as 'element' | 'before' | 'after'], null, 2))} className="text-primary hover:text-primary/70 text-[10px] flex items-center gap-1 font-bold">
                       <Copy className="w-3 h-3" />
                     </button>
                   </div>
                   <div className="text-[11px] font-mono bg-primary text-cream-200 p-3 rounded-xl whitespace-pre-wrap overflow-x-auto shadow-inner">
                      {subTab === "keyframes" ? styles.keyframes : JSON.stringify(styles[subTab as 'element' | 'before' | 'after'], null, 2)}
                   </div>
                </div>

                {subTab !== "keyframes" && (
                   <div className="mb-4">
                     <div className="flex justify-between items-end mb-1.5">
                       <div className="font-bold text-[9px] text-primary/40 uppercase tracking-widest pl-1">Tailwind Arbitrary</div>
                       <button onClick={() => copyToClipboard(convertToTailwind(styles[subTab as 'element' | 'before' | 'after'] || {}, subTab === 'element' ? '' : `${subTab}:`))} className="text-primary hover:text-primary/70 text-[10px] flex items-center gap-1 font-bold">
                         <Copy className="w-3 h-3" />
                       </button>
                     </div>
                     <div className="text-[11px] font-mono bg-cream-200 text-primary p-3 rounded-xl whitespace-pre-wrap break-all border border-cream-300">
                        {convertToTailwind(styles[subTab as 'element' | 'before' | 'after'] || {}, subTab === 'element' ? '' : `${subTab}:`) || 'No Tailwind utilities needed.'}
                     </div>
                   </div>
                )}
                
                <div className="flex gap-2 mb-2">
                   <button onClick={() => handleAiAction("EXPLAIN_UI")} disabled={aiLoading} className="flex items-center gap-1.5 px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[10px] rounded-lg font-bold transition-colors flex-1 justify-center border border-indigo-100 disabled:opacity-50">
                     <Wand2 className="w-3 h-3" /> Explain UI
                   </button>
                   <button onClick={() => handleAiAction("GENERATE_REACT")} disabled={aiLoading} className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[10px] rounded-lg font-bold transition-colors flex-1 justify-center border border-emerald-100 disabled:opacity-50">
                     <Code2 className="w-3 h-3" /> Build React
                   </button>
                </div>
                
                {aiResponse && (
                  <div className="p-4 bg-cream-50 border border-cream-300 rounded-xl text-[12px] text-primary whitespace-pre-wrap font-sans mt-2">
                    {aiResponse}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-primary/40 p-10 text-center">
              <div className="w-16 h-16 bg-cream-200 rounded-2xl flex items-center justify-center mb-4">
                <MousePointer2 className="w-8 h-8 opacity-50" />
              </div>
              <p className="text-[15px] font-bold text-primary/70">No element selected</p>
              <p className="text-[13px] mt-2 leading-relaxed px-4">Enable the inspector and click an element on the page to view exact styles and visual specs.</p>
            </div>
          )
        )}

        {/* --- TYPOGRAPHY TAB --- */}
        {activeTab === "typography" && (
          <div className="flex flex-col h-full pb-10">
            <div className="p-4 border-b border-cream-200 flex justify-between items-center bg-cream-100/50">
              <h2 className="font-bold text-[13px] text-primary">Page Typography</h2>
              <button onClick={() => copyToClipboard(`:root {\n${pageFonts.map((f, i) => `--font-${i + 1}: ${f};`).join('\n')}\n}`)} className="text-primary/70 hover:text-primary text-[10px] font-bold px-2 py-1 bg-cream-50 border border-cream-300 rounded-md">Extract All</button>
            </div>
            <div className="p-4 overflow-y-auto custom-scrollbar flex-1">
              {pageFonts.map((font, i) => (
                <div key={i} className="px-4 py-3 mb-2 bg-cream-100 rounded-xl text-[13px] font-medium text-primary border border-cream-300 flex justify-between items-center group">
                  <span style={{ fontFamily: font }}>{font}</span>
                  <button onClick={() => copyToClipboard(`font-family: ${font};`)} className="opacity-0 group-hover:opacity-100 p-1 hover:bg-cream-300 rounded transition-all text-primary/50">
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* --- PALETTE TAB --- */}
        {activeTab === "palette" && (
          <div className="flex flex-col h-full pb-10">
            <div className="p-4 border-b border-cream-200 flex justify-between items-center bg-cream-100/50">
              <h2 className="font-bold text-[13px] text-primary">{styles ? "Scoped Colors" : "Page Palette"}</h2>
              <button onClick={() => copyToClipboard(`:root {\n${pageColors.map((c, i) => `--color-${i + 1}: ${c};`).join('\n')}\n}`)} className="text-primary/70 hover:text-primary text-[10px] font-bold px-2 py-1 bg-cream-50 border border-cream-300 rounded-md">Extract All</button>
            </div>
            <div className="p-4 overflow-y-auto custom-scrollbar flex-1">
               <div className="grid grid-cols-2 gap-2">
                 {pageColors.map((color, i) => (
                   <div key={i} className="flex items-center gap-2 p-2 bg-cream-100 border border-cream-300 rounded-xl group relative">
                      <div className="w-6 h-6 rounded shadow-sm border border-black/5" style={{ backgroundColor: color }} />
                      <span className="text-[11px] font-mono font-semibold text-primary">{color}</span>
                      <button onClick={() => copyToClipboard(color)} className="absolute right-1 opacity-0 group-hover:opacity-100 p-1 hover:bg-cream-300 rounded transition-all text-primary/50">
                        <Copy className="w-3 h-3" />
                      </button>
                   </div>
                 ))}
               </div>
            </div>
          </div>
        )}

        {/* --- ASSETS TAB --- */}
        {activeTab === "assets" && (
          <div className="flex flex-col h-full pb-10">
            <div className="p-4 border-b border-cream-200 flex justify-between items-center bg-cream-100/50">
              <h2 className="font-bold text-[13px] text-primary flex items-center gap-2">
                Assets ({pageAssets.length})
              </h2>
            </div>
            <div className="p-4 overflow-y-auto custom-scrollbar flex-1 bg-cream-50">
               {pageAssets.length > 0 ? (
                 <div className="grid grid-cols-2 gap-3">
                   {pageAssets.map((asset, i) => (
                     <div key={i} className="group relative bg-cream-200 border border-cream-300 rounded-2xl overflow-hidden flex flex-col justify-between h-32">
                        {asset.type === 'svg' && asset.svgContent ? (
                          <div className="flex-1 flex items-center justify-center p-4" dangerouslySetInnerHTML={{ __html: asset.svgContent }} />
                        ) : (
                          <div className="flex-1 flex items-center justify-center p-2">
                            <img src={asset.url} alt="asset" className="max-w-full max-h-full object-contain drop-shadow-sm" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-primary/80 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 backdrop-blur-sm">
                           <div className="text-[9px] text-cream-50 font-bold uppercase tracking-widest">{asset.type}</div>
                           <div className="text-[10px] text-cream-100/70 mb-2 font-mono">{asset.width}x{asset.height}</div>
                           <div className="flex gap-2">
                             {asset.url && <button onClick={() => downloadAsset(asset.url!, `asset-${i}`)} className="p-2 bg-cream-50 text-primary hover:bg-cream-200 rounded-full shadow-lg transition-transform hover:scale-105"><Download className="w-3.5 h-3.5" /></button>}
                             {asset.type === 'svg' && asset.svgContent && <button onClick={() => copyToClipboard(asset.svgContent!)} className="p-2 bg-cream-50 text-primary hover:bg-cream-200 rounded-full shadow-lg transition-transform hover:scale-105" title="Copy SVG Source"><Copy className="w-3.5 h-3.5" /></button>}
                           </div>
                        </div>
                     </div>
                   ))}
                 </div>
               ) : (
                 <div className="text-sm text-primary/40 text-center py-8">Turn on the Inspector to scan for assets.</div>
               )}
            </div>
          </div>
        )}

        {/* --- DNA TAB --- */}
        {activeTab === "dna" && (
          <div className="flex flex-col h-full bg-indigo-50/30 pb-10">
            <div className="p-5 border-b border-indigo-100 bg-white shadow-sm z-10 flex flex-col gap-3">
              <h2 className="font-bold text-[16px] text-indigo-900 flex items-center gap-2">
                <Dna className="w-5 h-5 text-indigo-600" /> Website DNA Profile
              </h2>
              <button 
                onClick={downloadDNAKit} 
                disabled={!pageDna}
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white py-3 px-4 rounded-xl font-bold transition-all shadow-md shadow-indigo-600/20 disabled:opacity-50"
              >
                <Download className="w-4 h-4" /> Download DNA Kit (Tailwind + CSS)
              </button>
            </div>
            
            <div className="p-4 overflow-y-auto custom-scrollbar flex-1">
              {pageDna ? (
                <div className="flex flex-col gap-3">
                  
                  {/* Brand Colors */}
                  <div className="bg-white p-3 rounded-xl border border-indigo-100 shadow-sm">
                    <h3 className="text-[10px] uppercase tracking-widest text-indigo-400 font-bold mb-2">Primary Colors</h3>
                    <div className="flex flex-wrap gap-2">
                      {pageColors.slice(0, 8).map((c, i) => (
                        <div key={i} className="flex flex-col items-center gap-1">
                          <div className="w-6 h-6 rounded-md shadow-sm border border-black/5" style={{ backgroundColor: c }} />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Font Family */}
                  <div className="bg-white p-3 rounded-xl border border-indigo-100 shadow-sm">
                    <h3 className="text-[10px] uppercase tracking-widest text-indigo-400 font-bold mb-2">Font Families</h3>
                    <div className="flex flex-wrap gap-2">
                      {pageFonts.slice(0, 3).map((f, i) => (
                        <span key={i} className="text-[11px] bg-indigo-50 text-indigo-700 px-2 py-1 rounded border border-indigo-100" style={{ fontFamily: f }}>{f}</span>
                      ))}
                    </div>
                  </div>

                  {/* Spacing DNA (Minimal) */}
                  <div className="bg-white p-3 rounded-xl border border-indigo-100 shadow-sm">
                    <h3 className="text-[10px] uppercase tracking-widest text-indigo-400 font-bold mb-2">Spacing Scale</h3>
                    <div className="flex flex-wrap gap-1.5">
                      {pageDna.spacing.map((s, i) => <div key={i} className="bg-gray-50 text-gray-600 text-[10px] font-mono px-1.5 py-0.5 rounded border border-gray-100">{s}</div>)}
                    </div>
                  </div>

                  {/* Border Radius DNA (Minimal) */}
                  <div className="bg-white p-3 rounded-xl border border-indigo-100 shadow-sm flex justify-between items-center">
                    <h3 className="text-[10px] uppercase tracking-widest text-indigo-400 font-bold">Radii</h3>
                    <div className="flex gap-2 items-center">
                      {pageDna.radii.map((r, i) => (
                        <div key={i} className="w-5 h-5 bg-indigo-100 border border-indigo-200" style={{ borderRadius: r }} title={r} />
                      ))}
                    </div>
                  </div>

                  {/* Font Sizes DNA (Minimal) */}
                  <div className="bg-white p-3 rounded-xl border border-indigo-100 shadow-sm">
                    <h3 className="text-[10px] uppercase tracking-widest text-indigo-400 font-bold mb-2">Typography Scale</h3>
                    <div className="flex flex-wrap gap-2">
                      {pageDna.fontSizes.map((s, i) => (
                        <div key={i} className="flex items-center gap-1 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100">
                          <span className="text-[10px] font-mono text-gray-500">{s}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              ) : (
                <div className="text-sm text-indigo-400 text-center py-8">Turn on the Inspector to extract the Website DNA.</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
