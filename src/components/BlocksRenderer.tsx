import type { ReactNode } from 'react'
import { SmartLink } from '@/components/ui'
import { mediaUrl } from '@/lib/strapi'
import type { BlockNode, Blocks, InlineNode, ListItemNode, ListNode, TextNode } from '@/lib/types'

/** Renders Strapi v5 "Blocks" rich text. Unknown node types are skipped rather than crashing the page. */
export function BlocksRenderer({ content, className = 'prose-rg' }: { content?: Blocks | null; className?: string }) {
  if (!content?.length) return null
  return <div className={className}>{content.map((block, i) => renderBlock(block, i))}</div>
}

const renderText = (node: TextNode, key: number): ReactNode => {
  let out: ReactNode = node.text
  if (node.code) out = <code>{out}</code>
  if (node.bold) out = <strong>{out}</strong>
  if (node.italic) out = <em>{out}</em>
  if (node.underline) out = <u>{out}</u>
  if (node.strikethrough) out = <s>{out}</s>
  return <span key={key}>{out}</span>
}

const renderInline = (nodes: InlineNode[]) =>
  nodes.map((node, i) =>
    node.type === 'link' ? (
      <SmartLink key={i} href={node.url}>
        {node.children.map(renderText)}
      </SmartLink>
    ) : (
      renderText(node, i)
    ),
  )

const renderList = (node: ListNode, key: number): ReactNode => {
  const Tag = node.format === 'ordered' ? 'ol' : 'ul'
  return (
    <Tag key={key}>
      {node.children.map((child, i) =>
        child.type === 'list' ? (
          <li key={i}>{renderList(child, i)}</li>
        ) : (
          <li key={i}>{renderInline((child as ListItemNode).children)}</li>
        ),
      )}
    </Tag>
  )
}

function renderBlock(block: BlockNode, key: number): ReactNode {
  switch (block.type) {
    case 'paragraph': {
      const empty = block.children.every((c) => c.type === 'text' && c.text === '')
      return empty ? null : <p key={key}>{renderInline(block.children)}</p>
    }
    case 'heading': {
      // h1 is reserved for the page title.
      const level = Math.min(Math.max(block.level, 2), 6)
      const Tag = `h${level}` as 'h2'
      return <Tag key={key}>{renderInline(block.children)}</Tag>
    }
    case 'quote':
      return <blockquote key={key}>{renderInline(block.children)}</blockquote>
    case 'code':
      return (
        <pre key={key}>
          <code>{block.children.map((c) => c.text).join('')}</code>
        </pre>
      )
    case 'list':
      return renderList(block, key)
    case 'image':
      return (
        <figure key={key}>
          <img
            src={mediaUrl(block.image.url)}
            alt={block.image.alternativeText ?? ''}
            width={block.image.width ?? undefined}
            height={block.image.height ?? undefined}
            loading="lazy"
          />
        </figure>
      )
    default:
      return null
  }
}
