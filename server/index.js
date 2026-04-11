import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import reconRouter from './routes/recon.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// routes
app.use('/api/recon', reconRouter);

// health check
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => {
  console.log(`[server] running on http://localhost:${PORT}`);
});
