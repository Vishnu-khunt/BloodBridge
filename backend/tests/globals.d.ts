declare module 'chai' {
  export const expect: any;
}

declare const describe: (name: string, fn: () => void) => void;
declare const it: (name: string, fn: () => void | Promise<void>) => void;
declare const before: (fn: () => void | Promise<void>) => void;
declare const after: (fn: () => void | Promise<void>) => void;
