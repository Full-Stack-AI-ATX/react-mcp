// AIDEV-NOTE: This utility provides helper functions to format data streams
// according to the Vercel AI SDK's stream protocol.
// See: https://ai-sdk.dev/docs/ai-sdk-ui/stream-protocol

type StreamPartType = 'text' | 'data' | 'error';

/**
 * Formats a chunk of data into the Vercel AI SDK's stream protocol format.
 * @param type The type of the data part.
 * @param value The value to encode.
 * @returns A formatted string for the stream.
 */
export function formatStreamPart(type: StreamPartType, value: any): string {
  const jsonValue = JSON.stringify(value);

  switch (type) {
    case 'text':
      // Text part: `0:"..."\n`
      return `0:${jsonValue}\n`;
    case 'data':
      // Data part: `2:JSONValue\n`
      // The `useChat` data property receives the raw JSON value.
      return `2:${jsonValue}\n`;
    case 'error':
        // Error part: `3:"..."\n`
      return `3:${jsonValue}\n`;
    default:
      throw new Error(`Unsupported stream part type: ${type}`);
  }
}
