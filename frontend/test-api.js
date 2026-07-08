// Simple API connection test
fetch('http://localhost:5000/')
  .then(response => response.json())
  .then(data => console.log('API Connection Test:', data))
  .catch(error => console.error('API Connection Error:', error));
