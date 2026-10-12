import * as cheerio from 'cheerio'
import { v4 } from 'uuid'
import { EditorElement } from '~/providers/visual-editor/editor/editor-provider'

export function parseHtmlToEditorElements(html: string): EditorElement[] {
  const $ = cheerio.load(html)
  const root = $('body').length > 0 ? $('body') : $.root()
  function mapNodeToElement(node: any): EditorElement | null {
    if (node.type === 'text') {
      const text = $(node).text().trim()
      if (!text) return null
      return {
        id: v4(),
        name: 'Text',
        type: 'text',
        styles: { color: 'black' },
        content: { innerText: text },
      }
    }

    if (node.type !== 'tag') return null

    const tagName = node.tagName.toLowerCase()
    const className = $(node).attr('class') || undefined
    const styleAttr = $(node).attr('style') || ''
    const styles: React.CSSProperties = {}
    if (styleAttr) {
      styleAttr.split(';').forEach(style => {
        const parts = style.split(':')
        if (parts.length === 2) {
          const key = parts[0].trim().replace(/-([a-z])/g, g => g[1].toUpperCase())
          styles[key as keyof React.CSSProperties] = parts[1].trim() as any
        }
      })
    }

    let type: EditorElement['type'] = 'container'
    let name = 'Container'
    let content: EditorElement['content'] = []
    if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'span', 'strong', 'em', 'label', 'button'].includes(tagName)) {
      type = 'text'
      name = tagName.toUpperCase()
      content = { innerText: $(node).text() }
    } else if (tagName === 'a') {
      type = 'link'
      name = 'Link'
      content = {
        innerText: $(node).text(),
        href: $(node).attr('href') || '#'
      }
    } else if (tagName === 'img') {
      type = 'image'
      name = 'Image'
      content = {
        src: $(node).attr('src') || '',
      }
    } else if (tagName === 'video' || tagName === 'iframe') {
      type = 'video'
      name = 'Video'
      content = {
        src: $(node).attr('src') || $(node).find('source').attr('src') || '',
      }
    } else if (tagName === 'style' || tagName === 'script' || tagName === 'head' || tagName === 'title' || tagName === 'meta' || tagName === 'link') {
      type = 'html'
      name = 'HTML / Style'
      content = { innerHtml: $.html(node) }
    } else {
      type = 'container'
      name = tagName.toUpperCase()
      const children: EditorElement[] = []
      $(node).contents().each((_, child) => {
        const childElement = mapNodeToElement(child as any)
        if (childElement) {
          children.push(childElement)
        }
      })
      content = children
    }

    return {
      id: v4(),
      name,
      type,
      styles,
      className,
      content,
    }
  }

  const elements: EditorElement[] = []

    ; (root as any).contents().each((_: any, child: any) => {
      const childElement = mapNodeToElement(child as any)
      if (childElement) {
        elements.push(childElement)
      }
    })

  return elements
}
