/// <reference types="vite/client" />

declare module '*.pcpsp?raw' {
  const content: string;
  export default content;
}

declare module '*.prec?raw' {
  const content: string;
  export default content;
}

declare module '../../../dataset/*.json' {
  const value: unknown;
  export default value;
}
