const express = require('express');
const bodyParser = require('body-parser');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const methodOverride = require('method-override');

const app = express();
const PORT = process.env.PORT || 3000;

// Define the attachments directory and create it if it doesn't exist
const attachmentsDir = path.join(__dirname, 'attachments');
if (!fs.existsSync(attachmentsDir)) {
    fs.mkdirSync(attachmentsDir, { recursive: true });
}

// Set up multer for file uploading
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, attachmentsDir);
    },
    filename: (req, file, cb) => {
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

// Middleware setup
app.use(bodyParser.urlencoded({ extended: true }));
app.use(methodOverride('_method'));
app.use(express.static(path.join(__dirname, 'views')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

const dataFilePath = path.join(__dirname, 'data.json');

// Async functions to read and write JSON file
async function readJSONFile(filePath) {
    const fileData = await fs.promises.readFile(filePath, 'utf8');
    return JSON.parse(fileData);
}

async function writeJSONFile(filePath, data) {
    const dataString = JSON.stringify(data, null, 2);
    await fs.promises.writeFile(filePath, dataString, 'utf8');
}

// POST route for form submission
app.post('/submit-form', upload.fields([
    { name: 'breakdownReport', maxCount: 1 },
    { name: 'creditRequestDocument', maxCount: 1 },
    { name: 'creditReceivedAttachments', maxCount: 1 },
    { name: 'creditreceived', maxCount: 1 }
]), async (req, res) => {
    const formData = {
        prlId: req.body.prlId,
        ulId: req.body.ulId,
        shopDetails: req.body.shopDetails,
        breakdownOccurred: req.body.breakdownOccurred,
        stockLossReceived: req.body.stockLossReceived,
        creditRequestSent: req.body.creditRequestSent,
        georgePassedCredit: req.body.georgePassedCredit,
        creditreceived: req.body.creditreceived,
        netValueBreakdown: req.body.netValueBreakdown,
        companyBreakdown: req.body.companyBreakdown,
        breakdownReport: req.files['breakdownReport'] ? req.files['breakdownReport'][0].path : '',
        creditRequestDocument: req.files['creditRequestDocument'] ? req.files['creditRequestDocument'][0].path : '',
        creditReceivedAttachments: req.files['creditReceivedAttachments'] ? req.files['creditReceivedAttachments'][0].path : '',
    };

    try {
        let existingData = await readJSONFile(dataFilePath);
        formData.id = existingData.length > 0 ? Math.max(...existingData.map(item => item.id)) + 1 : 1;
        existingData.push(formData);
        await writeJSONFile(dataFilePath, existingData);
        res.redirect('/display-data');
    } catch (error) {
        console.error('Error saving data:', error);
        res.status(500).send('Error processing form');
    }
});

// GET route to display data
app.get('/display-data', async (req, res) => {
    try {
        const data = await readJSONFile(dataFilePath);
        res.render('display-data', { records: data });
    } catch (error) {
        console.error('Error fetching data:', error);
        res.status(500).send('Error fetching data');
    }
});

// GET route for updating a record - displays the update form
app.get('/update/:id', async (req, res) => {
    const id = parseInt(req.params.id, 10);
    try {
        const data = await readJSONFile(dataFilePath);
        const recordToUpdate = data.find(record => record.id === id);
        if (recordToUpdate) {
            res.render('update-form', { record: recordToUpdate });
        } else {
            res.status(404).send('Record not found');
        }
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Server error');
    }
});

// POST route to process the update
app.post('/update/:id', upload.none(), async (req, res) => {
    const idToUpdate = parseInt(req.params.id, 10);
    try {
        let data = await readJSONFile(dataFilePath);
        const index = data.findIndex(record => record.id === idToUpdate);
        if (index !== -1) {
            data[index] = { ...data[index], ...req.body };
            await writeJSONFile(dataFilePath, data);
            res.redirect('/display-data');
        } else {
            res.status(404).send('Record not found');
        }
    } catch (error) {
        console.error('Error updating record:', error);
        res.status(500).send('Error updating data');
    }
});

// Route for deleting a record
app.delete('/delete/:id', async (req, res) => {
    const idToDelete = parseInt(req.params.id, 10);
    try {
        let data = await readJSONFile(dataFilePath);
        data = data.filter(record => record.id !== idToDelete);
        await writeJSONFile(dataFilePath, data);
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting record:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
// GET route to display data
app.get('/display-data', async (req, res) => {
    try {
        const data = await readJSONFile(dataFilePath);
        const page = parseInt(req.query.page) || 1;
        const limit = 10; 
        const skip = (page - 1) * limit;
        const totalItems = data.length;
        const totalPages = Math.ceil(totalItems / limit);
        const paginatedData = data.slice(skip, skip + limit);

        res.render('display-data', { 
            records: paginatedData,
            currentPage: page,
            totalPages: totalPages
        });
    } catch (error) {
        console.error('Error fetching data:', error);
        res.status(500).send('Error fetching data');
    }
});

// Home route
app.get('/', (req, res) => {
    res.render('index');
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
 