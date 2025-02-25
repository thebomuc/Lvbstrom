const express = require("express");
const { PDFDocument } = require("pdf-lib");
const fs = require("fs");
const path = require("path");

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

const pdfTemplatePath = path.join(__dirname, "Stromberatungsvertrag.pdf");

// Sicherstellen, dass die PDF existiert
if (!fs.existsSync(pdfTemplatePath)) {
    console.error("Fehler: PDF-Vorlage nicht gefunden!");
    process.exit(1);
}

app.post("/fill-pdf", async (req, res) => {
    try {
        console.log("🟢 Anfrage erhalten:", req.body);

        if (!fs.existsSync(pdfTemplatePath)) {
            console.error("❌ PDF-Vorlage nicht gefunden!");
            return res.status(500).send("PDF-Vorlage fehlt!");
        }

        const existingPdfBytes = fs.readFileSync(pdfTemplatePath);
        const pdfDoc = await PDFDocument.load(existingPdfBytes);
        const form = pdfDoc.getForm();
        const formData = req.body;

        // **Mapping für Standard-Felder**
        const fieldMap = {
            "Stromnutzung": "stromnutzung",
            "Kreisverband": "kreisverband",
            "Kreisverbandscode": "kreisverbandscode",
            "Mitgliedsnummer": "mitgliedsnummer",
            "Vorname": "kvorname",
            "Nachname": "knachname",
            "KVorname": "kvorname",
            "KNachname": "knachname",    
            "KTelefon": "telefon", 
            "KFirma": "firma",
            "KEmail": "email",
            "KFax": "fax",
            "KHandy": "handy",
            "StraßeNr": "kstr",
            "KStrasse": "kstr",
            "KLieferanschriftStr": "lstr",
            "Stromversorger": "stromversorger",
            "Stromvertragsnummer": "vertragsnummer",
            "Marktlokationen": "marktl",
            "Verbrauch": "verbrauch",
            "Zählernummer": "zaehlernummer",
            "IBAN": "iban",
            "Bankname": "bankname",
            "BIC": "bic",
            "gesetzlicherVertreter": "vertreter",
            "Kundentyp": "kundentyp",
            "Geburtsdatum": "geburtstag"
        };

        // **Standard-Felder befüllen**
        for (const [pdfField, formField] of Object.entries(fieldMap)) {
            const field = form.getTextField(pdfField);
            if (field && formData[formField]) {
                let value = formData[formField];

                // Falls es ein Datum ist, ins deutsche Format umwandeln
                if (formField === "geburtstag") {
                    value = formatDateToGerman(value);
                }

                field.setText(value);
            }
        }

        // **Mapping für kombinierte Felder**
        const combinedFieldMap = {
            "PLZOrt": ["kplz", "kort"],
            "KLieferanschriftPLZOrt": ["lplz", "lort"],
            "KPLZOrt": ["kplz", "kort"]
        };

        // **Kombinierte Felder befüllen**
        for (const [pdfField, inputFields] of Object.entries(combinedFieldMap)) {
            const field = form.getTextField(pdfField);
            if (field) {
                const combinedText = inputFields.map(f => formData[f] || "").join(" ");
                field.setText(combinedText);
            }
        }

        // **Ort & Datum automatisch setzen**
        const aktuellesDatum = new Date().toLocaleDateString("de-DE");
        const ort = formData["ort"] || "";
        const dateFieldNames = ["OrtDatumVertrag", "OrtDatumDSGVO", "OrtDatumEinzug", "OrtDatumVollmacht"];

        for (const dateField of dateFieldNames) {
            const field = form.getTextField(dateField);
            if (field) {
                field.setText(`${ort}, ${aktuellesDatum}`);
            }
        }

        // **Funktion zur Datumsformatierung**
        function formatDateToGerman(dateString) {
            if (!dateString) return "";
            const [year, month, day] = dateString.split("-");
            return `${day}.${month}.${year}`;
        }

        // **PDF speichern und zurücksenden**
        const filledPdfBytes = await pdfDoc.save();
        const outputPath = path.join(__dirname, "output.pdf");
        fs.writeFileSync(outputPath, filledPdfBytes);

        console.log("✅ PDF erfolgreich generiert!");

        res.download(outputPath, "filled-form.pdf", () => {
            fs.unlinkSync(outputPath);
        });

    } catch (error) {
        console.error("❌ Fehler bei der PDF-Bearbeitung:", error);
        res.status(500).send("Fehler bei der PDF-Bearbeitung");
    }
});

// Fehlerbehandlung
app.use((err, req, res, next) => {
    console.error("Fehler:", err);
    res.status(500).send("Interner Serverfehler");
});

// Server starten
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server läuft auf Port ${PORT}`));
