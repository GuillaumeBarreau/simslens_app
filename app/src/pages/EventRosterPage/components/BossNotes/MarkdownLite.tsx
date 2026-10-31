import { List, Stack, Text, Title } from '@mantine/core';
import { Fragment, useMemo } from 'react';

import type { InlineSpan } from './bossNotes.utils';
import { parseMarkdownLite } from './bossNotes.utils';

/** `#` reste plus petit que le titre du tiroir. */
const TITLE_ORDER = { 1: 4, 2: 5, 3: 6 } as const;

const Spans = ({ spans }: { spans: InlineSpan[] }) => (
  <>
    {spans.map((span, index) =>
      span.bold ? (
        <strong key={index}>{span.text}</strong>
      ) : (
        <Fragment key={index}>{span.text}</Fragment>
      ),
    )}
  </>
);

/**
 * Rendu du markdown minimal d'une note de boss. Le texte passe par React, qui
 * l'échappe : pas de `dangerouslySetInnerHTML`.
 */
export function MarkdownLite({ content }: { content: string }) {
  const blocks = useMemo(() => parseMarkdownLite(content), [content]);

  return (
    <Stack gap="xs">
      {blocks.map((block, index) => {
        if (block.type === 'heading') {
          return (
            <Title key={index} order={TITLE_ORDER[block.level]}>
              <Spans spans={block.spans} />
            </Title>
          );
        }
        if (block.type === 'list') {
          return (
            <List key={index} size="sm" spacing={2}>
              {block.items.map((item, itemIndex) => (
                <List.Item key={itemIndex}>
                  <Spans spans={item} />
                </List.Item>
              ))}
            </List>
          );
        }
        return (
          <Text key={index} size="sm">
            {block.lines.map((line, lineIndex) => (
              <Fragment key={lineIndex}>
                {lineIndex > 0 && <br />}
                <Spans spans={line} />
              </Fragment>
            ))}
          </Text>
        );
      })}
    </Stack>
  );
}
