export {}

// Open Side Panel when extension icon is clicked
if (chrome.sidePanel && chrome.sidePanel.setPanelBehavior) {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(console.error)
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "EXPLAIN_UI" || request.action === "GENERATE_REACT") {
    
    // Using an async IIFE so we can return true immediately for the async response
    (async () => {
      try {
        const { openaiApiKey, openaiModel } = await chrome.storage.sync.get(["openaiApiKey", "openaiModel"])
        
        if (!openaiApiKey) {
          sendResponse({ error: "No API Key found. Please add it in the extension options." })
          return
        }

        const model = openaiModel || "gpt-4o"
        let systemPrompt = ""
        let userPrompt = ""

        if (request.action === "EXPLAIN_UI") {
          systemPrompt = "You are an expert UI/UX designer and frontend developer. Explain the following UI element's design based on its CSS styles and HTML structure. Keep it concise, engaging, and focus on aesthetics like spacing, typography, and layout."
          userPrompt = `HTML:\n${request.html}\n\nCSS:\n${JSON.stringify(request.styles, null, 2)}`
        } else {
          systemPrompt = "You are an expert frontend developer. Convert the provided HTML and CSS into a clean, modern React component using Tailwind CSS. Output ONLY valid React/JSX code with no markdown formatting."
          userPrompt = `HTML:\n${request.html}\n\nCSS:\n${JSON.stringify(request.styles, null, 2)}`
        }

        const response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${openaiApiKey}`
          },
          body: JSON.stringify({
            model: model,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt }
            ],
            temperature: 0.7,
          })
        })

        if (!response.ok) {
          const errData = await response.json()
          throw new Error(errData.error?.message || "OpenAI API Error")
        }

        const data = await response.json()
        sendResponse({ result: data.choices[0].message.content })

      } catch (error: any) {
        sendResponse({ error: error.message })
      }
    })()

    return true // Indicates async response
  }
})
