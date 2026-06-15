export interface Asset {
  type: 'image' | 'svg' | 'bg-image';
  url?: string;
  svgContent?: string;
  width?: number;
  height?: number;
}

export const extractAllAssets = (): Asset[] => {
  const assets: Asset[] = []
  const seenUrls = new Set<string>()
  const seenSvgs = new Set<string>()

  // 1. Extract <img> tags
  const imgElements = document.querySelectorAll('img')
  imgElements.forEach((img) => {
    if (img.src && !seenUrls.has(img.src)) {
      seenUrls.add(img.src)
      assets.push({
        type: 'image',
        url: img.src,
        width: img.naturalWidth || img.width,
        height: img.naturalHeight || img.height
      })
    }
  })

  // 2. Extract inline <svg>
  const svgElements = document.querySelectorAll('svg')
  svgElements.forEach((svg) => {
    const svgString = svg.outerHTML
    if (!seenSvgs.has(svgString)) {
      seenSvgs.add(svgString)
      const rect = svg.getBoundingClientRect()
      assets.push({
        type: 'svg',
        svgContent: svgString,
        width: Math.round(rect.width),
        height: Math.round(rect.height)
      })
    }
  })

  // 3. Extract CSS background-image
  const allElements = document.querySelectorAll('*')
  allElements.forEach((el) => {
    const bgImage = window.getComputedStyle(el).backgroundImage
    if (bgImage && bgImage !== 'none') {
      const urls = bgImage.match(/url\(['"]?(.*?)['"]?\)/g)
      if (urls) {
        urls.forEach((urlMatch) => {
          const match = urlMatch.match(/url\(['"]?(.*?)['"]?\)/)
          if (match && match[1] && !seenUrls.has(match[1])) {
            seenUrls.add(match[1])
            const rect = el.getBoundingClientRect()
            assets.push({
              type: 'bg-image',
              url: match[1],
              width: Math.round(rect.width),
              height: Math.round(rect.height)
            })
          }
        })
      }
    }
  })

  return assets
}
