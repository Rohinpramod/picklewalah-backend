const  nodemailer = require( 'nodemailer');

const transporter = nodemailer.createTransport({
    service:"gmail",
    auth:{
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

const sendEmail = async (to, subject, text) => {
    const mailOptions = {
        from:`"Pickle Walah" <${process.env.EMAIL_USER}>`,
        to,
        subject,
        text ,
    };
    return transporter.sendMail(mailOptions);
};

module.exports=  sendEmail