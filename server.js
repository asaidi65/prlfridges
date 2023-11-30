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
    // Extracting text data and file paths from the form submission
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
        // Read existing data from data.json
        let existingData = await readJSONFile(dataFilePath);

        // Assign a new ID to the formData
        formData.id = existingData.length > 0 ? Math.max(...existingData.map(item => item.id)) + 1 : 1;

        // Append the formData to existing data
        existingData.push(formData);

        // Write the updated data back to data.json
        await writeJSONFile(dataFilePath, existingData);

        // Redirect or send a response
        res.redirect('/display-data'); // Redirecting to the display-data page as an example
    } catch (error) {
        console.error('Error saving data:', error);
        res.status(500).send('Error processing form');
    }
});

// Route for updating a record
app.get('/update/:id', async (req, res) => {
    const id = parseInt(req.params.id, 10); // Ensure the ID is correctly parsed as an integer

    try {
        // Logic to get the record by ID
        const data = await readJSONFile(dataFilePath);
        const recordToUpdate = data.find(record => record.id === id);

        if (recordToUpdate) {
            res.render('update-form', { record: recordToUpdate });
        } else {
            res.status(404).send('Record not found');
        }
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send
