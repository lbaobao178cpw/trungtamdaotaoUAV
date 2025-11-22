const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = 5000;
const MONGODB_URI = 'mongodb://localhost:27017/map_db'; 

// --- Cấu hình Middleware ---
app.use(cors()); 
app.use(bodyParser.json()); 

// --- Kết nối MongoDB ---
mongoose.connect(MONGODB_URI)
    .then(() => console.log('MongoDB: Connected successfully.'))
    .catch(err => console.error('MongoDB: Connection error:', err));

// --- Định nghĩa Schema (ĐÃ SỬA) ---
const pointSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true, trim: true }, 
    title: { type: String, required: true, trim: true },
    lead: { type: String, trim: true },
    description: { type: String, trim: true },
    website: { type: String, trim: true },
    logoSrc: { type: String, default: '/images/logo-default.svg' },
    
    // Ảnh thường
    imageSrc: { type: String, default: '/images/img-default.jpg' },

    // === QUAN TRỌNG: Đã thêm trường này để lưu link ảnh 360 ===
    panoramaUrl: { type: String, default: '' }, 
    // ==========================================================

    position: { 
        type: [Number], 
        required: true, 
        validate: [v => v.length === 3, 'Position must be an array of 3 numbers [x, y, z]']
    },
    schedule: { type: Map, of: String, default: {} }, 
    contact: { type: Map, of: String, default: {} } 
});

const Point = mongoose.model('Point', pointSchema);

const handleApiError = (res, err) => {
    if (err.code === 11000) {
        return res.status(400).json({ message: 'LỖI: ID này đã tồn tại. Vui lòng chọn ID khác.' });
    }
    console.error('Lỗi Server:', err);
    return res.status(500).json({ message: `Lỗi Server: ${err.message}` });
};

// --- API Endpoints ---

// 1. GET ALL POINTS
app.get('/api/points', async (req, res) => {
    try {
        const points = await Point.find().lean();
        res.status(200).json(points);
    } catch (err) {
        handleApiError(res, err);
    }
});

// 2. CREATE NEW POINT (POST)
app.post('/api/points', async (req, res) => {
    try {
        // Lấy cả panoramaUrl từ body
        const { posX, posY, posZ, ...rest } = req.body;
        
        // Validation
        const rawY = parseFloat(posY);
        if (typeof posX !== 'number' || typeof rawY !== 'number' || typeof posZ !== 'number') {
            return res.status(400).json({ message: 'Tọa độ (posX, posY, posZ) phải là số hợp lệ.' });
        }
        
        const position = [posX, rawY, posZ];

        const newPoint = new Point({
            ...rest,
            position: position,
        });

        const savedPoint = await newPoint.save();
        res.status(201).json(savedPoint.toObject()); 

    } catch (err) {
        handleApiError(res, err);
    }
});

// 3. UPDATE EXISTING POINT (PUT)
app.put('/api/points/:id', async (req, res) => {
    try {
        const { id } = req.params;
        // Lấy cả panoramaUrl từ body để update
        const { posX, posY, posZ, ...rest } = req.body;

        const rawY = parseFloat(posY);
        if (typeof posX !== 'number' || typeof rawY !== 'number' || typeof posZ !== 'number') {
            return res.status(400).json({ message: 'Tọa độ (posX, posY, posZ) phải là số hợp lệ.' });
        }
        
        const position = [posX, rawY, posZ];

        const updatedPoint = await Point.findOneAndUpdate(
            { id: id }, 
            { ...rest, position: position },
            { new: true, runValidators: true } 
        ).lean();

        if (!updatedPoint) {
            return res.status(404).json({ message: `Không tìm thấy điểm với ID: ${id}` });
        }

        res.status(200).json(updatedPoint);

    } catch (err) {
        handleApiError(res, err);
    }
});

// 4. DELETE POINT (DELETE)
app.delete('/api/points/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await Point.findOneAndDelete({ id: id });

        if (!result) {
            return res.status(404).json({ message: `Không tìm thấy điểm với ID: ${id}` });
        }
        res.status(204).send(); 
    } catch (err) {
        handleApiError(res, err);
    }
});

app.listen(PORT, () => {
    console.log(`Server đang chạy trên http://localhost:${PORT}`);
    console.log('API endpoints: /api/points');
});