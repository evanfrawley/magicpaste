'use strict'

import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkHtml from 'remark-html'

const magicPasteString = '@magicpaste\n'
const magicPasteRegex = /^@magicpaste\s*/
const magicPasteStringNoNewLine = '@magicpaste'
const TYPE_HTML = 'text/html'
const TYPE_PLAIN = 'text/plain'

async function formatMarkdownToHTML(text) {
  const magicPasteContents = text.replace(/\u00A0\//g, ' ').replace(magicPasteRegex, '')
  const formattedText = await unified()
    .use(remarkParse)
    .use(remarkHtml)
    .process(magicPasteContents)

  // properly format block quotes
  const htmlString = formattedText.value
    .replace(/<blockquote>\n<p>/g, '<blockquote>')
    .replace(/<\/p>\n<\/blockquote>/g, '</blockquote>')
    .replace(/\u00A0\//g, ' ')

  return htmlString
}

async function saveToClipboard(str) {
  const newBlob = new Blob([str], { type: TYPE_HTML });
  const data = [new ClipboardItem({ [TYPE_HTML]: newBlob })];
  await navigator.clipboard.write(data)
}

async function runMagicPaste() {
  const clipboardItems = await navigator.clipboard.read();
  for (const clipboardItem of clipboardItems) {
    for (const type of clipboardItem.types) {
      const blob = await clipboardItem.getType(type);
      const text = await blob.text()

      if (type === TYPE_PLAIN && magicPasteRegex.test(text)) {
        const htmlString = await formatMarkdownToHTML(text)
        await saveToClipboard(htmlString)
      } else if (type === TYPE_HTML) {
        const parser = new DOMParser()
        const htmlDoc = parser.parseFromString(text, TYPE_HTML)
        const body = htmlDoc.querySelector('body')

        if (!body.textContent.startsWith(magicPasteStringNoNewLine)) return

        let items = []
        if (body.children.length >= 2) {
          items = Array.from(body.children)
        } else if (
          body.children.length === 1 &&
          body.children[0].tagName.toLowerCase() === 'div' &&
          body.children[0].children.length >= 2
        ) {
          items = Array.from(body.children[0].children)
        } else {
          return
        }

        items = items
          .filter(item => item.tagName.toLowerCase() !== 'meta')
          .slice(1) // get rid of the magicpaste

        const formattedHTMLStrings = []
        for (let i = 0; i < items.length; i++) {
          const item = items[i]
          let str
          const name = item.tagName.toLowerCase()
          if (name === 'p' || name === 'div') {
            str = await formatMarkdownToHTML(item.textContent)
          } else {
            str = item.outerHTML
          }
          formattedHTMLStrings.push(str)
        }

        if (formattedHTMLStrings.length === 0) return

        await saveToClipboard(formattedHTMLStrings.join('\n'))
      }
    }
  }
}

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
      item.addEventListener('click', runMagicPaste)
      item.addEventListener('copy', runMagicPaste)
      item.addEventListener('focus', runMagicPaste)
      const info = document.createElement('div')
      info.innerHTML = 'When pasting Markdown, make sure the contents start with <span class="mp-chip">@magicpaste</span> on its own line. <a class="mp-link" href="https://fake.so/magicpaste" target="_blank">Learn More</a>'
      info.classList.add('mp-info')
      infoContainer.appendChild(info)
    }
  })
}, 1000)

window.addEventListener('focus', runMagicPaste)
