// bot.js - Runs on Railway

import 'dotenv/config';
import { Client, GatewayIntentBits, Partials, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import axios from 'axios';

const { DISCORD_BOT_TOKEN, BASE_URL, WELCOME_CHANNEL_ID, GUILD_ID, ADMIN_TOKEN } = process.env;

if (!DISCORD_BOT_TOKEN || !BASE_URL || !WELCOME_CHANNEL_ID || !GUILD_ID) {
    console.error('Missing required environment variables for the bot. Check your Railway variables.');
    process.exit(1);
}

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers, // Required for guildMemberAdd
        GatewayIntentBits.DirectMessages,
    ],
    partials: [Partials.Channel], // Required for DMs
});

client.once('ready', () => {
    console.log(`Bot logged in as ${client.user.tag}! Ready to verify users.`);

    const checkCommand = new SlashCommandBuilder()
        .setName('check')
        .setDescription('Check your verification status');

    client.application?.commands.create(checkCommand);
});

// Handler for when a new member joins the server
client.on('guildMemberAdd', async (member) => {
    if (member.guild.id !== GUILD_ID) return;

    console.log(`New member: ${member.user.tag} (${member.id})`);

    const authUrl = `${BASE_URL}/auth/discord?member=${member.id}`;
    const welcomeMessage = `Welcome to the server, ${member.user.username}!`;
    const instructions = 'To get access, please verify your identity by clicking the button below.';

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setLabel('Verify Identity').setStyle(ButtonStyle.Link).setURL(authUrl)
    );

    try {
        await member.send({ content: `${welcomeMessage}\n${instructions}`, components: [row] });
        console.log(`Sent verification DM to ${member.user.tag}`);
    } catch (error) {
        console.warn(`Could not DM ${member.user.tag}. Posting in welcome channel.`);
        const welcomeChannel = client.channels.cache.get(WELCOME_CHANNEL_ID);
        if (welcomeChannel) {
            const embed = new EmbedBuilder()
                .setColor('#ff9900')
                .setTitle('Welcome!')
                .setDescription(`${welcomeMessage} Since I couldn't DM you, please verify here:`)
                .setTimestamp();
            await welcomeChannel.send({ content: `Hey ${member}!`, embeds: [embed], components: [row] });
        }
    }
});

// Handler for slash commands
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName } = interaction;

    if (commandName === 'check') {
        await interaction.deferReply({ ephemeral: true });
        const userId = interaction.user.id;
        const checkUrl = `${BASE_URL}/api/get-user?discord_id=${userId}`;

        try {
            const response = await axios.get(checkUrl, {
                headers: { 'x-admin-token': ADMIN_TOKEN },
            });

            if (response.status === 200 && response.data) {
                const embed = new EmbedBuilder()
                    .setColor('#2ECC71')
                    .setTitle('Verification Status: Found')
                    .setDescription('Your data is successfully stored in our system.')
                    .addFields(
                        { name: 'Email', value: response.data.email || 'Not provided' },
                        { name: 'Verified', value: response.data.verified ? 'Yes' : 'No' },
                        { name: 'Timestamp', value: new Date(response.data.created_at).toUTCString() }
                    );
                await interaction.editReply({ embeds: [embed] });
            }
        } catch (error) {
            if (error.response && error.response.status === 404) {
                const embed = new EmbedBuilder()
                    .setColor('#E74C3C')
                    .setTitle('Verification Status: Not Found')
                    .setDescription('You have not completed the verification process yet.');
                await interaction.editReply({ embeds: [embed] });
            } else {
                console.error('Error checking user status:', error.message);
                await interaction.editReply({ content: 'An error occurred while checking your status.' });
            }
        }
    }
});

client.login(DISCORD_BOT_TOKEN);
