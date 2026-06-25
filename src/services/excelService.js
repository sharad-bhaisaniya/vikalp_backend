import XLSX from "xlsx";

/**
 * parseExcelBuffer
 * Parses an uploaded Excel (.xlsx) or CSV file from a buffer.
 * Returns an array of row objects using the first row as headers.
 *
 * @param {Buffer} buffer - The file buffer from multer memoryStorage
 * @returns {Array<Object>} - Array of parsed row objects
 */
export const parseExcelBuffer = (buffer) => {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  // Convert sheet to JSON; header: 1 uses first row as keys
  const rows = XLSX.utils.sheet_to_json(worksheet, {
    defval: "", // default value for empty cells
    raw: false, // format numbers as strings to preserve pincodes like "001234"
  });

  return rows;
};

/**
 * validateExcelHeaders
 * Validates that the parsed Excel data contains all required column headers.
 *
 * @param {Array<Object>} rows - Parsed rows from parseExcelBuffer
 * @param {string[]} requiredHeaders - Array of required header names
 * @returns {{ valid: boolean, missing: string[] }}
 */
export const validateExcelHeaders = (rows, requiredHeaders) => {
  if (!rows || rows.length === 0) {
    return { valid: false, missing: requiredHeaders };
  }

  const availableHeaders = Object.keys(rows[0]).map((h) =>
    h.trim().toLowerCase()
  );
  const missing = requiredHeaders.filter(
    (h) => !availableHeaders.includes(h.toLowerCase())
  );

  return { valid: missing.length === 0, missing };
};
