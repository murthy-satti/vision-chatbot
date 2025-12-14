import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

// --- START: Next.js State Management Fix ---

// 1. Initialize the client outside the handler to leverage Next.js caching.
// This client will be reused across requests.
const ai = new GoogleGenAI({});

const MODEL_NAME = "gemini-2.5-flash-lite";
const SYSTEM_INSTRUCTION = `
Your name is Vision, an AI chatbot.
You were created by Google and developed by Murthy.
Prefer answers within 8–10 lines when short.
Be clear, accurate, and direct.
`;

// 2. Use a GLOBAL object to hold the chat instance.
// NOTE: This global state only works reliably in development (where the server is long-lived)
// and non-serverless deployment environments. For production serverless, you need
// a database (like Redis or Firestore) to store the history and retrieve it on each request.
global.chatInstance = global.chatInstance || null;


// 3. Function to initialize or reset the CHAT session
function startNewChat() {
    global.chatInstance = ai.chats.create({
        model: MODEL_NAME,
        config: {
            systemInstruction: SYSTEM_INSTRUCTION,
        },
    });
    console.log("New stateful chat session started (Global state update).");
}

// 4. Initialize on file load (will be reused by V8 module caching)
if (!global.chatInstance) {
    startNewChat();
}

// --- END: Next.js State Management Fix ---


// Next.js API Route Handler for POST requests (Chat)
export async function POST(req) {
    try {
        const { prompt, action } = await req.json();

        // 5. Handle Chat Reset Request
        if (action === 'reset') {
            startNewChat();
            return NextResponse.json({ message: "Chat session reset successfully." });
        }

        // 6. Prompt validation
        if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') {
            return NextResponse.json({
                error: "Invalid Request",
                detail: "The 'prompt' field in the request body is required and cannot be empty.",
            }, { status: 400 });
        }

        // 7. Use the global chat instance
        const chat = global.chatInstance;

        // Use chat.sendMessage() which automatically handles the history
        const result = await chat.sendMessage({ message: prompt });

        const text = result.text || "No response";

        return NextResponse.json({ text });

    } catch (err) {
        console.error("Gemini Error:", err);
        return NextResponse.json({
            error: "Gemini API error",
            detail: err.message,
        }, { status: 500 });
    }
}