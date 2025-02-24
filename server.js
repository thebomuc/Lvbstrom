const express = require("express");
const multer = require("multer");
const { PDFDocument } = require("pdf-lib");
const fs = require("fs");
const path = require("path");

const app = express();
const upload = multer({ dest: "uploads/" });

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const pdfTemplatePath = "Stromberatungsvertrag.pdf";  // Stelle sicher, dass diese Datei existiert

app.post("/fill-pdf", upload.single("pdfFile"), async (req, res) => {
    try {
        const existingPdfBytes = fs.readFileSync(pdfTemplatePath);
        const pdfDoc = await PDFDocument.load(existingPdfBytes);
        const form = pdfDoc.getForm();

        const formData = req.body;

        const fieldMap = {
            "Vorname": "vorname",
            "Nachname": "nachname",
            "StraßeNr": "strasse",
            "PLZOrt": "plz",
            "Stromversorger": "stromversorger",
            "Zählernummer": "zaehlernummer",
            "IBAN": "iban",
            "Bankname": "bankname",
            "BIC": "bic"
        };

        for (const [pdfField, formField] of Object.entries(fieldMap)) {
            const field = form.getTextField(pdfField);
            if (field && formData[formField]) {
                field.setText(formData[formField]);
            }
        }

        const dateFieldNames = ["OrtDatumVertrag", "OrtDatumDSGVO", "OrtDatumEinzug", "OrtDatumVollmacht"];
        const ort = formData["ort"] || "";
        const aktuellesDatum = new Date().toLocaleDateString("de-DE");

        for (const dateField of dateFieldNames) {
            const field = form.getTextField(dateField);
            if (field) {
                field.setText(`${ort}, ${aktuellesDatum}`);
            }
        }

        const filledPdfBytes = await pdfDoc.save();
        const outputPath = path.join(__dirname, "output.pdf");
        fs.writeFileSync(outputPath, filledPdfBytes);

        res.download(outputPath, "filled-form.pdf", () => {
            fs.unlinkSync(outputPath);
        });
    } catch (error) {
        console.error(error);
        res.status(500).send("Fehler bei der PDF-Bearbeitung");
    }
});

app.listen(3000, () => console.log("Server läuft auf Port 3000"));

app.get("/", (req, res) => {
    res.send("Server läuft!");
});
