
const parseMarkdown = (content) => {
  const tokens = []
  if (!content) return tokens
  
  const lines = content.split('\n')
  let i = 0
  
  while (i < lines.length) {
    const line = lines[i]
    if (line.trim() === '') {
      i++
      continue
    }

    if (line.startsWith('```')) {
      const language = line.slice(3).trim() || undefined
      const codeLines = []
      i++
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i])
        i++
      }
      tokens.push({ type: 'code-block', language, content: codeLines.join('\n') })
      i++
      continue
    }

    if (line.match(/^[-*+]\s+/)) {
      const listItems = []
      while (i < lines.length && lines[i].match(/^[-*+]\s+/)) {
        listItems.push(lines[i].replace(/^[-*+]\s+/, ''))
        i++
      }
      tokens.push({
        type: 'ul-item',
        children: listItems.map(item => ({ type: 'paragraph', content: item })),
      })
      continue
    }

    tokens.push({ type: 'paragraph', content: line })
    i++
  }
  return tokens
}

const testContent = `
* Chuỗi văn bản:
  \`\`\`
  [=FUNCTION("tham số")]
  \`\`\`
`

console.log(JSON.stringify(parseMarkdown(testContent), null, 2))
