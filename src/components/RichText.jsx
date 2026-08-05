import { Fragment } from 'react'
import { Link, Typography } from '@mui/material'
import { parseRichText } from '../lib/richText'

function renderNodes(nodes) {
  return nodes.map((node, index) => {
    const key = `${node.type}-${index}`

    if (node.type === 'text') return <Fragment key={key}>{node.value}</Fragment>

    const children = renderNodes(node.children)

    switch (node.tag) {
      case 'a': {
        if (!node.props.href) return <Fragment key={key}>{children}</Fragment>

        const target = node.props.target ?? '_blank'

        return (
          <Link
            key={key}
            href={node.props.href}
            title={node.props.title}
            target={target}
            rel={target === '_blank' ? 'noopener noreferrer' : undefined}
          >
            {children}
          </Link>
        )
      }
      case 'strong':
      case 'b':
        return (
          <Typography
            key={key}
            component="strong"
            variant="inherit"
            sx={{ fontWeight: 'fontWeightBold' }}
          >
            {children}
          </Typography>
        )
      case 'em':
      case 'i':
        return (
          <Typography key={key} component="em" variant="inherit" sx={{ fontStyle: 'italic' }}>
            {children}
          </Typography>
        )
      case 'br':
        return <br key={key} />
      default:
        return <Fragment key={key}>{children}</Fragment>
    }
  })
}

/**
 * Renders a restricted subset of inline HTML (links, emphasis, line breaks)
 * as Material components. Unsupported markup is stripped by `parseRichText`.
 */
export default function RichText({ value }) {
  if (!value) return null

  return <>{renderNodes(parseRichText(value))}</>
}
