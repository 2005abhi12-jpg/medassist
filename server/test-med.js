const { default: axios } = require('axios');
(async () => {
  try {
    const login = await axios.post('http://localhost:5000/api/v1/auth/login', {
      email: 'raj@example.com',
      password: 'password123'
    });
    const token = login.data.data.accessToken;
    
    console.log("Token acquired.");
    
    const med = await axios.post('http://localhost:5000/api/v1/medications', {
      name: 'Aspirin',
      dosage: '100mg',
      startDate: '2026-04-08',
      time: '14:00'
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log("Created medication:", med.data);
    
    const upcoming = await axios.get('http://localhost:5000/api/v1/reminders/upcoming', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log("Upcoming reminders:", JSON.stringify(upcoming.data, null, 2));
  } catch (err) {
    console.error(err.response ? err.response.data : err.message);
  }
})();
