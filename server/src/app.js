import 'dotenv/config.js';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import uploadRoutes from './routes/uploadRoutes.js';
import resultRoutes from './routes/resultController.js';
import '../workers/index.js';              // start workers immediately

const app = express();
app.disable('x-powered-by');
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(morgan('dev'));

app.use('/api/v1', uploadRoutes);
app.use('/api/v1', resultRoutes);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.statusCode || 500).json({ error: err.message });
});

app.listen(process.env.PORT || 8000, () =>
  console.log(`Node receiver ready on :${process.env.PORT || 8000}`));
