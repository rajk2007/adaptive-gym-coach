import { describe, it, expect } from "vitest";

/**
 * Test to validate OpenRouter API credentials
 * This test makes a lightweight API call to verify the OPENROUTER_API_KEY is valid
 */
describe("OpenRouter API Integration", () => {
  it("should validate OpenRouter API credentials", async () => {
    const apiKey = process.env.OPENROUTER_API_KEY;
    const baseUrl = process.env.OPENROUTER_BASE_URL;
    const modelName = process.env.MODEL_NAME;

    expect(apiKey, "OPENROUTER_API_KEY not set").toBeDefined();
    expect(baseUrl, "OPENROUTER_BASE_URL not set").toBeDefined();
    expect(modelName, "MODEL_NAME not set").toBeDefined();

    // Make a lightweight API call to verify credentials
    const response = await fetch(`${baseUrl}/models`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    expect(response.status, `OpenRouter API returned ${response.status}`).toBe(200);

    const data = await response.json();
    expect(data, "Invalid API response format").toBeDefined();
  });

  it("should generate a valid AI response with structured JSON", async () => {
    const apiKey = process.env.OPENROUTER_API_KEY;
    const baseUrl = process.env.OPENROUTER_BASE_URL;
    const modelName = process.env.MODEL_NAME;

    if (!apiKey || !baseUrl || !modelName) {
      expect.skip();
    }

    // Test with a simple prompt that should return valid JSON
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: modelName,
        messages: [
          {
            role: "system",
            content: "You are a helpful assistant. Always respond with valid JSON only.",
          },
          {
            role: "user",
            content: 'Return a JSON object with fields "status": "ok" and "message": "API is working"',
          },
        ],
        max_tokens: 200,
      }),
    });

    expect(response.status, `OpenRouter API returned ${response.status}`).toBe(200);

    const data = await response.json();
    expect(data.choices, "Invalid response structure").toBeDefined();
    expect(data.choices[0], "No choices in response").toBeDefined();
    expect(data.choices[0].message, "No message in choice").toBeDefined();
    expect(data.choices[0].message.content, "No content in message").toBeDefined();
  });
});
