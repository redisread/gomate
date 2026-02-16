import { Callout } from './callout';
import { Card, Cards } from './card';
import { Step, Steps } from './steps';
import { YouTube } from './youtube';
import { MapEmbed } from './map';
import type { MDXComponents } from 'mdx/types';

export function getMDXComponents(): MDXComponents {
  return {
    Callout,
    Card,
    Cards,
    Step,
    Steps,
    YouTube,
    MapEmbed,
  };
}

export { Callout, Card, Cards, Step, Steps, YouTube, MapEmbed };
