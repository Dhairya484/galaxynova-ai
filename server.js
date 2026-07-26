require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { GoogleGenAI } = require("@google/genai");

const app = express();

app.use(cors());
app.use(express.json({ limit: "20mb" }));
app.use(express.static(__dirname));

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});

// DEBUG
console.log("====================================");
console.log("API Key exists:", !!process.env.GEMINI_API_KEY);
console.log("API Key prefix:", process.env.GEMINI_API_KEY?.substring(0, 5));
console.log("====================================");

// ======================
// CHAT
// ======================

app.post("/chat", async (req, res) => {

    try {

        const messages = req.body.messages || [];

        const contents = messages.map(message => ({
            role: message.role === "assistant" ? "model" : "user",
            parts: [
                {
                    text: message.text
                }
            ]
        }));

        const response = await ai.models.generateContent({

            model: "gemini-flash-latest",

            contents

        });

        res.json({
            reply: response.text
        });

    } catch (err) {

    console.error("========== FULL ERROR ==========");
    console.error(err);
    console.error("Stack:");
    console.error(err.stack);
    console.error("================================");

    res.status(500).json({
        reply: err.message
    });

}

});

// ======================
// IMAGE GENERATION
// ======================

app.post("/generate-image", async (req, res) => {

    try {

        const prompt = req.body.prompt;

        const response = await ai.models.generateContent({

            model: "gemini-3.1-flash-image",

            contents: prompt

        });

        let image = null;
        let text = "";

        if (response.candidates) {

            for (const part of response.candidates[0].content.parts) {

                if (part.text) {

                    text += part.text;

                }

                if (part.inlineData) {

                    image =
                        `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;

                }

            }

        }

        res.json({

            text,

            image

        });

    } catch (err) {

        console.error(err);

        res.status(500).json({

            error: err.message

        });

    }

});

// ======================
// IMAGE ANALYSIS
// ======================

app.post("/analyze-image", async (req, res) => {

    try {

        const { prompt, image } = req.body;

        const response = await ai.models.generateContent({

            model: "gemini-flash-latest",

            contents: [

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

        });

        res.json({

            reply: response.text

        });

    }

    catch(err){

        console.error(err);

        res.status(500).json({

            reply: err.message

        });

    }

});

// ======================
// MODELS
// ======================

app.get("/models", async (req, res) => {

    try {

        const models = await ai.models.list();

        res.json(models);

    }

    catch(err){

        console.error(err);

        res.status(500).json(err);

    }

});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {

    console.log("");
    console.log("====================================");
    console.log("🚀 Gemini AI Server Started");
    console.log(`🌐 http://localhost:${PORT}`);
    console.log("====================================");
    console.log("");

});
