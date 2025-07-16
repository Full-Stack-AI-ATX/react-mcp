// THIS does not use the Vercel AI SDK
// It is a direct implementation of the OpenAI API

import type {
  ChatCompletionMessageParam,
  ChatCompletionToolChoiceOption
}                                       from 'openai/resources/chat/completions';
import OpenAI                           from 'openai';

import { mcpClient }                    from '@Lib/mcp/client';
import { SYSTEM_PROMPT }                from '@Lib/prompts/systemPrompt';
import { getTools }                     from '@Lib/__otherWay';
import { formatStreamPart }             from '@Lib/__otherWay/protocol';


const openai = new OpenAI();
const encoder = new TextEncoder();

async function POST(req: Request) {
  console.log('Received POST request to /api/chat');
  const { messages }: {
    messages: ChatCompletionMessageParam[]
  } = await req.json();
  console.log('Request body parsed:', { messages });

  const allMessages: ChatCompletionMessageParam[] = [
    {
      role: 'system',
      content: SYSTEM_PROMPT
    },
    ...messages
  ];

  // fetch tools
  const tools = await getTools();
  const toolDetailsForLogging = Object.fromEntries(
    Object.entries(tools).map(([name, tool]) => [
      name,
      { description: tool.function.description, parameters: tool.function.parameters },
    ]),
  );
  console.log(
    `Fetched ${Object.keys(tools).length} tools:`,
    JSON.stringify(toolDetailsForLogging, null, 2),
  );

  const stream = await openai.chat.completions.create({
    model: 'gpt-4-turbo',
    messages: allMessages,
    tools,
    tool_choice: 'auto' as ChatCompletionToolChoiceOption,
    stream: true
  });
  console.log('Created initial OpenAI stream.');

  const iterator = stream[Symbol.asyncIterator]();
  const firstChunkResult = await iterator.next();

  if (firstChunkResult.done) {
    return new Response(
      'Empty response from language model.',
      { status: 500 }
    );
  }
  const firstChunk = firstChunkResult.value;

  const toolCallChunks = firstChunk.choices[0]?.delta?.tool_calls;

  // If no tool call was found in the first chunk, stream text response directly.
  if (!toolCallChunks || !toolCallChunks[0]) {
    console.log('No tool call detected. Returning direct text stream.');

    const responseStream = new ReadableStream({
      async start(controller) {
        // Yield the first chunk we already read
        const text = firstChunk.choices[0]?.delta?.content;
        if (text) {
          controller.enqueue(encoder.encode(formatStreamPart('text', text)));
        }

        // Yield the rest of the stream
        for await (const chunk of { [Symbol.asyncIterator]: () => iterator }) {
          const text = chunk.choices[0]?.delta?.content;
          if (text) {
            controller.enqueue(encoder.encode(formatStreamPart('text', text)));
          }
        }
        controller.close();
      }
    });

    return new Response(responseStream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'x-vercel-ai-data-stream': 'v1'
      }
    });
  }

  type ToolCallAccumulator = {
    id: string;
    functionName: string;
    argumentChunks: string[];
  };
  const accumulatedToolCalls = new Map<number, ToolCallAccumulator>();

  // Initialize tool calls from the first chunk
  for (const toolCallChunk of toolCallChunks) {
    if (toolCallChunk.id) {
      accumulatedToolCalls.set(toolCallChunk.index, {
        id: toolCallChunk.id,
        functionName: toolCallChunk.function?.name ?? '',
        // Store argument chunks in an array to avoid repeated string concatenation.
        argumentChunks: [toolCallChunk.function?.arguments ?? '']
      });
    }
  }

  // Consume the rest of the stream to accumulate argument chunks
  for await (const chunk of { [Symbol.asyncIterator]: () => iterator }) {
    const delta = chunk.choices[0]?.delta;
    if (delta?.tool_calls) {
      for (const toolCallChunk of delta.tool_calls) {
        if (toolCallChunk.index !== undefined) {
          const toolCall = accumulatedToolCalls.get(toolCallChunk.index);
          if (toolCall && toolCallChunk.function?.arguments) {
            toolCall.argumentChunks.push(toolCallChunk.function.arguments);
          }
        }
      }
    } else if (!delta?.tool_calls) {
      // End of tool call stream
      break;
    }
  }

  // Reconstruct the final tool calls after the stream is complete.
  const finalToolCalls = Array.from(accumulatedToolCalls.values()).map(acc => ({
    id: acc.id,
    type: 'function' as const,
    function: {
      name: acc.functionName,
      arguments: acc.argumentChunks.join('')
    }
  }));

  // log the tool calls to the console
  finalToolCalls.forEach(
    tc => console.log(`Tool call detected: ${tc.function.name}`)
  );

  const toolMessages: ChatCompletionMessageParam[] = [];

  try {
    const toolPromises = finalToolCalls.map(async (toolCall) => {
      const toolName = toolCall.function.name;
      const toolArgs = JSON.parse(toolCall.function.arguments);
      console.log(`Parsed tool arguments for ${toolName}:`, toolArgs);

      const mcpToolResult = await mcpClient.callTool({
        name: toolName,
        arguments: toolArgs
      });
      console.log(`MCP tool "${toolName}" called successfully.`);

      if (
        !Array.isArray(mcpToolResult.content) ||
        mcpToolResult.content.length === 0 ||
        !mcpToolResult.content[0] ||
        typeof mcpToolResult.content[0].text !== 'string'
      ) {
        throw new Error(
          `Received an invalid or empty response from the MCP server for tool ${toolName}.`
        );
      }
      const toolResultContent = mcpToolResult.content[0].text;
      console.log(`Received tool result content for ${toolName}:`, toolResultContent);

      return {
        tool_call_id: toolCall.id,
        role: 'tool' as const,
        name: toolName,
        content: toolResultContent
      };
    });

    const promiseResults = await Promise.allSettled(toolPromises);

    promiseResults.forEach((result, index) => {
      const toolCall = finalToolCalls[index];
      // This check handles sparse arrays and satisfies the linter.
      if (!toolCall) {
        return;
      }

      if (result.status === 'fulfilled') {
        const toolResult = result.value;
        toolMessages.push({
          tool_call_id: toolResult.tool_call_id,
          role: 'tool',
          content: toolResult.content
        });
      } else {
        const errorMessage = `❌ Error in ${toolCall.function.name} tool: ${result.reason instanceof Error ? result.reason.message : 'Unknown error'}`;
        console.error(`Error in ${toolCall.function.name} tool call:`, result.reason);
        toolMessages.push({
          tool_call_id: toolCall.id,
          role: 'tool',
          content: JSON.stringify({ type: 'error', message: errorMessage })
        });
      }
    });

  } catch (error) {
    console.error(`Error in tool call processing:`, error);
    // This top-level catch will handle connection errors or other unexpected issues.
    // We can't create specific error messages per tool, so we send a general one.
    const content = {
      type: 'error',
      message: `❌ Error processing tools: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`
    };
    // Send a data message with the error and close the stream.
    const responseStream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(formatStreamPart('data', [content])));
        controller.close();
      }
    });
    return new Response(responseStream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'x-vercel-ai-data-stream': 'v1'
      }
    });
  }

  // Append the assistant's tool call and the tool's result to the message history.
  allMessages.push({
    role: 'assistant',
    content: null,
    tool_calls: finalToolCalls
  });
  allMessages.push(...toolMessages);

  // Make a second, streaming call to the LLM with the tool's result.
  console.log('Creating final OpenAI stream with tool result.');
  const finalStream = await openai.chat.completions.create({
    model: 'gpt-4-turbo',
    messages: allMessages,
    stream: true
  });

  const responseStream = new ReadableStream({
    async start(controller) {
      for await (const chunk of finalStream) {
        const text = chunk.choices[0]?.delta?.content;
        if (text) {
          controller.enqueue(encoder.encode(formatStreamPart('text', text)));
        }
      }
      controller.close();
    }
  });

  console.log('Returning response stream after tool call.');
  return new Response(responseStream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'x-vercel-ai-data-stream': 'v1'
    }
  });
}


export { POST };
