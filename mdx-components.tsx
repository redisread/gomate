import type { MDXComponents } from 'mdx/types';
import { Callout, Card, Cards, Step, Steps, YouTube, MapEmbed } from '@/components/mdx';

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    Callout,
    Card,
    Cards,
    Step,
    Steps,
    YouTube,
    MapEmbed,
    ...components,
  };
}
