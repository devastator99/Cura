import { Configuration, OpenAIApi } from "openai";

const openai = new OpenAIApi(
  new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
  })
);

export async function generateGPTResponse(prompt) {
  try {
    const response = await openai.createChatCompletion({
      model: "gpt-4", // Use the model you prefer
      messages: [{ role: "user", content: prompt }],
      max_tokens: 1000,
      temperature: 0.7,
    });

    return response.data.choices[0].message.content;
  } catch (error) {
    console.error("Error with OpenAI API:", error);
    throw new Error("Failed to generate AI response");
  }
}
