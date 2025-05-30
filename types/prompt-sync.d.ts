declare module 'prompt-sync' {
  function prompt(promptText: string): string;
  export default function(promptConfig?: { sigint?: boolean }): typeof prompt;
}
