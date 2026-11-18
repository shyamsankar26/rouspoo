const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

// Routines are saved in a file so they survive restarts
const DATA_FILE = path.join(__dirname, "routines.json");

function loadRoutines() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  } catch (e) {
    return [];
  }
}

function saveRoutines() {
  fs.writeFileSync(DATA_FILE, JSON.stringify(routines, null, 2));
}

let routines = loadRoutines();

// Check that a routine has the fields the app sends
function isValid(r) {
  return (
    r &&
    typeof r.name === "string" && r.name.trim() !== "" &&
    Number.isInteger(r.start) &&
    Number.isInteger(r.end) &&
    Array.isArray(r.days) && r.days.length > 0
  );
}

app.get("/", (req, res) => {
  res.send("rouspoo backend is running!");
});

// Get all routines
app.get("/routines", (req, res) => {
  res.json(routines);
});

// Add a routine
app.post("/routines", (req, res) => {
  if (!isValid(req.body)) {
    return res.status(400).json({ error: "Invalid routine" });
  }
  const { id, name, start, end, days, alarm } = req.body;
  const routine = { id: id || "r" + Date.now(), name, start, end, days, alarm: !!alarm };
  routines.push(routine);
  saveRoutines(); 
  res.status(201).json(routine);
});

// Edit a routine
app.put("/routines/:id", (req, res) => {
  if (!isValid(req.body)) {
    return res.status(400).json({ error: "Invalid routine" });
  }
  const index = routines.findIndex((r) => r.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: "Routine not found" });
  }
  const { name, start, end, days, alarm } = req.body;
  routines[index] = { id: req.params.id, name, start, end, days, alarm: !!alarm };
  saveRoutines();
  res.json(routines[index]);
});

// Delete a routine
app.delete("/routines/:id", (req, res) => {
  routines = routines.filter((r) => r.id !== req.params.id);
  saveRoutines();
  res.json({ message: "Deleted" });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});