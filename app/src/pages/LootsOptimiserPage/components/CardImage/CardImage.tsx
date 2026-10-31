import { Image } from '@mantine/core';
import React from 'react';

export function CardImage({ src, alt }: { src?: string; alt: string }): React.ReactElement | null {
  if (!src) return null;

  return <Image src={src} alt={alt} width={48} height={48} radius="md" fit="cover" />;
}
