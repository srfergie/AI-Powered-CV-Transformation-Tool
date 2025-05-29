const express = require('express');
const resumeRoutes = require('./routes/resumeRoutes');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());

// Mount routes
app.use('/api/resume', resumeRoutes);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
