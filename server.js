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
    process.exit(1); // Beende den Server, falls die Datei fehlt
}

app.post("/fill-pdf", async (req, res) => {
    try {
        console.log("🟢 Anfrage erhalten:", req.body); // Debugging

        // Prüfen, ob die PDF-Datei existiert
        if (!fs.existsSync(pdfTemplatePath)) {
            console.error("❌ PDF-Vorlage nicht gefunden!");
            return res.status(500).send("PDF-Vorlage fehlt!");
        }

        const existingPdfBytes = fs.readFileSync(pdfTemplatePath);
        const pdfDoc = await PDFDocument.load(existingPdfBytes);
        const form = pdfDoc.getForm();
        const formData = req.body;

        const fieldMap = {
            "Stromnutzung": "stromnutzung",
            "Kreisverband": "kreisverband",
            "Kreisverbandscode": "kreisverbandscode",
            "Mitgliedsnummer": "mitgliedsnummer",
            "Vorname": "kvorname",
            "Nachname": "knachname",
            "KVorname": "kvorname",
            "KNachname": "knachname",
            "Geburtsdatum": "geburtstag",    
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
            "Kundentyp": "kundentyp"
        };

const combinedFieldMap = {
    "PLZOrt": ["kplz", "kort"],
    "KLieferanschriftPLZOrt": ["lplz", "lort"]
    "KPLZOrt": ["kplz", "kort"]
};

for (const [pdfField, inputFields] of Object.entries(combinedFieldMap)) {
    const field = form.getTextField(pdfField);
    if (field) {
        const combinedText = inputFields.map(f => formData[f] || "").join(" ");
        field.setText(combinedText);
    }
}

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


