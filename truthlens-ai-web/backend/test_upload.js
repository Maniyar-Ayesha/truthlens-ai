const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const axios = require('axios');

async function testUpload() {
  const filePath = path.resolve(__dirname, '..', 'SAMPLES', 'VID2.mp4');
  if (!fs.existsSync(filePath)) {
    console.error("Test video not found");
    return;
  }
  
  const formData = new FormData();
  formData.append('video', fs.createReadStream(filePath));
  
  try {
    console.log("Sending video to backend...");
    const response = await axios.post('http://localhost:5000/api/check-video', formData, {
      headers: formData.getHeaders()
    });
    
    console.log(`HTTP ${response.status}`);
    console.log("Response JSON:", JSON.stringify(response.data, null, 2));
  } catch(e) {
    console.error("Error message:", e.message);
    if (e.response) {
      console.error("Response data:", e.response.data);
    }
  }
}

testUpload();
