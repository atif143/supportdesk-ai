// Read the JSON object inside an AI answer. Returns null if there is none.
// The AI sometimes adds extra text around the JSON, so keep only the part between { and }
export function readJson(text: string) {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1) {
    return null;
  }

  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch (error) {
    return null; // the text was not JSON
  }
}
