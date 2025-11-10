// netlify/functions/verify-admin-password.js
exports.handler = async (event, context) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    const { password } = JSON.parse(event.body);
    const correctPassword = process.env.ADMIN_PASSWORD;

    if (!correctPassword) {
        console.error('ADMIN_PASSWORD environment variable is not set.');
        return { statusCode: 500, body: 'Server configuration error.' };
    }

    if (password === correctPassword) {
        return { statusCode: 200, body: JSON.stringify({ success: true }) };
    } else {
        return { statusCode: 401, body: JSON.stringify({ success: false, message: 'Senha incorreta.' }) };
    }
};
