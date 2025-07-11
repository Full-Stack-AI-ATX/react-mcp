import type {
  CoreMessage,
  ToolCallPart,
  ToolResultPart
}                         from 'ai';

import { generateText }   from 'ai';
import { openai }         from '@ai-sdk/openai';

import { listResources }  from '@Lib/mcp/resources';
import cache              from '@Lib/cache';


async function getDbInfo(): Promise<string> {
  const cacheKey = 'dbInfo';

  if (cache.has(cacheKey)) {
    console.log('[dbInfo] Returning cached database info.');
    return cache.get(cacheKey) as string;
  }

  const systemContext = `Your task is to provide database connection details. First, inspect the available resources to find the connection information.

After you have the information, you MUST respond in the following format and nothing else. Fill in the placeholders (e.g., <uri>, <name>, <username>) with the details you found.

DATABASE CONNECTION INFORMATION:
You ONLY have access to this database
- Database URI: <uri>
- Database Name: <name>
- Database User: <username>`;

  const messages: CoreMessage[] = [{
    role: 'user',
    content: 'what is the basic database connection information'
  }];

  console.log('Calling generateText for priming...');
  const { text } = await generateText({
    model: openai('gpt-4o-mini'),
    system: systemContext,
    maxSteps: 2,
    messages,
    tools: { listResources },
    onStepFinish: async (result) => {
      console.log('--- Step Finished ---');
      if (result.toolCalls && result.toolCalls.length > 0) {
        console.log('Tool calls:', result.toolCalls.map((tc: ToolCallPart) => ({ toolCallId: tc.toolCallId, toolName: tc.toolName, args: tc.args })));
      }
      if (result.toolResults && result.toolResults.length > 0) {
        console.log('Tool results:', result.toolResults.map((tr: ToolResultPart) => ({ toolCallId: tr.toolCallId, toolName: tr.toolName, result: tr.result })));
      }
    }
  });

  cache.set(cacheKey, text);
  console.log('Priming successful. Cached DB info.');

  return text;
}


export default getDbInfo;
