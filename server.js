const express = require("express");
const axios = require("axios");
const cors = require("cors"); 
require("dotenv").config();

const app = express();
app.use(cors()); 
app.use(express.json());

function formatPhoneNumber(phone) {
  // Remove spaces or dashes just in case
  phone = phone.trim();

  if (phone.startsWith("0")) {
    // Convert 07XXXXXXXX → 2547XXXXXXXX
    return "254" + phone.substring(1);
  } else if (phone.startsWith("+")) {
    // Convert +2547XXXXXXXX → 2547XXXXXXXX
    return phone.substring(1);
  } else if (phone.startsWith("254")) {
    // Already in correct format
    return phone;
  } else {
    throw new Error("Invalid phone number format");
  }
}



async function getAccessToken() {
  const url = "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials";
  const auth = Buffer.from(`${process.env.CONSUMER_KEY}:${process.env.CONSUMER_SECRET}`).toString("base64");

  const response = await axios.get(url, {
    headers: { Authorization: `Basic ${auth}` },
  });
  return response.data.access_token;
}


app.post("/stkpush", async (req, res) => {
  try {
    let { phone, amount } = req.body;

    // Format phone number
    phone = formatPhoneNumber(phone);

    const token = await getAccessToken();

    const timestamp = new Date()
      .toISOString()
      .replace(/[-T:\.Z]/g, "")
      .slice(0, 14);

    const password = Buffer.from(
      process.env.SHORTCODE + process.env.PASSKEY + timestamp
    ).toString("base64");

    const response = await axios.post(
      "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest",
      {
        BusinessShortCode: process.env.SHORTCODE,
        Password: password,
        Timestamp: timestamp,
        TransactionType: "CustomerPayBillOnline",
        Amount: amount,
        PartyA: phone,
        PartyB: process.env.SHORTCODE,
        PhoneNumber: phone,
        CallBackURL: process.env.CALLBACK_URL,
        AccountReference: "Test123",
        TransactionDesc: "Payment Test"
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    res.json(response.data);
  } catch (err) {
    console.error("❌ STK Push Error:", err.response ? err.response.data : err.message);
    res.status(500).json({ error: err.response ? err.response.data : err.message });
  }
});


app.listen(3000, () => {
  console.log("✅ Server running on http://localhost:3000");
});
