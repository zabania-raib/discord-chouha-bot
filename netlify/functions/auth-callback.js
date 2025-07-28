// netlify/functions/auth-callback.js

import { unsign } from 'cookie-signature';
import axios from 'axios';
import { getStore } from '@netlify/blobs';

const { DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET, OAUTH_REDIRECT_URI, COOKIE_SECRET } = process.env;

// Helper to parse cookies from the request headers
const parseCookies = (cookieHeader) => {
    const cookies = {};
    if (cookieHeader) {
        cookieHeader.split(';').forEach(cookie => {
            const parts = cookie.split('=');
            cookies[parts.shift().trim()] = decodeURI(parts.join('='));
        });
    }
    return cookies;
};

export default async (req) => {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');

    const cookies = parseCookies(req.headers.get('cookie'));
    const storedState = cookies.state ? unsign(cookies.state, COOKIE_SECRET) : null;
    const storedMemberId = cookies.memberId ? unsign(cookies.memberId, COOKIE_SECRET) : null;

    // 1. Verify state for CSRF protection
    if (!state || !storedState || state !== storedState) {
        return new Response('Invalid state. Please try again.', { status: 403 });
    }

    try {
        // 2. Exchange authorization code for an access token
        const tokenResponse = await axios.post('https://discord.com/api/oauth2/token', new URLSearchParams({
            client_id: DISCORD_CLIENT_ID,
            client_secret: DISCORD_CLIENT_SECRET,
            grant_type: 'authorization_code',
            code,
            redirect_uri: OAUTH_REDIRECT_URI,
        }), {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        });

        const { access_token } = tokenResponse.data;

        // 3. Fetch user data from Discord API
        const userResponse = await axios.get('https://discord.com/api/users/@me', {
            headers: { Authorization: `Bearer ${access_token}` },
        });

        const user = userResponse.data;

        // 4. Security Validation: Ensure the authenticated user matches the member who started the flow
        if (storedMemberId && storedMemberId !== user.id) {
            console.warn(`Security Alert: memberId mismatch. Stored: ${storedMemberId}, OAuth User: ${user.id}`);
            return new Response('Authentication mismatch. Please try again.', { status: 403 });
        }

        // 5. Prepare data for storage
        const userData = {
            discord_id: user.id,
            email: user.email, // Can be null if scope not granted or email not verified
            verified: user.verified,
            username: user.username,
            global_name: user.global_name,
            avatar: user.avatar,
            created_at: new Date().toISOString(),
        };

        // 6. Store user data in Netlify Blobs
        const store = getStore('users');
        await store.setJSON(`users/${user.id}`, userData);
        console.log(`Successfully stored data for user: ${user.username} (${user.id})`);

        // 7. Return a success page
        let successMessage = '<h1>Thank You!</h1><p>You have been successfully verified and your data is stored.</p>';
        if (user.email === null) {
            successMessage += '<p style="color:orange;"><b>Note:</b> Your email address was not provided. Please ensure you have a verified email on your Discord account and that you granted the `email` permission.</p>';
        }
        successMessage += '<p>You can now close this window.</p>';

        return new Response(successMessage, { headers: { 'Content-Type': 'text/html' } });

    } catch (error) {
        console.error('Error in OAuth callback:', error.response ? error.response.data : error.message);
        return new Response('An error occurred during verification. Please try again.', { status: 500 });
    }
};
