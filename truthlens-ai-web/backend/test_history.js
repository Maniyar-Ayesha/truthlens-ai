const axios = require('axios');

axios.post('http://localhost:5000/api/history', { 
  email: 'test@example.com', 
  type: 'Video', 
  inputText: 'vid1.mp4', 
  prediction: 'FAKE', 
  accuracy: '35%', 
  confidence: '35%', 
  explanation: 'test', 
  processingTime: '78.8s' 
})
.then(res => console.log(res.data))
.catch(err => console.error(err.response?.data || err.message));
