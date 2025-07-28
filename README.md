# Discord OAuth2 Verification: Netlify + Railway Architecture

This project provides a production-ready, serverless system for verifying new members in a Discord server using Netlify Functions for the web-facing OAuth2 flow and a Railway worker for the 24/7 Discord bot.

## Architecture

-   **Web (Netlify)**: Handles the OAuth2 login flow using serverless functions. Data is stored in **Netlify Blobs**.
-   **Bot (Railway)**: A persistent `discord.js` worker that listens for new members and interacts with the Netlify functions.

---

## Deployment & Setup Guide

Follow these steps to deploy and configure the entire system.

### Step 1: Discord Application Setup

1.  **Create Application**: Go to the [Discord Developer Portal](https://discord.com/developers/applications) and create a new application.
2.  **Create Bot**: Navigate to the **Bot** tab and click **Add Bot**.
3.  **Enable Privileged Intent**: Toggle on the **SERVER MEMBERS INTENT**. This is critical for the bot to detect when new members join.
4.  **Get Credentials**: 
    -   Copy the **Application ID** (also called Client ID) from the **General Information** page.
    -   Reset and copy the **Bot Token** from the **Bot** tab.
    -   Copy the **Client Secret** from the **OAuth2** page.

### Step 2: Deploy Web Functions to Netlify

1.  **Fork/Clone this Repository**: Get a copy of this project on your GitHub account.
2.  **Create Netlify Site**: Go to [Netlify](https://app.netlify.com/start) and create a new site linked to your forked repository.
3.  **Set Environment Variables**: In your new Netlify site's dashboard, go to `Site settings > Build & deploy > Environment` and add the following variables:

| Variable Name | Value | Description |
| :--- | :--- | :--- |
| `DISCORD_CLIENT_ID` | `Your_Client_ID_Here` | From Discord Dev Portal. |
| `DISCORD_CLIENT_SECRET` | `Your_Client_Secret_Here` | From Discord Dev Portal. |
| `BASE_URL` | `https://your-site-name.netlify.app` | Your live Netlify site URL. |
| `OAUTH_REDIRECT_URI`| `https://your-site-name.netlify.app/auth/callback` | The full callback URL. |
| `COOKIE_SECRET` | *(Generate a long random string)* | Used to sign security cookies. |
| `ADMIN_TOKEN` | *(Generate a long random string)* | A secret key to protect the `get-user` API. |

4.  **Trigger Deploy**: Let Netlify deploy your `main` branch. Once it's live, your functions will be available at the `BASE_URL`.

### Step 3: Update Discord Redirect URI

1.  Go back to your application in the **Discord Developer Portal**.
2.  Navigate to the **OAuth2** tab.
3.  In the **Redirects** section, add the exact URL you used for `OAUTH_REDIRECT_URI` in Netlify (e.g., `https://your-site-name.netlify.app/auth/callback`).
4.  Click **Save Changes**.

### Step 4: Deploy Bot to Railway

1.  **Create Railway Project**: Go to [Railway](https://railway.app) and create a new project, deploying from your same GitHub repository.
2.  **Set Start Command**: In the service settings, ensure the **Start Command** is `npm start:bot` or `node bot.js`.
3.  **Set Environment Variables**: In the service's **Variables** tab, add the following:

| Variable Name | Value | Description |
| :--- | :--- | :--- |
| `DISCORD_BOT_TOKEN` | `Your_Bot_Token_Here` | From Discord Dev Portal. |
| `GUILD_ID` | `Your_Server_ID_Here` | Right-click your Discord server icon > Copy Server ID. |
| `WELCOME_CHANNEL_ID`| `Your_Channel_ID_Here` | Right-click your welcome channel > Copy Channel ID. |
| `BASE_URL` | `https://your-site-name.netlify.app` | The same URL as your Netlify site. |
| `ADMIN_TOKEN` | *(Use the same random string as Netlify)* | The secret key for the API. |

### Step 5: Register Slash Commands

This only needs to be done once. You can run this locally from your machine.

1.  Create a `.env` file in your local project root.
2.  Fill it with `DISCORD_BOT_TOKEN`, `DISCORD_CLIENT_ID`, and `GUILD_ID`.
3.  Run the command registration script:
    ```bash
    npm install
    node scripts/register-commands.js
    ```
    You should see a success message. The `/check` command is now available in your server.

### Step 6: Invite Bot and Test

1.  **Invite Bot**: In the Discord Developer Portal (`OAuth2 > URL Generator`), select the `bot` scope, grant `Send Messages` and `Embed Links` permissions, and use the generated URL to invite the bot to your server.
2.  **Test the Flow**: Use a secondary Discord account to join the server. You should receive a DM with a verification link. Click it, authorize the app, and you should see the success page.
3.  **Check Storage**: In your server, type `/check`. The bot should reply with an ephemeral message confirming your data is stored.

---

## Troubleshooting

-   **Invalid redirect_uri**: This error from Discord means the `OAUTH_REDIRECT_URI` in your Netlify env vars does not **exactly** match the one you saved in the Discord Developer Portal.
-   **No guildMemberAdd events**: Ensure the **Server Members Intent** is enabled in the Discord Developer Portal and your bot code includes the `GatewayIntentBits.GuildMembers` intent.
-   **DM Failed**: Many users disable DMs from server bots. The fallback message in the `WELCOME_CHANNEL_ID` is the expected behavior in this case.
-   **404 on `/check`**: If the bot says 'User not found', it means the OAuth callback failed to store your data in Netlify Blobs. Check the function logs in your Netlify dashboard for errors.
