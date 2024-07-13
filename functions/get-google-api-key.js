exports.handler = async () => {
    console.log('Environment Variable GOOGLE_API_KEY:', process.env.GOOGLE_API_KEY); // Add this line for debugging
  
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*', // Allow CORS from any origin
        'Access-Control-Allow-Headers': 'Content-Type', // Allow specific headers
      },
      body: process.env.GOOGLE_API_KEY,
    };
  };
  