import type { Prompt }  from '@modelcontextprotocol/sdk/types.js';
import {
  welcomePromptSchema,
  welcomeMessageHandler
}                       from './welcomeMessage.js';


export const promptSchemas = {
  welcome_message: welcomePromptSchema
};

export const promptHandlers: Record<string, (args: any) => Promise<Prompt>> = {
  welcome_message: welcomeMessageHandler
};

export const prompts: Prompt[]  = [
  {
    name: 'welcome_message',
    description: 'Generates a personalized welcome message for a user.',
    arguments: Object.entries(welcomePromptSchema.properties as Record<string, { description: string }>).map(([name, schema]) => ({
      name,
      required: (welcomePromptSchema.required as string[]).includes(name),
      ...schema
    }))
  }
];
