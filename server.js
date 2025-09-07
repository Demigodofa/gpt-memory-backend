const fs = require("fs");
const path = require("path");
const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// Location for memory file (on Render persistent disk)
const DATA_DIR = "/var/data";
const MEMORY_FILE = path.join(DATA_DIR, "memory.json");

// Ensure the directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Read memory
function readMemory() {
  if (!fs.existsSync(MEMORY_FILE)) {
    return { content: "" };
  }
  return JSON.parse(fs.readFileSync(MEMORY_FILE, "utf-8"));
}

// Write memory
function writeMemory(content) {
  fs.writeFileSync(MEMORY_FILE, JSON.stringify({ content }, null, 2));
}

// API: Load memory
app.get("/v1/memory", (req, res) => {
  res.json(readMemory());
});

// API: Save memory
app.post("/v1/memory", (req, res) => {
  const { content, type = "APPEND" } = req.body;
  const current = readMemory().content || "";

  let newContent;
  if (type === "REPLACE") {
    newContent = content;
  } else {
    newContent = `${current}\n${content}`.trim();
  }

  writeMemory(newContent);
  res.json({ message: "Memory saved.", content: newContent });
});

// Start server
app.listen(3000, () => console.log("Memory API running on port 3000"));

