const chat = document.getElementById("chat");
const prompt = document.getElementById("prompt");
const send = document.getElementById("send");
const imageBtn = document.getElementById("imageBtn");
const newChat = document.getElementById("newChat");
const uploadBtn = document.getElementById("uploadBtn");
const analyzeBtn = document.getElementById("analyzeBtn");

let history = [];

// =====================
// MESSAGE FUNCTIONS
// =====================

function scrollBottom() {
    chat.scrollTop = chat.scrollHeight;
}

function createMessage(type, html) {

    const div = document.createElement("div");

    div.className = "message " + type;

    div.innerHTML = `
        <div class="avatar">
            ${type === "user" ? "🧑" : "🤖"}
        </div>

        <div class="bubble">

            ${html}

        </div>
    `;

    chat.appendChild(div);

    scrollBottom();

    return div.querySelector(".bubble");
}

function addUserMessage(text) {

    createMessage(
        "user",
        text.replace(/\n/g, "<br>")
    );

}

function addAIMessage(text) {

    const html = marked.parse(text);

    createMessage("ai", html);

    document.querySelectorAll("pre code").forEach(el => {

        hljs.highlightElement(el);

    });

}

function addImage(src) {

    createMessage("ai", `
        <img
            src="${src}"
            class="generated-image"
        >
    `);

}

// =====================
// LOADING
// =====================

function addLoading() {

    return createMessage(
        "ai",
        `
        <div class="loading">

            <span></span>

            <span></span>

            <span></span>

        </div>
        `
    );

}

function removeLoading(element) {

    if (element) {

        element.parentElement.remove();

    }

}
// =====================
// CHAT
// =====================

async function sendMessage() {

    const text = prompt.value.trim();

    if (!text) return;

    addUserMessage(text);

    history.push({
        role: "user",
        text
    });

    prompt.value = "";

    const loading = addLoading();

    try {

        const response = await fetch("/chat", {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                messages: history
            })

        });

        const text = await response.text();

console.log(text);

const data = JSON.parse(text);

        removeLoading(loading);

        history.push({
            role: "assistant",
            text: data.reply
        });

        addAIMessage(data.reply);

    }

    catch (err) {

        removeLoading(loading);

        addAIMessage(
            "❌ Unable to contact the AI server."
        );

        console.error(err);

    }

}

// =====================
// IMAGE GENERATION
// =====================

async function generateImage() {

    const text = prompt.value.trim();

    if (!text) return;

    addUserMessage("🎨 " + text);

    prompt.value = "";

    const loading = addLoading();

    try {

        const response = await fetch("/generate-image", {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                prompt: text
            })

        });

        const data = await response.json();

        removeLoading(loading);

        if (data.text) {

            addAIMessage(data.text);

        }

        if (data.image) {

            addImage(data.image);

        }
        else {

            addAIMessage(
                "⚠️ No image was returned."
            );

        }

    }

    catch (err) {

        removeLoading(loading);

        addAIMessage(
            "❌ Image generation failed."
        );

        console.error(err);

    }

}
// =====================
// IMAGE UPLOAD
// =====================

const fileInput = document.createElement("input");

fileInput.type = "file";
fileInput.accept = "image/*";
fileInput.style.display = "none";

document.body.appendChild(fileInput);

let uploadedImage = null;

// Open file picker
function chooseImage() {
    fileInput.click();
}

// Convert image to Base64
fileInput.addEventListener("change", function () {

    const file = this.files[0];

    if (!file) return;

    const reader = new FileReader();

    reader.onload = function (e) {

        uploadedImage = e.target.result
            .split(",")[1];

        addUserMessage(`
            📷 Uploaded:
            <br><br>
            <img
                src="${e.target.result}"
                class="generated-image"
            >
        `);

    };

    reader.readAsDataURL(file);

});

// =====================
// IMAGE ANALYSIS
// =====================

async function analyzeImage() {

    if (!uploadedImage) {

        alert("Upload an image first.");

        return;

    }

    const question = prompt.value.trim();

    if (!question) {

        alert("Ask something about the image.");

        return;

    }

    prompt.value = "";

    const loading = addLoading();

    try {

        const response = await fetch("/analyze-image", {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({

                prompt: question,

                image: uploadedImage

            })

        });

        const data = await response.json();

        removeLoading(loading);

        addAIMessage(data.reply);

    }

    catch (err) {

        removeLoading(loading);

        addAIMessage(
            "❌ Unable to analyze image."
        );

        console.error(err);

    }

}

// =====================
// DRAG & DROP
// =====================

document.addEventListener("dragover", e => {

    e.preventDefault();

});

document.addEventListener("drop", e => {

    e.preventDefault();

    const file = e.dataTransfer.files[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) return;

    const reader = new FileReader();

    reader.onload = function (ev) {

        uploadedImage = ev.target.result
            .split(",")[1];

        addUserMessage(`
            📷 Image Dropped
            <br><br>

            <img
                src="${ev.target.result}"
                class="generated-image"
            >
        `);

    };

    reader.readAsDataURL(file);

});

// =====================
// PASTE IMAGE
// =====================

document.addEventListener("paste", function (e) {

    const items = e.clipboardData.items;

    for (const item of items) {

        if (item.type.indexOf("image") === -1)
            continue;

        const file = item.getAsFile();

        const reader = new FileReader();

        reader.onload = function (ev) {

            uploadedImage =
                ev.target.result.split(",")[1];

            addUserMessage(`
                📋 Image Pasted
                <br><br>

                <img
                    src="${ev.target.result}"
                    class="generated-image"
                >
            `);

        };

        reader.readAsDataURL(file);

    }

});
// ======================
// BUTTON EVENTS
// ======================

send.addEventListener("click", sendMessage);

imageBtn.addEventListener("click", generateImage);

uploadBtn.addEventListener("click", chooseImage);

analyzeBtn.addEventListener("click", analyzeImage);

// ======================
// ENTER TO SEND
// ======================

prompt.addEventListener("keydown", function(e){

    if(e.key==="Enter" && !e.shiftKey){

        e.preventDefault();

        sendMessage();

    }

});

// ======================
// NEW CHAT
// ======================

newChat.addEventListener("click",()=>{

    if(confirm("Start a new chat?")){

        history=[];

        uploadedImage=null;

        chat.innerHTML=`

        <div class="message ai">

            <div class="avatar">

                🤖

            </div>

            <div class="bubble">

                👋 Hello! I'm Gemini AI.<br><br>

                I can help you with:
                <ul>
                    <li>💬 Chat</li>
                    <li>💻 Coding</li>
                    <li>🖼 Image Generation</li>
                    <li>📷 Image Analysis</li>
                </ul>

            </div>

        </div>

        `;

    }

});

// ======================
// SAVE CHAT
// ======================

function saveChat(){

    localStorage.setItem(

        "geminiHistory",

        JSON.stringify(history)

    );

}

function loadChat(){

    const data=localStorage.getItem(

        "geminiHistory"

    );

    if(!data) return;

    history=JSON.parse(data);

    chat.innerHTML="";

    history.forEach(msg=>{

        if(msg.role==="user"){

            addUserMessage(msg.text);

        }

        else{

            addAIMessage(msg.text);

        }

    });

}

const oldPush=history.push;

history.push=function(){

    oldPush.apply(this,arguments);

    saveChat();

};

loadChat();

// ======================
// AUTO RESIZE
// ======================

prompt.addEventListener("input",()=>{

    prompt.style.height="50px";

    prompt.style.height=prompt.scrollHeight+"px";

});

// ======================
// START
// ======================

console.log("✅ Gemini AI Ready");
