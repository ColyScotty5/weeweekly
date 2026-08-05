const ALLOWED_TAGS = {
  a: { attributes: ['href', 'title', 'target'] },
  strong: { attributes: [] },
  b: { attributes: [] },
  em: { attributes: [] },
  i: { attributes: [] },
  br: { attributes: [], void: true }
}

// Markup inside these tags is discarded rather than downgraded to text.
const DROPPED_CONTENT_TAGS = new Set([
  'script',
  'style',
  'iframe',
  'object',
  'embed',
  'noscript',
  'template',
  'svg',
  'math'
])

const SAFE_LINK_PROTOCOLS = new Set(['http:', 'https:', 'mailto:'])
const SAFE_LINK_TARGETS = new Set(['_blank', '_self'])
const LINK_VALIDATION_BASE = 'https://schedule.invalid/'

const NAMED_ENTITIES = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: '\u00a0'
}

const TAG_PATTERN = /<\s*(\/)?\s*([a-zA-Z][a-zA-Z0-9]*)((?:[^<>"']|"[^"]*"|'[^']*')*)>/g
const ATTRIBUTE_PATTERN = /([a-zA-Z][a-zA-Z0-9-]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/g

function decodeEntities(value) {
  return value.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (match, entity) => {
    if (entity[0] === '#') {
      const codePoint =
        entity[1] === 'x' || entity[1] === 'X'
          ? Number.parseInt(entity.slice(2), 16)
          : Number.parseInt(entity.slice(1), 10)

      if (!Number.isInteger(codePoint) || codePoint < 1 || codePoint > 0x10ffff) return match
      try {
        return String.fromCodePoint(codePoint)
      } catch {
        return match
      }
    }

    const named = NAMED_ENTITIES[entity.toLowerCase()]
    return named === undefined ? match : named
  })
}

function safeHref(value) {
  if (!value) return null

  try {
    const url = new URL(value, LINK_VALIDATION_BASE)
    return SAFE_LINK_PROTOCOLS.has(url.protocol) ? value : null
  } catch {
    return null
  }
}

function parseAttributes(source, tag) {
  const allowed = ALLOWED_TAGS[tag].attributes
  const props = {}
  if (allowed.length === 0) return props

  ATTRIBUTE_PATTERN.lastIndex = 0
  let match = ATTRIBUTE_PATTERN.exec(source)

  while (match) {
    const name = match[1].toLowerCase()
    const value = decodeEntities(match[2] ?? match[3] ?? match[4] ?? '')

    if (allowed.includes(name)) {
      if (name === 'href') {
        const href = safeHref(value)
        if (href) props.href = href
      } else if (name === 'target') {
        if (SAFE_LINK_TARGETS.has(value)) props.target = value
      } else {
        props[name] = value
      }
    }

    match = ATTRIBUTE_PATTERN.exec(source)
  }

  return props
}

function appendText(parent, value) {
  if (!value) return

  const text = decodeEntities(value)
  const previous = parent.children[parent.children.length - 1]

  if (previous && previous.type === 'text') {
    previous.value += text
    return
  }

  parent.children.push({ type: 'text', value: text })
}

/**
 * Parses a restricted subset of inline HTML into a plain node tree.
 * Anything outside the allowlist is stripped, so the result is safe to render
 * as React elements without `dangerouslySetInnerHTML`.
 */
export function parseRichText(value) {
  if (typeof value !== 'string' || value === '') return []

  const root = { children: [] }
  const stack = [root]
  let droppedDepth = 0
  let droppedTag = null
  let cursor = 0

  TAG_PATTERN.lastIndex = 0
  let match = TAG_PATTERN.exec(value)

  while (match) {
    const [raw, closing, rawTag, rawAttributes] = match
    const tag = rawTag.toLowerCase()
    const parent = stack[stack.length - 1]

    if (droppedDepth === 0) appendText(parent, value.slice(cursor, match.index))
    cursor = match.index + raw.length

    if (droppedDepth > 0) {
      if (tag === droppedTag) droppedDepth += closing ? -1 : 1
      if (droppedDepth === 0) droppedTag = null
      match = TAG_PATTERN.exec(value)
      continue
    }

    if (DROPPED_CONTENT_TAGS.has(tag)) {
      if (!closing) {
        droppedDepth = 1
        droppedTag = tag
      }
      match = TAG_PATTERN.exec(value)
      continue
    }

    const allowed = ALLOWED_TAGS[tag]

    if (allowed && !allowed.void) {
      if (closing) {
        for (let openIndex = stack.length - 1; openIndex > 0; openIndex -= 1) {
          if (stack[openIndex].tag === tag) {
            stack.length = openIndex
            break
          }
        }
      } else {
        const element = { type: 'element', tag, props: parseAttributes(rawAttributes, tag), children: [] }
        parent.children.push(element)
        stack.push(element)
      }
    } else if (allowed && allowed.void && !closing) {
      parent.children.push({ type: 'element', tag, props: {}, children: [] })
    }

    match = TAG_PATTERN.exec(value)
  }

  if (droppedDepth === 0) appendText(stack[stack.length - 1], value.slice(cursor))

  return root.children
}

export function richTextToPlainText(value) {
  const flatten = (nodes) =>
    nodes
      .map((node) => (node.type === 'text' ? node.value : node.tag === 'br' ? ' ' : flatten(node.children)))
      .join('')

  return flatten(parseRichText(value)).replace(/\s+/g, ' ').trim()
}
