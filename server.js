const express = require('express');
const bodyParser = require('body-parser');
const fetch = require('node-fetch');
require('dotenv').config();

const app = express();
const port = 3000;

app.use(bodyParser.json());

// CORS middleware for local development
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
});

app.post('/api/anti-scam', async (req, res) => {
    const { message, user, history } = req.body;
    const apiUrl = `${process.env.DIFY_BASE_URL}/workflows/${process.env.DIFY_WORKFLOW_ID}/runs`;

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.DIFY_API_KEY}`
            },
            body: JSON.stringify({ message, user, history })
        });

        if (!response.ok) {
            throw new Error('Network response was not ok');
        }

        const data = await response.json();
        res.json({ answer: data.answer, raw: data });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
