// scripts/register-commands.js

import 'dotenv/config';
import { REST, Routes, SlashCommandBuilder } from 'discord.js';

const { DISCORD_BOT_TOKEN, DISCORD_CLIENT_ID, GUILD_ID } = process.env;

if (!DISCORD_BOT_TOKEN || !DISCORD_CLIENT_ID || !GUILD_ID) {
    console.error('Missing required environment variables for command registration.');
    process.exit(1);
}

const commands = [
    new SlashCommandBuilder()
        .setName('check')
        .setDescription('Check your verification status in the database.'),
].map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(DISCORD_BOT_TOKEN);

(async () => {
    try {
        console.log(`Started refreshing ${commands.length} application (/) commands.`);

        // The put method is used to fully refresh all commands in the guild with the current set.
        const data = await rest.put(
            Routes.applicationGuildCommands(DISCORD_CLIENT_ID, GUILD_ID),
            { body: commands },
        );

        console.log(`Successfully reloaded ${data.length} application (/) commands.`);
    } catch (error) {
        console.error('Failed to register commands:', error);
    }
})();
