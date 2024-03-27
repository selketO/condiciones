const nodemailer = require('nodemailer');
const path = require('path');
class MailService {
    static async sendAuthorizationEmail(formData, pdfBuffer, token) {
        const authorizationLink = `http://localhost:3000/autorizar/${token}`;
        const noAuthorizationLink = `http://localhost:3000/no-autorizar/${token}`;
        const htmlEmailContent = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
              body {
                  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                  color: #333;
                  line-height: 1.6;
              }
              .email-container {
                  max-width: 600px;
                  margin: 20px auto;
                  padding: 20px;
                  border: 1px solid #ddd;
                  border-radius: 5px;
              }
              .header {
                  text-align: left;
                  border-bottom: 2px solid #005687;
                  padding-bottom: 10px;
                  margin-bottom: 20px;
              }
              .email-content {
                  text-align: left;
                  margin-top: 20px;
              }
              .footer {
                  text-align: center;
                  margin-top: 30px;
                  padding-top: 10px;
                  font-size: 0.8em;
                  color: #888;
              }
              .button {
                  padding: 10px 20px;
                  margin: 10px 5px;
                  color: white;
                  border: none;
                  border-radius: 5px;
                  cursor: pointer;
                  text-decoration: none;
              }
              .authorize {
                  background-color: #28a745;
              }
              .decline {
                  background-color: #dc3545;
              }
              .button-container {
                  text-align: center;
              }
          </style>
      </head>
      <body>
          <div class="email-container">
              <div class="header">
                  <img src="cid:logoBCLH" alt="Logo" style="max-width: 150px;">
              </div>
              <div class="email-content">
              <p>Estimado/a Francisco,</p>
              <p>Por favor, autorice el gasto de la <strong>Solicitud de nota de credito</strong>, generado por: <strong>${formData.applicantName}</strong> por un monto de: <strong>${formData.expenseAmount}</strong> para el cliente: <strong>${formData.nameClient}</strong>. Encuentra los detalles adjuntos. Gracias.</p>
            </div>
              <table width="100%" cellspacing="0" cellpadding="0">
              <tr>
                <td>
                  <table cellspacing="0" cellpadding="0" align="left">
                    <tr>
                      <td align="center" width="200" height="40" bgcolor="#28a745" style="border-radius: 5px;">
                        <a href="${authorizationLink}" target="_blank" style="font-size: 16px; font-family: sans-serif; color: #ffffff; text-decoration: none; line-height:40px; display: inline-block;">
                          Autorizar
                        </a>
                      </td>
                    </tr>
                  </table>
            
                  <table cellspacing="0" cellpadding="0" align="right">
                    <tr>
                      <td align="center" width="200" height="40" bgcolor="#dc3545" style="border-radius: 5px;">
                        <a href="${noAuthorizationLink}" target="_blank" style="font-size: 16px; font-family: sans-serif; color: #ffffff; text-decoration: none; line-height:40px; display: inline-block;">
                          No Autorizar
                        </a>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
              <div class="footer">
                  <p>Este es un mensaje automático, por favor no responder directamente.</p>
              </div>
          </div>
      </body>
      </html>
      `;
        let transporter = nodemailer.createTransport({
            host: process.env.EMAIL_HOST,
            port: parseInt(process.env.EMAIL_PORT, 10),
            secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for other ports
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });

        let mailOptions = {
            from: process.env.EMAIL_FROM,
            to: 'edelgado@biancorelab.com', // Asegúrate de tener este campo en tu formulario
            subject: 'Solicitud de nota de credito',
            html: htmlEmailContent,
            attachments: [
                {
                    filename: 'SolicitudDescuento.pdf',
                    content: pdfBuffer,
                },
                {
                    filename: 'LOGO BCL H.png',
                    path: path.join( "public", "img", "LOGO BCL H.png"),
                    cid: 'logoBCLH' // Este CID se usa en el src del img tag en el HTML
                }
            ],
        };

        await transporter.sendMail(mailOptions);
    }
    // Agrega este método a tu MailService.js

static async sendConfirmationEmail(applicantName, pdfBuffer, isAuthorized) {
    const subject = isAuthorized ? 'Formulario Autorizado' : 'Formulario No Autorizado';
    const htmlContent = `
        <h1>Confirmación de ${subject}</h1>
        <p>Hola ${applicantName},</p>
        <p>Su solicitud ha sido ${isAuthorized ? 'autorizada' : 'no autorizada'}.</p>
    `;
    
    let mailOptions = {
        from: process.env.EMAIL_FROM,
        to: applicantName,
        subject: subject,
        html: htmlContent,
        attachments: [
            {
                filename: 'Confirmacion.pdf',
                content: pdfBuffer,
                contentType: 'application/pdf'
            },
        ],
    };
    
    let transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: parseInt(process.env.EMAIL_PORT, 10),
        secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for other ports
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });

    await transporter.sendMail(mailOptions);
}

}

module.exports = MailService;
