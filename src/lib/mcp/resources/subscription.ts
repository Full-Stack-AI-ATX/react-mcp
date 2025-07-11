import {
  ResourceListChangedNotificationSchema,
  ResourceUpdatedNotificationSchema
}                                         from '@modelcontextprotocol/sdk/types.js';
import { mcpClient }    from '@Lib/mcp/client';
import cache                              from '@Lib/cache';

let subscribed = false;

// Handle resource removal/creation and content-updates for specific resources via MCP notifications.
async function ensureSubscription(): Promise<void> {
  if (subscribed) return;

  await mcpClient.setNotificationHandler(ResourceListChangedNotificationSchema, () => {
    console.log('🗂️ Resource list changed, invalidating schemas & summary');
    cache.remove('schemas');
    cache.remove('summary');
    cache.remove('tables');
  });

  await mcpClient.setNotificationHandler(ResourceUpdatedNotificationSchema, ({ params }) => {
    const { uri } = params;
    console.log('🔄 Resource content updated, invalidating cache for URI:', uri);

    cache.remove(`${uri}.tableSchema`);
  });

  subscribed = true;
}


export default ensureSubscription;
