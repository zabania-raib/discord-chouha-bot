// netlify/functions/get-user.js

import { getStore } from '@netlify/blobs';

const { ADMIN_TOKEN } = process.env;

export default async (req) => {
    // 1. (Optional but Recommended) Secure the endpoint
    if (ADMIN_TOKEN && req.headers.get('x-admin-token') !== ADMIN_TOKEN) {
        return new Response('Unauthorized', { status: 401 });
    }

    // 2. Get the Discord ID from the query parameters
    const url = new URL(req.url);
    const discordId = url.searchParams.get('discord_id');

    if (!discordId) {
        return new Response('Missing discord_id parameter', { status: 400 });
    }

    try {
        // 3. Fetch the user data from Netlify Blobs
        const store = getStore('users');
        const userData = await store.get(`users/${discordId}`, { type: 'json' });

        if (!userData) {
            return new Response(JSON.stringify({ message: 'User not found.' }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // 4. Return the user data
        return new Response(JSON.stringify(userData), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (error) {
        console.error('Error fetching user from Blobs:', error);
        return new Response(JSON.stringify({ message: 'Internal Server Error' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
};
