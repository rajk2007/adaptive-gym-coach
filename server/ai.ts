/**
 * AI Integration Module
 * Handles all AI API calls with strict JSON validation and retry logic
 */

interface AIMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface AIResponse {
  success: boolean;
  data?: any;
  error?: string;
}

/**
 * Validates if a string is valid JSON
 */
function isValidJSON(str: string): boolean {
  try {
    JSON.parse(str);
    return true;
  } catch {
    return false;
  }
}

/**
 * Extracts JSON from AI response, handling potential markdown code blocks
 */
function extractJSON(content: string): string | null {
  // Try to parse directly
  if (isValidJSON(content)) {
    return content;
  }

  // Try to extract from markdown code block
  const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (jsonMatch && isValidJSON(jsonMatch[1])) {
    return jsonMatch[1];
  }

  // Try to find JSON object in the content
  const objectMatch = content.match(/\{[\s\S]*\}/);
  if (objectMatch && isValidJSON(objectMatch[0])) {
    return objectMatch[0];
  }

  return null;
}

/**
 * Call OpenRouter API with retry logic
 * Automatically retries once if JSON validation fails
 */
export async function callAI(
  messages: AIMessage[],
  maxRetries: number = 1
): Promise<AIResponse> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const baseUrl = process.env.OPENROUTER_BASE_URL;
  const modelName = process.env.MODEL_NAME;

  if (!apiKey || !baseUrl || !modelName) {
    return {
      success: false,
      error: "Missing OpenRouter configuration",
    };
  }

  let lastError: string | null = null;
  let lastContent: string | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: modelName,
          messages,
          max_tokens: 4000,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        lastError = `API Error: ${response.status} - ${JSON.stringify(errorData)}`;
        continue;
      }

      const data = await response.json();

      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        lastError = "Invalid API response structure";
        continue;
      }

      const content = data.choices[0].message.content;
      lastContent = content;

      // Try to extract and validate JSON
      const jsonStr = extractJSON(content);

      if (!jsonStr) {
        lastError = "Could not extract valid JSON from response";
        if (attempt < maxRetries) {
          // Retry with explicit instruction
          messages.push({
            role: "assistant",
            content,
          });
          messages.push({
            role: "user",
            content:
              "Please provide ONLY valid JSON, no markdown formatting or extra text.",
          });
          continue;
        }
        return {
          success: false,
          error: `Failed to extract JSON after ${maxRetries + 1} attempts. Last response: ${content.substring(0, 200)}`,
        };
      }

      try {
        const parsedData = JSON.parse(jsonStr);
        return {
          success: true,
          data: parsedData,
        };
      } catch (parseError) {
        lastError = `JSON parse error: ${parseError}`;
        if (attempt < maxRetries) {
          continue;
        }
        return {
          success: false,
          error: lastError,
        };
      }
    } catch (error) {
      lastError = `Network error: ${error}`;
      if (attempt < maxRetries) {
        // Wait before retry
        await new Promise((resolve) => setTimeout(resolve, 1000));
        continue;
      }
    }
  }

  return {
    success: false,
    error: lastError || "Unknown error",
  };
}

/**
 * Generate base workout plan
 */
export async function generateWorkoutPlan(profileData: any): Promise<AIResponse> {
  const systemPrompt = `You are a certified professional strength coach with 15+ years of experience.

Generate a personalized gym workout plan based on the user's profile.

Rules:
- Safe and realistic for the user's experience level
- Progressive overload friendly
- Balanced muscle group distribution
- Include warmup guidance
- Avoid dangerous advice
- Tailor volume and intensity to experience level

Return ONLY valid JSON with this exact structure:
{
  "weekly_split": "string (e.g., 'Upper/Lower', 'Push/Pull/Legs')",
  "days": [
    {
      "day": "string (e.g., 'Monday')",
      "focus": "string (muscle groups focused)",
      "exercises": [
        {
          "name": "string",
          "sets": "number",
          "reps": "string (e.g., '8-10')",
          "rest": "string (e.g., '90 seconds')"
        }
      ]
    }
  ],
  "tips": "string (general guidance)"
}`;

  const userPrompt = `User Profile:
Age: ${profileData.age}
Gender: ${profileData.gender}
Height: ${profileData.height}cm
Weight: ${profileData.weight}kg
Goal: ${profileData.goal}
Experience Level: ${profileData.experienceLevel}
Days Available: ${profileData.daysPerWeek}
Equipment Access: ${profileData.equipmentAccess}

Generate a customized workout plan.`;

  return callAI(
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    1
  );
}

/**
 * Generate weekly workout adjustment
 */
export async function generateWeeklyAdjustment(
  profileData: any,
  workoutLogs: any[],
  currentPlan: any
): Promise<AIResponse> {
  const systemPrompt = `You are an elite performance coach specializing in adaptive training.

Analyze the user's weekly workout logs and adjust their next week's plan intelligently.

Rules:
- Increase load if strength improved
- Reduce volume if fatigue is high (RPE 9-10 frequently)
- Suggest safe exercise swaps if pain is mentioned
- Maintain alignment with user's fitness goal
- Be conservative with changes (max 10% increase)

Return ONLY valid JSON with this structure:
{
  "adjustments": [
    {
      "exercise": "string",
      "change": "string (increase/decrease/swap)",
      "reason": "string",
      "new_sets": "number or null",
      "new_reps": "string or null",
      "replacement_exercise": "string or null"
    }
  ],
  "overall_feedback": "string",
  "fatigue_level": "low/medium/high"
}`;

  const userPrompt = `User Profile:
${JSON.stringify(profileData, null, 2)}

Current Plan:
${JSON.stringify(currentPlan, null, 2)}

Last Week's Logs:
${JSON.stringify(workoutLogs, null, 2)}

Generate adjustments for next week's plan.`;

  return callAI(
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    1
  );
}

/**
 * Generate AI diet plan
 */
export async function generateDietPlan(profileData: any): Promise<AIResponse> {
  const systemPrompt = `You are a certified sports nutritionist with expertise in fitness nutrition.

Based on user data, calculate calories and macros aligned with their fitness goal.

Rules:
- Use evidence-based calculations
- Account for activity level
- Align with fitness goal (muscle gain, fat loss, etc.)
- Provide practical meal suggestions

Return ONLY valid JSON with this structure:
{
  "calories": "number",
  "protein_grams": "number",
  "carbs_grams": "number",
  "fat_grams": "number",
  "sample_meals": [
    {
      "meal": "string (breakfast/lunch/dinner/snack)",
      "foods": ["string"],
      "calories": "number",
      "protein": "number",
      "carbs": "number",
      "fat": "number"
    }
  ],
  "tips": "string (general nutrition guidance)"
}`;

  const userPrompt = `User Profile:
Age: ${profileData.age}
Gender: ${profileData.gender}
Weight: ${profileData.weight}kg
Goal: ${profileData.goal}
Experience Level: ${profileData.experienceLevel}
Days Per Week Training: ${profileData.daysPerWeek}

Generate a personalized nutrition plan.`;

  return callAI(
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    1
  );
}
