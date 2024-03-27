const { v4: uuidv4 } = require('uuid');
const PDF = require('../models/PdfModel'); // Asegúrate de que el path sea correcto
const Form = require('../models/PdfModel');
const generatePDF = require('../services/PdfService'); // Asegúrate de que el path sea correcto
const MailService = require('../services/MailService'); 
exports.processFormAndSendEmail = async (req, res) => {
    try {
        const formData = req.body;
        const pdfBuffer = await generatePDF(formData);
        const token = uuidv4();

        // Crea un nuevo documento de formulario con el estado pendiente
        const newForm = new Form({
            formData: formData,
            pdfData: pdfBuffer,
            token: token,
            folio: formData.requestFolio,
            state: 'solicitudesPendientes' // Estado inicial
        });
        await newForm.save();

        // Envía el correo con el link que incluye el token
        await MailService.sendAuthorizationEmail(formData, pdfBuffer, token);

        res.json({ success: true, message: 'Formulario recibido, correo enviado y formulario guardado en la base de datos.' });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Ocurrió un error al procesar el formulario, enviar el correo y guardar el formulario.');
    }
};

exports.autorizar = async (req, res) => {
    const { token } = req.params;
    try {
        const form = await Form.findOne({ token: token });
        if (!form) {
            return res.status(404).send('Formulario no encontrado o token inválido.');
        }
        if (form.state !== 'solicitudesPendientes') {
            return res.status(400).send('La acción de autorizar ya no es aplicable a este formulario.');
        }
        form.state = 'FormularioAutorizado';
        await form.save();
        
        const applicantEmail = form.formData.applicantName; // Esto debería ser el email, no el nombre.

        await MailService.sendConfirmationEmail(applicantEmail, form.pdfData, true);
        
        // Envía la respuesta HTML para cerrar la ventana
        res.send(`
            <html>
                <body>
                    <p>El formulario ha sido autorizado. Esta ventana se cerrará automáticamente.</p>
                    <script>
                        window.onload = function() {
                            setTimeout(function() {
                                window.close();
                            }, 1500);
                        };
                    </script>
                </body>
            </html>
        `);
    } catch (error) {
        console.error('Error al autorizar:', error);
        res.status(500).send('Error al procesar la autorización.');
    }
};

exports.noautorizar = async (req, res) => {
    const { token } = req.params;
    try {
        const form = await Form.findOne({ token: token });
        if (!form) {
            return res.status(404).send('Formulario no encontrado o token inválido.');
        }
        if (form.state !== 'solicitudesPendientes') {
            return res.status(400).send('La acción de no autorizar ya no es aplicable a este formulario.');
        }
        form.state = 'FormularioNoAutorizado';
        await form.save();

        const applicantEmail = form.formData.applicantName; // Esto debería ser el email, no el nombre.

        await MailService.sendConfirmationEmail(applicantEmail, form.pdfData, false);
        
        // Envía la respuesta HTML para cerrar la ventana
        res.send(`
            <html>
                <body>
                    <p>El formulario ha sido autorizado. Esta ventana se cerrará automáticamente.</p>
                    <script>
                        window.onload = function() {
                            setTimeout(function() {
                                window.close();
                            }, 1500);
                        };
                    </script>
                </body>
            </html>
        `);
    } catch (error) {
        console.error('Error al no autorizar:', error);
        res.status(500).send('Error al procesar la no autorización.');
    }
};

