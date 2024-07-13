exports.handler = async () => {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*', // Allow CORS from any origin
        'Access-Control-Allow-Headers': 'Content-Type', // Allow specific headers
      },
      body: process.env.GOOGLE_API_KEY,
    };
  };
  