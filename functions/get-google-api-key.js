exports.handler = async () => {
    return {
      statusCode: 200,
      body: process.env.GOOGLE_API_KEY,
    };
  };
  