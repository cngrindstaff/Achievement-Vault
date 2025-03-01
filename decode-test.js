const fs = require("fs");

const encodedCreds = process.env.AV_GOOGLE_SHEETS_CREDENTIALS;
console.log("Raw Base64 string length:", encodedCreds.length);

if (!/^[A-Za-z0-9+/=]+$/.test(encodedCreds)) {
    console.error("🚨 Base64 string contains invalid characters!");
}
if (encodedCreds.length % 4 !== 0) {
    console.error("⚠️ Base64 string length is not a multiple of 4, which might indicate missing padding.");
}
else {
	console.log("no string issues")
}

//const decodedCreds = Buffer.from(encodedCreds, "base64").toString("utf-8");
//console.log("Decoded JSON length:", decodedCreds.length);

const buffer = Buffer.alloc(encodedCreds.length * 3); // Ensure enough space
const decodedCreds = Buffer.from(encodedCreds, "base64").toString("utf-8");
console.log("🔍 New Decoded JSON length:", decodedCreds.length);

fs.writeFileSync("test_credentials.json", decodedCreds);
console.log("✅ Decoded credentials written to test_credentials.json");