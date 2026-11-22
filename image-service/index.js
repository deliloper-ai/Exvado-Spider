let express = require('express');
let cors = require('cors');
let fs = require('fs')
let path = require('path')

const app = express();
const port = 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cors());

app.get('/uploadedImages/:filename', function (req, res, next) {

    const filePath = path.join(__dirname, 'uploadedImages', req.params.filename);

    if (fs.existsSync(filePath)) {
        res.sendFile(filePath);
    } else {
        res.status(404).send('File not found');
    }

  })

app.post('/imageUpload', async (req, res) => {

    let productCode = req.body.productCode.replace(/\//g, '-');
    let imageBase64 = req.body.image;

    const files = fs.readdirSync("uploadedImages")
    let index = 0;
    files.forEach((file) => {
        console.log(file);
        if(file.substring(0, file.length-6) == productCode){
            index++;
        }
    });

    let path = `uploadedImages/${productCode}_${index+1}.png`;
    fs.writeFile(path, imageBase64, 'base64', (err) => {
        if (err) {
            console.error('Failed to save the image:', err);
            res.status(500).send({error: 'Görsel kaydedilemedi', details: err.message});
        } else {
            res.status(200).send({path:`https://cdn.bolbolbul.com/${path}`});
        }
    });

    
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
