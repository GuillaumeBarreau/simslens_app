import { Text as MantineText, TextProps as MantineTextProps } from '@mantine/core';
import React, { PropsWithChildren } from 'react';

export type TextVariant = 'action-title' | 'brand' | 'section-label' | 'stat-value';

export interface TextProps extends MantineTextProps {
  variant?: TextVariant;
}

const variantStyles: Record<TextVariant, Partial<MantineTextProps>> = {
  'action-title': {
    size: 'lg',
    fw: 700,
    c: 'app.0',
  },
  brand: {
    c: 'brand.6',
    fw: 700,
  },
  'section-label': {
    size: 'xs',
    c: 'dimmed',
    fw: 700,
    tt: 'uppercase',
  },
  'stat-value': {
    size: 'xl',
    fw: 700,
    mt: 4,
  },
};

export const Text = React.forwardRef<HTMLDivElement, PropsWithChildren<TextProps>>(
  ({ variant, ...props }, ref) => {
    const mergedProps = variant ? { ...variantStyles[variant], ...props } : props;

    return <MantineText ref={ref} {...mergedProps} />;
  },
);
