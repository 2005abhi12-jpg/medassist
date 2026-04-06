const OpenAI = require("openai");

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "dummy_key_to_prevent_startup_crash"
});

async function askAI(question) {
  // SIMULATION MODE: Handle demo cases if no real key is present
  const isMockKey = !process.env.OPENAI_API_KEY || 
                    process.env.OPENAI_API_KEY.includes("PASTE_YOUR_KEY_HERE") || 
                    process.env.OPENAI_API_KEY === "dummy_key_to_prevent_startup_crash";

  if (isMockKey) {
    const q = question.toLowerCase();
    
    // Check for SIDE EFFECTS first (More specific)
    if (q.includes("side effect")) {
      if (q.includes("parac")) return "Paracetamol side effects are rare, but include skin rashes or itching. Never exceed the daily dose!";
      if (q.includes("metfor")) return "Metformin can cause nausea, stomach upset, or a metallic taste. Always take it with food!";
      return "Common side effects for most mild medicines include a bit of dizziness or an upset stomach. Rest well!";
    }

    // Then check for generic descriptions
    if (q.includes("parac")) return "Paracetamol is for pain and fever. Take 1 tablet with water. Avoid empty stomach if possible!";
    if (q.includes("metfor")) return "Metformin helps control blood sugar. Take it with meals to avoid stomach upset. Keep hydrated!";
    
    // DYNAMIC CONTEXT CATCH-ALL:
    // If the question contains context like "Medicine: Telmikind Trio", use that!
    const contextMatch = question.match(/Medicine:\s*([^\n]+)/i);
    const medName = contextMatch ? contextMatch[1].trim() : "";
    
    if (medName && medName !== "Unknown") {
      return `${medName} is listed in your dashboard. Generally, you should take this medicine exactly as prescribed by your doctor, usually with water. For specific side effects, please consult the official patient leaflet or ask your pharmacist!`;
    }

    if (q.includes("how") || q.includes("take")) return "Take your medicine with a glass of water, usually after food, as scheduled in your dashboard!";

    return "I am scanning your profile... for specific details on that medicine, please ensure it is added to your dashboard. Generally, you should follow your doctor's exact instructions and stay hydrated!";
  }

  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: "You are a helpful healthcare assistant. Explain medicines in simple terms for elderly users."
      },
      {
        role: "user",
        content: question
      }
    ]
  });

  return response.choices[0].message.content;
}

module.exports = { askAI };
