const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const supabase = require("./supabaseClient");

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const AUTH_SECRET = process.env.API_KEY;
const MEMORY_TABLE = "memory";

function authorize(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer ")) return res.status(403).json({ error: "Unauthorized" });
  const token = auth.split(" ")[1];
  if (token !== AUTH_SECRET) return res.status(403).json({ error: "Invalid token" });
  next();
}

app.get("/v1/memory", authorize, async (req, res) => {
  const gpt_id = req.query.gpt_id || "default";
  const { data, error } = await supabase
    .from(MEMORY_TABLE)
    .select("content")
    .eq("gpt_id", gpt_id)
    .order("updated_at", { ascending: false })
    .limit(1);

  if (error) return res.status(500).json({ error });
  if (data.length === 0) return res.status(200).json({ content: "" });

  res.status(200).json({ content: data[0].content });
});

app.post("/v1/memory", authorize, async (req, res) => {
  const { content, type = "APPEND", gpt_id = "default" } = req.body;

  if (!content || !["APPEND", "REPLACE"].includes(type))
    return res.status(400).json({ error: "Missing or invalid fields." });

  if (type === "REPLACE") {
    const { error } = await supabase
      .from(MEMORY_TABLE)
      .upsert({ gpt_id, content, updated_at: new Date() }, { onConflict: ["gpt_id"] });

    if (error) return res.status(500).json({ error });
    return res.status(201).json({ message: "Memory replaced." });
  }

  const { data, error: readError } = await supabase
    .from(MEMORY_TABLE)
    .select("content")
    .eq("gpt_id", gpt_id)
    .limit(1);

  if (readError) return res.status(500).json({ error: readError });

  const previous = data?.[0]?.content || "";
  const combined = `${previous.trim()}\n${content.trim()}`.trim();

  const { error: writeError } = await supabase
    .from(MEMORY_TABLE)
    .upsert({ gpt_id, content: combined, updated_at: new Date() }, { onConflict: ["gpt_id"] });

  if (writeError) return res.status(500).json({ error: writeError });

  res.status(201).json({ message: "Memory updated." });
});

app.listen(3000, () => console.log("Memory API running on port 3000"));
