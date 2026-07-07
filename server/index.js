import express from 'express';
import multer from 'multer';
import axios from 'axios';
import FormData from 'form-data';
import cors from 'cors';

const app = express();

app.use(cors());
app.use(express.json());

const upload = multer({ storage: multer.memoryStorage() });

app.post('/api/upload', upload.single('resume'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "No file uploaded" });
        }

        console.log(`Received ${req.file.originalname} from React. Forwarding to ML...`);

        const formData = new FormData();
        formData.append('file', req.file.buffer, req.file.originalname);

        const mlResponse = await axios.post('http://localhost:8000/analyze', formData, {
            headers: { ...formData.getHeaders() }
        });

        console.log("Received response from Python ML. Sending back to React.");
        
        return res.status(200).json(mlResponse.data);

    } catch (error) {
        console.error("Error communicating with Python:", error.message);
        return res.status(500).json({ error: "Failed to process resume pipeline." });
    }
});

const PORT = 5000;
app.listen(PORT, () => console.log(`🚀 Express Gateway running on port ${PORT}`));