
const parseMarkdown = (content) => {
  const tokens = []
  if (!content) return tokens
  
  // MOCK: The actual code splits by \n
  const lines = content.split('\n')
  let i = 0
  
  while (i < lines.length) {
    const line = lines[i]
    tokens.push({ type: 'paragraph', content: line })
    i++
  }
  return tokens
}

const testContent = "Chức năng:\\nTự động chọn cách xưng hô"
console.log("Original content:", testContent)
console.log("Tokens:", JSON.stringify(parseMarkdown(testContent), null, 2))

const fixedContent = testContent.replace(/\\n/g, '\n')
console.log("\nFixed content:", fixedContent)
console.log("Fixed Tokens:", JSON.stringify(parseMarkdown(fixedContent), null, 2))
