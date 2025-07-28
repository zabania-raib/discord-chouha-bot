// netlify/functions/auth-discord.js

import { sign } from 'cookie-signature';
import { nanoid } from 'nanoid';

const { DISCORD_CLIENT_ID, OAUTH_REDIRECT_URI, COOKIE_SECRET } = process.env;

export default async (req) => {
    // Generate a random state value for CSRF protection
    const state = nanoid();

    // Store the state in a signed, httpOnly, secure cookie
    // This cookie will be used to verify the user's identity on the callback
    const signedState = sign(state, COOKIE_SECRET);
    const cookie = `state=${signedState}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=300`; // 5-minute expiry

    // Get the member ID from the query, if provided by the bot
    const url = new URL(req.url);
    const memberId = url.searchParams.get('member');

    // Store memberId in a separate cookie to validate against the authenticated user later
    let memberCookie = '';
    if (memberId) {
        const signedMemberId = sign(memberId, COOKIE_SECRET);
        memberCookie = `memberId=${signedMemberId}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=300`;
    }

    // Construct the Discord authorization URL
    const params = new URLSearchParams({
        client_id: DISCORD_CLIENT_ID,
        redirect_uri: OAUTH_REDIRECT_URI,
        response_type: 'code',
        scope: 'identify email',
        state: state,
    });

    const discordAuthUrl = `https://discord.com/api/oauth2/authorize?${params.toString()}`;

    // Redirect the user to Discord
    return new Response(null, {
        status: 302,
        headers: {
            Location: discordAuthUrl,
            'Set-Cookie': cookie,
            ...(memberCookie && { 'Set-Cookie-2': memberCookie }), // Use a different header key if setting multiple cookies
        },
    });
};
