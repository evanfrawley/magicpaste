'use strict'

import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkHtml from 'remark-html'

const magicPasteString = '@magicpaste\n'
const TYPE_HTML = 'text/html'
const TYPE_PLAIN = 'text/plain'

setInterval(async () => {
  try {
    const clipboardItems = await navigator.clipboard.read();
    for (const clipboardItem of clipboardItems) {
      for (const type of clipboardItem.types) {
        const blob = await clipboardItem.getType(type);
        const text = await blob.text()

        if (type === TYPE_PLAIN && text.startsWith(magicPasteString)) {
          const magicPasteContents = text.replace(magicPasteString, '')
          const file = await unified()
            .use(remarkParse)
            .use(remarkHtml, { sanitize: true })
            .process(magicPasteContents)

          // properly format block quotes
          const htmlString = file.value
            .replace(/<blockquote>\n<p>/g, '<blockquote>')
            .replace(/<\/p>\n<\/blockquote>/g, '</blockquote>')

          const newBlob = new Blob([htmlString], { type: TYPE_HTML });
          const data = [new ClipboardItem({ [TYPE_HTML]: newBlob })];
          await navigator.clipboard.write(data)
        }
      }
    }
  } catch (err) {
    // noop
  }
}, 100)

// Create loop to add buttons into the DOM
setInterval(() => {
  const items = document.querySelectorAll('div.bem-RichTextInput')
  items.forEach(item => {
    const infoContainerContainer = item.parentElement.querySelector('div.bem-Field_Head')
    if (!infoContainerContainer) return
    const infoContainer = infoContainerContainer.querySelector('div.bem-View')
    if (!infoContainer) return
    infoContainer.classList.add('mp-container')
    const maybeButton = Array.from(infoContainer.children).find(el => el.classList.contains('mp-info'))
    if (!maybeButton) {
      const info = document.createElement('div')
      info.innerHTML = 'When pasting Markdown from another file, make sure the contents start with <span class="mp-chip">@magicpaste</span> on its own line'
      info.classList.add('mp-info')
      infoContainer.appendChild(info)
    }
  })
}, 1000)
