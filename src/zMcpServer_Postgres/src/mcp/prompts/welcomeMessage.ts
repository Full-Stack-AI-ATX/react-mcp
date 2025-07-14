import type { Prompt }          from '@modelcontextprotocol/sdk/types.js';
import type { JSONSchemaType }  from 'ajv';


interface WelcomePromptSchema {
  userName: string;
  role: 'admin' | 'user' | 'guest';
}

const welcomePromptSchema: JSONSchemaType<WelcomePromptSchema> = {
  type: 'object',
  properties: {
    userName: { type: 'string', description: 'The name of the user to welcome.' },
    role: { type: 'string', description: 'The role of the user.', enum: ['admin', 'user', 'guest'] },
  },
  required: ['userName', 'role']
};

async function welcomeMessageHandler(args: WelcomePromptSchema): Promise<Prompt> {
  const template = `Hello, ${args.userName}! Welcome to our platform. We're excited to have you. Your role is: ${args.role}.`;
  return {
    name: 'welcome_message',
    messages: [
      {
        role: 'assistant',
        content: { type: 'text', text: template }
      }
    ]
  };
}


export {
  welcomePromptSchema,
  welcomeMessageHandler
};
