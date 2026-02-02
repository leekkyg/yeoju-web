import 'react';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'livere-comment': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        'client-id'?: string;
      };
    }
  }
}

export {};
