import getDbInfo from '@Lib/llm/dbInfo';


async function GET() {
  console.log('Received GET request to /api/chat/prime');

  try {
    await getDbInfo();

    return new Response(JSON.stringify({ success: true, message: 'Priming successful' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error in chat priming route:', error);
    const err = error instanceof Error ? error : new Error(String(error));
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}


export { GET };
