import express, { Request, Response } from "express";
import validator from 'validator';

// ==== Type Definitions, feel free to add or modify ==========================
interface cookbookEntry {
  name: string;
  type: string;
}

interface requiredItem {
  name: string;
  quantity: number;
}

interface recipe extends cookbookEntry {
  requiredItems: requiredItem[];
}

interface ingredient extends cookbookEntry {
  cookTime: number;
}

interface summary {
  name: string;
  cookTime: number;
  ingredients: requiredItem[];
}


// =============================================================================a
// ==== HTTP Endpoint Stubs ====================================================
// =============================================================================
const app = express();
app.use(express.json());

// Store your recipes here!
const cookbook: any[] = [];

// Task 1 helper (don't touch)
app.post("/parse", (req:Request, res:Response) => {
  const { input } = req.body;

  const parsed_string = parse_handwriting(input)
  if (parsed_string == null) {
    res.status(400).send("this string is cooked");
    return;
  } 
  res.json({ msg: parsed_string });
  return;
  
});

// [TASK 1] ====================================================================
// Takes in a recipeName and returns it in a form that 
const parse_handwriting = (recipeName: string): string | null => {
  let stringRes: string = "";
  for (let i = 0; i < recipeName.length; i++) {
    const c: string = recipeName[i];
    if (c == '-' || c == '_') stringRes += ' ';
    else if (c != ' ' && !validator.isAlpha(c)) continue;
    else if (stringRes[stringRes.length - 1] == ' ' || i == 0) stringRes += c.toUpperCase();
    else stringRes += c.toLowerCase();
  }
  // gets rid of leading and trailing spaces, splits by space and removes multiples
  stringRes = stringRes.split(' ').filter(word => word !== '').join(' ');

  if (!stringRes) return null;
  return stringRes;
}

// [TASK 2] ====================================================================
// Endpoint that adds a CookbookEntry to your magical cookbook
app.post("/entry", (req:Request, res:Response) => {
  const entry = req.body;
  
  if (entry.type !== "recipe" && entry.type !== "ingredient") {
    return res.status(400).send();
  }

  // check if name exists
  if (isInCookbook(entry.name)) return res.status(400).send();

  let resEntry: recipe | ingredient;
  if (entry.type === "ingredient") {
    resEntry = entry as ingredient;
    if (resEntry.cookTime < 0) return res.status(400).send();
  } else {
    resEntry = entry as recipe;
    
    // check that ingredients have unique names
    const tracker = [];
    for (const item of resEntry.requiredItems) {
      if (tracker.includes(item.name)) return res.status(400).send();
      tracker.push(item.name);
    }
  }

  cookbook.push(resEntry);
  return res.status(200).send();
});

function isInCookbook(s: string) {
  return cookbook.find(entry => entry.name === s);
}

// [TASK 3] ====================================================================
// Endpoint that returns a summary of a recipe that corresponds to a query name
app.get("/summary", (req:Request, res:Request) => {
  const q = req.query.name as string;

  // check in cookbook and is a recipe
  let inBook = false;
  let recip: recipe;
  let recipeRes: summary = {
    name: q,
    cookTime: 0,
    ingredients: []
  };

  for (let i = 0; i < cookbook.length; i++) {
    if (cookbook[i].name === q && cookbook[i].type === "recipe") {
      inBook = true;
      recip = cookbook[i];
    }
  }
  if (!inBook) return res.status(400).send();

  // checking if reqItems are valid
  if (!checkRequiresRec(recip, recipeRes, q)) return res.status(400).send();

  return res.status(200).json(recipeRes);
});

function hasIngredient(s: string, ingreds: requiredItem[]): number {
  for (let i = 0; i < ingreds.length; i++) {
    if (ingreds[i].name === s) {
      return i;
    }
  }
  return -1;
}

function checkRequiresRec(recip: recipe, recipeRes: summary, name: string): boolean {
  for (let i = 0; i < recip.requiredItems.length; i++) {
    // check item is valid (in cookbook)
    let inBook = false;
    let item: any;
    for (let j = 0; j < cookbook.length; j++) {
      if (cookbook[j].name === name) {
        inBook = true;
        item = cookbook[j];
      }
    }
    if (!inBook) return false;

    if (item.type === "ingredient") {
      let index: number = hasIngredient(item.name, recipeRes.ingredients);
      // if ingredient already exists, increment
      if (index !== -1) recipeRes.ingredients[index].quantity++;
      else {
        recipeRes.ingredients.push({ name: item.name, quantity: 1 });
      }
      recipeRes.cookTime += item.cookTime;
    } else {
      // keep checking if it is a recipe
      if (!checkRequiresRec(item, recipeRes, recip.requiredItems[i].name)) return false;
    }
    return true;
  }
}

// =============================================================================
// ==== DO NOT TOUCH ===========================================================
// =============================================================================
const port = 8080;
app.listen(port, () => {
  console.log(`Running on: http://127.0.0.1:8080`);
});