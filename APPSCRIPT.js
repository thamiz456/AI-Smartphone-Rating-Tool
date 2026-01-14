const GEMINI_API_KEY = "your api key"; // Replace this i have removed my api key for privacy purposes

function analyzePhones() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const data = sheet.getDataRange().getValues();
  const header = data[0];

  // Ensure AI columns exist
  let ratingCol = header.indexOf("AI_Rating");
  let verdictCol = header.indexOf("Worth_Verdict");

  // If missing, add them
  if (ratingCol === -1) {
    sheet.getRange(1, header.length + 1).setValue("AI_Rating");
    ratingCol = header.length; // zero-based index
  }
  if (verdictCol === -1) {
    sheet.getRange(1, header.length + 2).setValue("Worth_Verdict");
    verdictCol = header.length + 1;
  }

  const lastCol = sheet.getLastColumn();

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const [brand, model, storage, ram, screen, camera, battery, price] = row;

    // Skip processed rows
    const ratingValue = sheet.getRange(i + 1, ratingCol + 1).getValue();
    const verdictValue = sheet.getRange(i + 1, verdictCol + 1).getValue();
    if (ratingValue && verdictValue) continue;

    const prompt = `
You are an advanced smartphone reviewer with knowledge of all major brands, chipsets, and market price trends (2020–2025). 
Evaluate the following phone specs and give two things:
1️⃣ An **overall rating (out of 10)** based on performance, camera, battery, and value for money.  
2️⃣ A **worth verdict** that includes a one-line justification — e.g., “Worth it 💰 – Balanced specs and fair pricing” or “Overpriced ⚠️ – You can get better performance for the price.”

Be concise and fair. Use your tech knowledge and global market comparisons.

Specs:
Brand: ${brand}
Model: ${model}
Storage: ${storage} GB
RAM: ${ram} GB
Screen Size: ${screen} inches
Camera: ${camera} MP
Battery: ${battery} mAh
Price: $${price}

Reply ONLY in strict JSON format like this:
{"rating": "8.5/10", "verdict": "Worth it 💰 – Great mid-range performance and camera for the price."}
`;


    try {
      const response = UrlFetchApp.fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=" + GEMINI_API_KEY,
        {
          method: "post",
          contentType: "application/json",
          payload: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
          }),
        }
      );

      const result = JSON.parse(response.getContentText());
      let text = result?.candidates?.[0]?.content?.parts?.[0]?.text || "";

      // Clean extra formatting
      text = text
        .replace(/```json|```/g, "")
        .replace(/^[^{]*({[\s\S]*})[^}]*$/, "$1")
        .trim();

      const parsed = JSON.parse(text);

      // ✅ Write results safely
      sheet.getRange(i + 1, ratingCol + 1).setValue(parsed.rating);
      sheet.getRange(i + 1, verdictCol + 1).setValue(parsed.verdict);

      Logger.log(`✅ Row ${i + 1} done`);
      Utilities.sleep(1200);
    } catch (err) {
      Logger.log(`Error in row ${i + 1}: ${err}`);
    }
  }
}
