const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/db');
const { apiLimiter } = require('./middlewares/rateLimit');

const path = require('path');

// Load env vars
dotenv.config({ path: path.resolve(__dirname, '.env') });

// Connect to database
connectDB();

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Apply global rate limiting
app.use('/api', apiLimiter);

// Route imports
const authRoutes = require('./routes/authRoute');
const requestRoutes = require('./routes/requestRoute');
const userRoutes = require('./routes/userRoute');

// Mount routers
app.use('/api/auth', authRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/users', userRoutes);

app.get('/', (req, res) => {
  res.send('Blood Bridge API is running...');
});

// Error Handling Middleware (Basic)
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Internal Server Error' });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
