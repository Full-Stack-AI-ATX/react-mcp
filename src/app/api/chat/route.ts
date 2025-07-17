import type {
  CoreMessage,
  ToolCallPart,
  ToolResultPart
}                         from 'ai';

import { streamText }     from 'ai';
import { openai }         from '@ai-sdk/openai';

import listTools          from '@Lib/mcp/tools';
import * as resourceTools from '@Lib/mcp/resources';
import getDbInfo          from '@Lib/llm/dbInfo';
import { SYSTEM_PROMPT }  from '@Lib/prompts/systemPrompt';


async function POST(req: Request) {
  console.log('Received POST request to /api/chat');
  const { messages }: { messages: CoreMessage[] } = await req.json();
  // console.log('Request body parsed:', { messages });

  console.log('Fetching tools and summary...');
  const mcpTools      = await listTools();
  const dbInfoContext = await getDbInfo();

  if (!dbInfoContext) {
    console.error('No dbInfo found in cache. Check why the fetching/cache failed.');
    return new Response(JSON.stringify({ error: 'Cannot proceed without database context.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const allTools = { ...mcpTools, ...resourceTools };

  // tool details for logging
  // const toolDetailsForLogging = Object.fromEntries(
  //   Object.entries(allTools as Record<string, VercelTool>).map(([name, tool]) => [
  //     name,
  //     { description: tool.description, parameters: tool.parameters },
  //   ]),
  // );
  // console.log(
  //   `Fetched ${Object.keys(allTools).length} tools:`,
  //   JSON.stringify(toolDetailsForLogging, null, 2),
  // );

  // build a minimal, dynamic system prompt
  const systemContext = `${SYSTEM_PROMPT}\n${dbInfoContext}`;

  console.log('Calling streamText...');
  try {
    const result = await streamText({
      model: openai('gpt-4o-mini'),
      system: systemContext,
      messages,
      tools: allTools,
      toolChoice: 'auto',
      maxSteps: 5,
      onStepFinish: async (result) => {
        console.log('--- Step Finished ---');
        if (result.toolCalls && result.toolCalls.length > 0) {
          console.log('Tool calls:', result.toolCalls.map((tc: ToolCallPart) => ({ toolCallId: tc.toolCallId, toolName: tc.toolName, args: tc.args })));
        }
        if (result.toolResults && result.toolResults.length > 0) {
          const firstTwoResults = result.toolResults.slice(0, 2).map((tr: ToolResultPart) => ({
            toolCallId: tr.toolCallId,
            toolName: tr.toolName,
            result: tr.result
          }));
          console.log('Tool results (first two):', firstTwoResults);
        }
      },
      onFinish: async (result) => {
        console.log('streamText finished.', {
          text: result.text,
          finishReason: result.finishReason,
          usage: result.usage
        });
        console.log('MCP client remains connected for reuse.');
      },
      onError: (error) => {
        console.error('Error in chat route:', error);
        console.log('MCP client remains connected for reuse.');
      }
    });

    console.log('Returning data stream response.');
    return result.toDataStreamResponse();
  } catch (error) {
    console.error('Error in chat route:', error);
    const err = error instanceof Error ? error : new Error(String(error));
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}


export { POST };
