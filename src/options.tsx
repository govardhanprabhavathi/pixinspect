import { useState, useEffect } from "react"
import "./style.css"

export default function Options() {
  const [apiKey, setApiKey] = useState("")
  const [model, setModel] = useState("gpt-4o")
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    chrome.storage.sync.get(["openaiApiKey", "openaiModel"], (result) => {
      if (result.openaiApiKey) setApiKey(result.openaiApiKey)
      if (result.openaiModel) setModel(result.openaiModel)
    })
  }, [])

  const handleSave = () => {
    chrome.storage.sync.set(
      {
        openaiApiKey: apiKey,
        openaiModel: model
      },
      () => {
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
      }
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-8 flex flex-col items-center font-sans">
      <div className="max-w-2xl w-full bg-white rounded-xl shadow-sm border border-slate-200 p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">PixInspect Settings</h1>
          <p className="text-slate-500">Configure your AI preferences for UI explanations and code generation.</p>
        </div>

        <div className="space-y-6">
          <div>
            <label htmlFor="apiKey" className="block text-sm font-semibold text-slate-700 mb-1">
              OpenAI API Key
            </label>
            <input
              type="password"
              id="apiKey"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
              placeholder="sk-..."
            />
            <p className="text-xs text-slate-500 mt-2">
              Your API key is stored locally in your browser and is only sent directly to OpenAI.
            </p>
          </div>

          <div>
            <label htmlFor="model" className="block text-sm font-semibold text-slate-700 mb-1">
              AI Model
            </label>
            <select
              id="model"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
            >
              <option value="gpt-4o">GPT-4o (Recommended)</option>
              <option value="gpt-4-turbo">GPT-4 Turbo</option>
              <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
            </select>
          </div>

          <div className="pt-4 flex items-center gap-4">
            <button
              onClick={handleSave}
              className="px-6 py-2 bg-primary text-white rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-sm"
            >
              Save Settings
            </button>
            {saved && <span className="text-sm text-green-600 font-medium">Settings saved successfully!</span>}
          </div>
        </div>
      </div>
    </div>
  )
}
