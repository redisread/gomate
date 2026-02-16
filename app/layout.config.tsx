import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import { Mountain } from 'lucide-react';

export const baseOptions: BaseLayoutProps = {
  nav: {
    title: (
      <>
        <Mountain className="h-6 w-6 text-emerald-600" />
        <span className="font-semibold">GoMate</span>
      </>
    ),
    transparentMode: 'top',
  },
  links: [
    {
      text: '文档',
      url: '/docs',
      active: 'nested-url',
    },
    {
      text: '路线攻略',
      url: '/docs/guides',
      active: 'nested-url',
    },
    {
      text: '最佳实践',
      url: '/docs/best-practices',
      active: 'nested-url',
    },
  ],
};
