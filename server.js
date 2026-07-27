require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { GoogleGenAI } = require("@google/genai");

const app = express();

app.use(cors());
app.use(express.json({ limit: "20mb" }));
app.use(express.static(__dirname));

// ======================================
// LOAD ALL GEMINI API KEYS
// ======================================

const apiKeys = [];

for (let i = 1; i <= 20; i++) {

    const key = process.env[`GEMINI_API_KEY_${i}`];

    if (key && key.trim() !== "") {

        apiKeys.push(key.trim());

    }

}

// Backward compatibility
if (apiKeys.length === 0 && process.env.GEMINI_API_KEY) {

    apiKeys.push(process.env.GEMINI_API_KEY);

}

if (apiKeys.length === 0) {

    throw new Error("No Gemini API Keys found.");

}

console.log("");
console.log("====================================");
console.log(`✅ Loaded ${apiKeys.length} Gemini API Key(s).`);
console.log("====================================");
console.log("");

// ======================================
// CREATE CLIENTS
// ======================================

const clients = apiKeys.map(key =>
    new GoogleGenAI({
        apiKey: key
    })
);

// ======================================
// FALLBACK FUNCTION
// ======================================

async function generateWithFallback(options) {

    let lastError = null;

    for (let i = 0; i < clients.length; i++) {

        try {

            console.log(`🔑 Trying API Key ${i + 1}`);

            return await clients[i].models.generateContent(options);

        }

        catch (err) {

            lastError = err;

            const msg = JSON.stringify(err);

            // Try next key only if quota/rate limited
            if (
                msg.includes("429") ||
                msg.includes("RESOURCE_EXHAUSTED") ||
                msg.includes("Quota exceeded")
            ) {

                console.log(`⚠️ API Key ${i + 1} exhausted.`);

                continue;

            }

            // Any other error should stop immediately
            throw err;

        }

    }

    throw lastError;

}

// ======================
// CHAT
// ======================

// ======================
// CHAT
// ======================

app.post("/chat", async (req, res) => {

    try {

        const messages = req.body.messages || [];

        const contents = messages.map(message => ({

            role: message.role === "assistant"
                ? "model"
                : "user",

            parts: [

                {
                    text: message.text
                }

            ]

        }));

        const response = await generateWithFallback({

            model: "gemini-flash-latest",

            contents

        });

        res.json({

            reply: response.text

        });

    }

    catch (err) {

        console.error("");
        console.error("========== CHAT ERROR ==========");
        console.error(err);
        console.error("================================");
        console.error("");

        res.status(500).json({

            reply: err.message || "Unknown Error"

        });

    }

});
// ======================
// IMAGE GENERATION
// ======================

app.post("/generate-image", async (req, res) => {

    try {

        const prompt = req.body.prompt;

        const response = await generateWithFallback({

            model: "gemini-3.1-flash-image",

            contents: [
    {
        role: "user",
        parts: [
            {
                text: prompt
            }
        ]
    }
]

        });

        let image = null;
        let text = "";

        if (response.candidates) {

            const parts = response.candidates[0].content.parts || [];

            for (const part of parts) {

                if (part.text) {

                    text += part.text;

                }

                if (part.inlineData) {

                    image = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;

                }

            }

        }

        res.json({

            text,

            image

        });

    }

    catch (err) {

        console.error("");
        console.error("========== IMAGE GENERATION ERROR ==========");
        console.error(err);
        console.error("============================================");
        console.error("");

        res.status(500).json({

            error: err.message || "Image generation failed."

        });

    }

});

// ======================
// IMAGE ANALYSIS
// ======================

app.post("/analyze-image", async (req, res) => {

    try {

        const { prompt, image } = req.body;

        const response = await generateWithFallback({

            model: "gemini-flash-latest",

            contents: [
    {
        role: "user",
        parts: [
            {
                text: prompt
            },
            {
                inlineData: {
                    mimeType: "image/png",
                    data: image
                }
            }
        ]
    }
]
        });

        res.json({

            reply: response.text

        });

    }

    catch (err) {

        console.error("");
        console.error("========== IMAGE ANALYSIS ERROR ==========");
        console.error(err);
        console.error("==========================================");
        console.error("");

        res.status(500).json({

            reply: err.message || "Image analysis failed."

        });

    }

});

// ======================
// MODELS
// ======================

app.get("/models", async (req, res) => {

    let lastError = null;

    for (let i = 0; i < clients.length; i++) {

        try {

            console.log(`🔑 Listing models with API Key ${i + 1}`);

            const models = await clients[i].models.list();

            return res.json(models);

        }

        catch (err) {

            lastError = err;

            console.log(`⚠️ API Key ${i + 1} failed while listing models.`);

        }

    }

    res.status(500).json({

        error: lastError?.message || "Unable to list models."

    });

});

// ======================
// START SERVER
// ======================

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {

    console.log("");
    console.log("====================================");
    console.log("🚀 GalaxyNova AI Server Started");
    console.log(`🌐 http://localhost:${PORT}`);
    console.log(`🔑 Loaded ${clients.length} Gemini API Key(s)`);
    console.log("====================================");
    console.log("");

});
