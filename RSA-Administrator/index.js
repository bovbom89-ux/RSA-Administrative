require("dotenv").config();

const {
    Client,
    GatewayIntentBits,
    Partials,
    REST,
    Routes,
    SlashCommandBuilder,
    PermissionFlagsBits,
    ChannelType,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    StringSelectMenuBuilder,
} = require("discord.js");

const fs = require("fs");
const path = require("path");

// ============================================================
// CONFIG
// ============================================================

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

const BRAND_COLOUR = "#2F4DA8";
const LOGO = "<:Our_Logo:1557149633623363594>";

if (!TOKEN || !CLIENT_ID || !GUILD_ID) {
    console.error(
        "Missing DISCORD_TOKEN, CLIENT_ID or GUILD_ID in .env"
    );
    process.exit(1);
}

// ============================================================
// CLIENT
// ============================================================

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
    partials: [Partials.Channel],
});

// ============================================================
// DATA
// ============================================================

const dataFolder = path.join(__dirname, "data");

if (!fs.existsSync(dataFolder)) {
    fs.mkdirSync(dataFolder, { recursive: true });
}

const warningsFile = path.join(dataFolder, "warnings.json");
const configFile = path.join(dataFolder, "config.json");

function loadJSON(file, fallback = {}) {
    try {
        if (!fs.existsSync(file)) {
            fs.writeFileSync(
                file,
                JSON.stringify(fallback, null, 2)
            );

            return fallback;
        }

        return JSON.parse(
            fs.readFileSync(file, "utf8")
        );
    } catch (error) {
        console.error(`Could not load ${file}:`, error);
        return fallback;
    }
}

function saveJSON(file, data) {
    try {
        fs.writeFileSync(
            file,
            JSON.stringify(data, null, 2)
        );
    } catch (error) {
        console.error(`Could not save ${file}:`, error);
    }
}

let warnings = loadJSON(warningsFile, {});
let config = loadJSON(configFile, {});

// ============================================================
// TEMPORARY SUBMISSIONS
// ============================================================

const submissions = new Map();

// ============================================================
// EMBED HELPER
// ============================================================

function createEmbed(title, description) {
    return new EmbedBuilder()
        .setColor(BRAND_COLOUR)
        .setTitle(`${LOGO} ${title}`)
        .setDescription(description || null)
        .setTimestamp();
}

// ============================================================
// CONFIG HELPER
// ============================================================

function getGuildConfig(guildId) {
    if (!config[guildId]) {
        config[guildId] = {};
    }

    return config[guildId];
}

// ============================================================
// PERMISSION HELPERS
// ============================================================

function canManage(member) {
    return (
        member.permissions.has(
            PermissionFlagsBits.ManageGuild
        ) ||
        member.permissions.has(
            PermissionFlagsBits.Administrator
        )
    );
}

function isStaff(member) {
    if (!member) return false;

    if (
        member.permissions.has(
            PermissionFlagsBits.Administrator
        )
    ) {
        return true;
    }

    const guildConfig =
        getGuildConfig(member.guild.id);

    if (!guildConfig.staffRoleId) {
        return false;
    }

    return member.roles.cache.has(
        guildConfig.staffRoleId
    );
}

// ============================================================
// SLASH COMMANDS
// ============================================================

const commands = [

    // ========================================================
    // BASIC
    // ========================================================

    new SlashCommandBuilder()
        .setName("help")
        .setDescription("Shows all available commands"),

    new SlashCommandBuilder()
        .setName("ping")
        .setDescription("Checks the bot's latency"),

    new SlashCommandBuilder()
        .setName("botinfo")
        .setDescription("Shows information about the bot"),

    new SlashCommandBuilder()
        .setName("serverinfo")
        .setDescription("Shows information about this server"),

    new SlashCommandBuilder()
        .setName("userinfo")
        .setDescription("Shows information about a user")
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription("User to view")
                .setRequired(false)
        ),

    new SlashCommandBuilder()
        .setName("profile")
        .setDescription("Shows your profile"),

    // ========================================================
    // MODERATION
    // ========================================================

    new SlashCommandBuilder()
        .setName("ban")
        .setDescription("Bans a member")
        .setDefaultMemberPermissions(
            PermissionFlagsBits.BanMembers
        )
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription("Member to ban")
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName("reason")
                .setDescription("Reason")
                .setRequired(false)
        ),

    new SlashCommandBuilder()
        .setName("kick")
        .setDescription("Kicks a member")
        .setDefaultMemberPermissions(
            PermissionFlagsBits.KickMembers
        )
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription("Member to kick")
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName("reason")
                .setDescription("Reason")
                .setRequired(false)
        ),

    new SlashCommandBuilder()
        .setName("timeout")
        .setDescription("Times out a member")
        .setDefaultMemberPermissions(
            PermissionFlagsBits.ModerateMembers
        )
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription("Member to timeout")
                .setRequired(true)
        )
        .addIntegerOption(option =>
            option
                .setName("minutes")
                .setDescription("Duration in minutes")
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(40320)
        )
        .addStringOption(option =>
            option
                .setName("reason")
                .setDescription("Reason")
                .setRequired(false)
        ),

    new SlashCommandBuilder()
        .setName("untimeout")
        .setDescription("Removes a timeout")
        .setDefaultMemberPermissions(
            PermissionFlagsBits.ModerateMembers
        )
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription("Member")
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName("warn")
        .setDescription("Warns a member")
        .setDefaultMemberPermissions(
            PermissionFlagsBits.ModerateMembers
        )
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription("Member")
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName("reason")
                .setDescription("Warning reason")
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName("warnings")
        .setDescription("Shows a member's warnings")
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription("Member")
                .setRequired(false)
        ),

    new SlashCommandBuilder()
        .setName("clearwarnings")
        .setDescription("Clears a member's warnings")
        .setDefaultMemberPermissions(
            PermissionFlagsBits.ModerateMembers
        )
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription("Member")
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName("purge")
        .setDescription("Deletes messages")
        .setDefaultMemberPermissions(
            PermissionFlagsBits.ManageMessages
        )
        .addIntegerOption(option =>
            option
                .setName("amount")
                .setDescription("Amount of messages")
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(100)
        ),

    // ========================================================
    // MANAGEMENT
    // ========================================================

    new SlashCommandBuilder()
        .setName("lock")
        .setDescription("Locks the current channel")
        .setDefaultMemberPermissions(
            PermissionFlagsBits.ManageChannels
        ),

    new SlashCommandBuilder()
        .setName("unlock")
        .setDescription("Unlocks the current channel")
        .setDefaultMemberPermissions(
            PermissionFlagsBits.ManageChannels
        ),

    new SlashCommandBuilder()
        .setName("slowmode")
        .setDescription("Changes channel slowmode")
        .setDefaultMemberPermissions(
            PermissionFlagsBits.ManageChannels
        )
        .addIntegerOption(option =>
            option
                .setName("seconds")
                .setDescription("Slowmode seconds")
                .setRequired(true)
                .setMinValue(0)
                .setMaxValue(21600)
        ),

    new SlashCommandBuilder()
        .setName("role")
        .setDescription("Manage member roles")
        .setDefaultMemberPermissions(
            PermissionFlagsBits.ManageRoles
        )
        .addSubcommand(sub =>
            sub
                .setName("add")
                .setDescription("Adds a role")
                .addUserOption(option =>
                    option
                        .setName("user")
                        .setDescription("Member")
                        .setRequired(true)
                )
                .addRoleOption(option =>
                    option
                        .setName("role")
                        .setDescription("Role")
                        .setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub
                .setName("remove")
                .setDescription("Removes a role")
                .addUserOption(option =>
                    option
                        .setName("user")
                        .setDescription("Member")
                        .setRequired(true)
                )
                .addRoleOption(option =>
                    option
                        .setName("role")
                        .setDescription("Role")
                        .setRequired(true)
                )
        ),

    new SlashCommandBuilder()
        .setName("announce")
        .setDescription("Creates an announcement")
        .setDefaultMemberPermissions(
            PermissionFlagsBits.ManageGuild
        )
        .addStringOption(option =>
            option
                .setName("message")
                .setDescription("Announcement")
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName("embed")
        .setDescription("Creates an embed using a webhook")
        .setDefaultMemberPermissions(
            PermissionFlagsBits.ManageMessages
        )
        .addStringOption(option =>
            option
                .setName("title")
                .setDescription("Embed title")
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName("description")
                .setDescription("Embed description")
                .setRequired(true)
        )
        .addChannelOption(option =>
            option
                .setName("channel")
                .setDescription("Channel to send the embed")
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(true)
        ),

    // ========================================================
    // TICKETS
    // ========================================================

    new SlashCommandBuilder()
        .setName("ticketconfig")
        .setDescription("Configure the ticket system")
        .setDefaultMemberPermissions(
            PermissionFlagsBits.ManageGuild
        ),

    // ========================================================
    // SERVER SUBMISSIONS
    // ========================================================

    new SlashCommandBuilder()
        .setName("submitconfig")
        .setDescription("Configure the server submission system")
        .setDefaultMemberPermissions(
            PermissionFlagsBits.ManageGuild
        ),

].map(command => command.toJSON());

// ============================================================
// REGISTER COMMANDS
// ============================================================

async function registerCommands() {

    try {

        const rest =
            new REST({ version: "10" })
                .setToken(TOKEN);

        await rest.put(
            Routes.applicationGuildCommands(
                CLIENT_ID,
                GUILD_ID
            ),
            {
                body: commands
            }
        );

        console.log(
            `Registered ${commands.length} slash commands.`
        );

    } catch (error) {

        console.error(
            "Command registration error:",
            error
        );
    }
}

// ============================================================
// READY
// ============================================================

client.once("ready", async () => {

    console.log(
        `Logged in as ${client.user.tag}`
    );

    console.log(
        `Serving ${client.guilds.cache.size} server(s).`
    );

    await registerCommands();

    client.user.setActivity(
        "server submissions",
        {
            type: 3
        }
    );
});

// ============================================================
// HELP EMBED
// ============================================================

function helpEmbed() {

    return new EmbedBuilder()
        .setColor(BRAND_COLOUR)
        .setTitle(`${LOGO} Commands`)
        .setDescription(
            "Here are the commands available."
        )
        .addFields(
            {
                name: "General",
                value:
                    "`/help`\n" +
                    "`/ping`\n" +
                    "`/botinfo`\n" +
                    "`/serverinfo`\n" +
                    "`/userinfo`\n" +
                    "`/profile`"
            },
            {
                name: "Moderation",
                value:
                    "`/ban`\n" +
                    "`/kick`\n" +
                    "`/timeout`\n" +
                    "`/untimeout`\n" +
                    "`/warn`\n" +
                    "`/warnings`\n" +
                    "`/clearwarnings`\n" +
                    "`/purge`"
            },
            {
                name: "Management",
                value:
                    "`/lock`\n" +
                    "`/unlock`\n" +
                    "`/slowmode`\n" +
                    "`/role`\n" +
                    "`/announce`\n" +
                    "`/embed`"
            },
            {
                name: "Tickets",
                value:
                    "`/ticketconfig`"
            },
            {
                name: "Server Listings",
                value:
                    "`/submitconfig`"
            }
        )
        .setTimestamp();
}

// ============================================================
// INTERACTIONS
// ============================================================

client.on(
    "interactionCreate",
    async interaction => {

        try {

            // ====================================================
            // SLASH COMMANDS
            // ====================================================

            if (interaction.isChatInputCommand()) {

                const command =
                    interaction.commandName;

                // ==================================================
                // HELP
                // ==================================================

                if (command === "help") {

                    return interaction.reply({
                        embeds: [
                            helpEmbed()
                        ],
                        ephemeral: true
                    });
                }

                // ==================================================
                // PING
                // ==================================================

                if (command === "ping") {

                    return interaction.reply({
                        content:
                            `Pong! ${client.ws.ping}ms`,
                        ephemeral: true
                    });
                }

                // ==================================================
                // BOT INFO
                // ==================================================

                if (command === "botinfo") {

                    return interaction.reply({
                        embeds: [
                            createEmbed(
                                "Bot Information",
                                `**Bot:** ${client.user.tag}\n` +
                                `**Servers:** ${client.guilds.cache.size}\n` +
                                `**Discord.js:** v14`
                            )
                        ]
                    });
                }

                // ==================================================
                // SERVER INFO
                // ==================================================

                if (command === "serverinfo") {

                    const guild =
                        interaction.guild;

                    return interaction.reply({
                        embeds: [
                            createEmbed(
                                guild.name,
                                `**Owner:** <@${guild.ownerId}>\n` +
                                `**Members:** ${guild.memberCount}\n` +
                                `**Channels:** ${guild.channels.cache.size}\n` +
                                `**Roles:** ${guild.roles.cache.size}`
                            )
                        ]
                    });
                }

                // ==================================================
                // USER INFO
                // ==================================================

                if (command === "userinfo") {

                    const user =
                        interaction.options.getUser(
                            "user"
                        ) ||
                        interaction.user;

                    const member =
                        await interaction.guild.members
                            .fetch(user.id)
                            .catch(() => null);

                    const embed =
                        createEmbed(
                            "User Information",
                            `**Username:** ${user.tag}\n` +
                            `**User ID:** ${user.id}\n` +
                            `**Created:** <t:${Math.floor(
                                user.createdTimestamp / 1000
                            )}:F>`
                        )
                        .setThumbnail(
                            user.displayAvatarURL()
                        );

                    if (member?.joinedTimestamp) {
                        embed.addFields({
                            name: "Joined Server",
                            value:
                                `<t:${Math.floor(
                                    member.joinedTimestamp / 1000
                                )}:F>`
                        });
                    }

                    return interaction.reply({
                        embeds: [embed]
                    });
                }

                // ==================================================
                // PROFILE
                // ==================================================

                if (command === "profile") {

                    const member =
                        interaction.member;

                    return interaction.reply({
                        embeds: [
                            createEmbed(
                                `${interaction.user.username}'s Profile`,
                                `**Username:** ${interaction.user.tag}\n` +
                                `**Joined:** <t:${Math.floor(
                                    member.joinedTimestamp / 1000
                                )}:R>\n\n` +
                                `**Roles:** ${
                                    member.roles.cache
                                        .filter(
                                            role =>
                                                role.id !==
                                                interaction.guild.id
                                        )
                                        .map(role =>
                                            role.toString()
                                        )
                                        .join(", ") ||
                                    "None"
                                }`
                            ).setThumbnail(
                                interaction.user.displayAvatarURL()
                            )
                        ]
                    });
                }

                // ==================================================
                // BAN
                // ==================================================

                if (command === "ban") {

                    const user =
                        interaction.options.getUser(
                            "user"
                        );

                    const reason =
                        interaction.options.getString(
                            "reason"
                        ) ||
                        "No reason provided";

                    const member =
                        await interaction.guild.members
                            .fetch(user.id)
                            .catch(() => null);

                    if (!member) {
                        return interaction.reply({
                            content:
                                "That member is not in this server.",
                            ephemeral: true
                        });
                    }

                    await member.ban({
                        reason
                    });

                    return interaction.reply({
                        content:
                            `Banned **${user.tag}**.\nReason: ${reason}`
                    });
                }

                // ==================================================
                // KICK
                // ==================================================

                if (command === "kick") {

                    const user =
                        interaction.options.getUser(
                            "user"
                        );

                    const reason =
                        interaction.options.getString(
                            "reason"
                        ) ||
                        "No reason provided";

                    const member =
                        await interaction.guild.members
                            .fetch(user.id)
                            .catch(() => null);

                    if (!member) {
                        return interaction.reply({
                            content:
                                "That member is not in this server.",
                            ephemeral: true
                        });
                    }

                    await member.kick(reason);

                    return interaction.reply({
                        content:
                            `Kicked **${user.tag}**.\nReason: ${reason}`
                    });
                }

                // ==================================================
                // TIMEOUT
                // ==================================================

                if (command === "timeout") {

                    const user =
                        interaction.options.getUser(
                            "user"
                        );

                    const minutes =
                        interaction.options.getInteger(
                            "minutes"
                        );

                    const reason =
                        interaction.options.getString(
                            "reason"
                        ) ||
                        "No reason provided";

                    const member =
                        await interaction.guild.members
                            .fetch(user.id)
                            .catch(() => null);

                    if (!member) {
                        return interaction.reply({
                            content:
                                "Member not found.",
                            ephemeral: true
                        });
                    }

                    await member.timeout(
                        minutes * 60 * 1000,
                        reason
                    );

                    return interaction.reply({
                        content:
                            `Timed out **${user.tag}** for ${minutes} minute(s).`
                    });
                }

                // ==================================================
                // UNTIMEOUT
                // ==================================================

                if (command === "untimeout") {

                    const user =
                        interaction.options.getUser(
                            "user"
                        );

                    const member =
                        await interaction.guild.members
                            .fetch(user.id)
                            .catch(() => null);

                    if (!member) {
                        return interaction.reply({
                            content:
                                "Member not found.",
                            ephemeral: true
                        });
                    }

                    await member.timeout(null);

                    return interaction.reply({
                        content:
                            `Removed timeout from **${user.tag}**.`
                    });
                }

                // ==================================================
                // WARN
                // ==================================================

                if (command === "warn") {

                    const user =
                        interaction.options.getUser(
                            "user"
                        );

                    const reason =
                        interaction.options.getString(
                            "reason"
                        );

                    if (!warnings[interaction.guild.id]) {
                        warnings[interaction.guild.id] = {};
                    }

                    if (
                        !warnings[
                            interaction.guild.id
                        ][user.id]
                    ) {
                        warnings[
                            interaction.guild.id
                        ][user.id] = [];
                    }

                    warnings[
                        interaction.guild.id
                    ][user.id].push({
                        reason,
                        moderator:
                            interaction.user.id,
                        timestamp: Date.now()
                    });

                    saveJSON(
                        warningsFile,
                        warnings
                    );

                    return interaction.reply({
                        content:
                            `Warned **${user.tag}**.\nReason: ${reason}`
                    });
                }

                // ==================================================
                // WARNINGS
                // ==================================================

                if (command === "warnings") {

                    const user =
                        interaction.options.getUser(
                            "user"
                        ) ||
                        interaction.user;

                    const list =
                        warnings[
                            interaction.guild.id
                        ]?.[user.id] || [];

                    if (!list.length) {
                        return interaction.reply({
                            content:
                                `**${user.tag}** has no warnings.`,
                            ephemeral: true
                        });
                    }

                    return interaction.reply({
                        embeds: [
                            createEmbed(
                                `Warnings — ${user.tag}`,
                                list
                                    .map(
                                        (warning, index) =>
                                            `**${index + 1}.** ${warning.reason} — <@${warning.moderator}>`
                                    )
                                    .join("\n")
                            )
                        ]
                    });
                }

                // ==================================================
                // CLEAR WARNINGS
                // ==================================================

                if (command === "clearwarnings") {

                    const user =
                        interaction.options.getUser(
                            "user"
                        );

                    if (warnings[interaction.guild.id]) {
                        delete warnings[
                            interaction.guild.id
                        ][user.id];
                    }

                    saveJSON(
                        warningsFile,
                        warnings
                    );

                    return interaction.reply({
                        content:
                            `Cleared warnings for **${user.tag}**.`
                    });
                }

                // ==================================================
                // PURGE
                // ==================================================

                if (command === "purge") {

                    const amount =
                        interaction.options.getInteger(
                            "amount"
                        );

                    await interaction.channel.bulkDelete(
                        amount,
                        true
                    );

                    return interaction.reply({
                        content:
                            `Deleted ${amount} message(s).`,
                        ephemeral: true
                    });
                }

                // ==================================================
                // LOCK
                // ==================================================

                if (command === "lock") {

                    await interaction.channel
                        .permissionOverwrites.edit(
                            interaction.guild.roles.everyone,
                            {
                                SendMessages: false
                            }
                        );

                    return interaction.reply({
                        content:
                            "Channel locked."
                    });
                }

                // ==================================================
                // UNLOCK
                // ==================================================

                if (command === "unlock") {

                    await interaction.channel
                        .permissionOverwrites.edit(
                            interaction.guild.roles.everyone,
                            {
                                SendMessages: null
                            }
                        );

                    return interaction.reply({
                        content:
                            "Channel unlocked."
                    });
                }

                // ==================================================
                // SLOWMODE
                // ==================================================

                if (command === "slowmode") {

                    const seconds =
                        interaction.options.getInteger(
                            "seconds"
                        );

                    await interaction.channel
                        .setRateLimitPerUser(
                            seconds
                        );

                    return interaction.reply({
                        content:
                            seconds === 0
                                ? "Slowmode disabled."
                                : `Slowmode set to ${seconds} seconds.`
                    });
                }

                // ==================================================
                // ROLE
                // ==================================================

                if (command === "role") {

                    const sub =
                        interaction.options.getSubcommand();

                    const member =
                        interaction.options.getMember(
                            "user"
                        );

                    const role =
                        interaction.options.getRole(
                            "role"
                        );

                    if (
                        role.position >=
                        interaction.member.roles.highest.position
                    ) {
                        return interaction.reply({
                            content:
                                "You cannot manage that role.",
                            ephemeral: true
                        });
                    }

                    if (sub === "add") {
                        await member.roles.add(role);

                        return interaction.reply({
                            content:
                                `Added ${role} to **${member.user.tag}**.`
                        });
                    }

                    if (sub === "remove") {
                        await member.roles.remove(role);

                        return interaction.reply({
                            content:
                                `Removed ${role} from **${member.user.tag}**.`
                        });
                    }
                }

                // ==================================================
                // ANNOUNCE
                // ==================================================

                if (command === "announce") {

                    const message =
                        interaction.options.getString(
                            "message"
                        );

                    return interaction.reply({
                        embeds: [
                            createEmbed(
                                "Announcement",
                                message
                            ).setFooter({
                                text:
                                    `Posted by ${interaction.user.tag}`
                            })
                        ]
                    });
                }

                // ==================================================
                // WEBHOOK EMBED
                // ==================================================

                if (command === "embed") {

                    const title =
                        interaction.options.getString(
                            "title"
                        );

                    const description =
                        interaction.options.getString(
                            "description"
                        );

                    const channel =
                        interaction.options.getChannel(
                            "channel"
                        );

                    if (
                        !channel ||
                        channel.type !==
                            ChannelType.GuildText
                    ) {
                        return interaction.reply({
                            content:
                                "Please select a text channel.",
                            ephemeral: true
                        });
                    }

                    const webhooks =
                        await channel.fetchWebhooks();

                    let webhook =
                        webhooks.find(
                            hook =>
                                hook.owner?.id ===
                                client.user.id
                        );

                    if (!webhook) {

                        webhook =
                            await channel.createWebhook({
                                name: "Server Listings"
                            });
                    }

                    const embed =
                        new EmbedBuilder()
                            .setColor(BRAND_COLOUR)
                            .setTitle(
                                `${LOGO} ${title}`
                            )
                            .setDescription(
                                description
                            )
                            .setTimestamp();

                    await webhook.send({
                        username: "Server Listings",
                        avatarURL:
                            client.user.displayAvatarURL(),
                        embeds: [embed]
                    });

                    return interaction.reply({
                        content:
                            `Webhook embed sent to ${channel}.`,
                        ephemeral: true
                    });
                }

                // ==================================================
                // TICKET CONFIG
                // ==================================================

                if (command === "ticketconfig") {

                    if (
                        !canManage(
                            interaction.member
                        )
                    ) {
                        return interaction.reply({
                            content:
                                "You need Manage Server permissions.",
                            ephemeral: true
                        });
                    }

                    return sendTicketConfigPanel(
                        interaction
                    );
                }

                // ==================================================
                // SUBMIT CONFIG
                // ==================================================

                if (command === "submitconfig") {

                    if (
                        !canManage(
                            interaction.member
                        )
                    ) {
                        return interaction.reply({
                            content:
                                "You need Manage Server permissions.",
                            ephemeral: true
                        });
                    }

                    return sendSubmitConfigPanel(
                        interaction
                    );
                }
            }

            // ====================================================
            // BUTTONS
            // ====================================================

            if (interaction.isButton()) {

                // ==================================================
                // TICKET PANEL
                // ==================================================

                if (
                    interaction.customId ===
                    "open_ticket"
                ) {

                    const guildConfig =
                        getGuildConfig(
                            interaction.guild.id
                        );

                    if (
                        !guildConfig.ticketStaffRoleId
                    ) {
                        return interaction.reply({
                            content:
                                "The ticket system has not been configured.",
                            ephemeral: true
                        });
                    }

                    const existing =
                        interaction.guild.channels.cache.find(
                            channel =>
                                channel.topic ===
                                `ticket-owner:${interaction.user.id}`
                        );

                    if (existing) {
                        return interaction.reply({
                            content:
                                `You already have a ticket: ${existing}`,
                            ephemeral: true
                        });
                    }

                    const staffRole =
                        interaction.guild.roles.cache.get(
                            guildConfig.ticketStaffRoleId
                        );

                    const channel =
                        await interaction.guild.channels.create({
                            name:
                                `ticket-${interaction.user.username}`
                                    .toLowerCase()
                                    .replace(
                                        /[^a-z0-9-]/g,
                                        ""
                                    )
                                    .substring(0, 70),
                            type:
                                ChannelType.GuildText,
                            topic:
                                `ticket-owner:${interaction.user.id}`,
                            permissionOverwrites: [
                                {
                                    id:
                                        interaction.guild
                                            .roles
                                            .everyone.id,
                                    deny: [
                                        PermissionFlagsBits.ViewChannel
                                    ]
                                },
                                {
                                    id:
                                        interaction.user.id,
                                    allow: [
                                        PermissionFlagsBits.ViewChannel,
                                        PermissionFlagsBits.SendMessages,
                                        PermissionFlagsBits.ReadMessageHistory
                                    ]
                                },
                                {
                                    id:
                                        staffRole.id,
                                    allow: [
                                        PermissionFlagsBits.ViewChannel,
                                        PermissionFlagsBits.SendMessages,
                                        PermissionFlagsBits.ReadMessageHistory,
                                        PermissionFlagsBits.ManageMessages
                                    ]
                                },
                                {
                                    id:
                                        client.user.id,
                                    allow: [
                                        PermissionFlagsBits.ViewChannel,
                                        PermissionFlagsBits.SendMessages,
                                        PermissionFlagsBits.ReadMessageHistory,
                                        PermissionFlagsBits.ManageChannels
                                    ]
                                }
                            ]
                        });

                    const ticketButtons =
                        new ActionRowBuilder()
                            .addComponents(
                                new ButtonBuilder()
                                    .setCustomId(
                                        "claim_ticket"
                                    )
                                    .setLabel(
                                        "Claim"
                                    )
                                    .setStyle(
                                        ButtonStyle.Primary
                                    ),

                                new ButtonBuilder()
                                    .setCustomId(
                                        "close_ticket"
                                    )
                                    .setLabel(
                                        "Close"
                                    )
                                    .setStyle(
                                        ButtonStyle.Danger
                                    )
                            );

                    await channel.send({
                        content:
                            `${staffRole} ${interaction.user}`,
                        embeds: [
                            createEmbed(
                                "Support Ticket",
                                `Welcome ${interaction.user}!\n\n` +
                                "Please explain what you need help with. " +
                                "A member of staff will assist you shortly."
                            )
                        ],
                        components: [
                            ticketButtons
                        ]
                    });

                    return interaction.reply({
                        content:
                            `Your ticket has been created: ${channel}`,
                        ephemeral: true
                    });
                }

                // ==================================================
                // CLAIM TICKET
                // ==================================================

                if (
                    interaction.customId ===
                    "claim_ticket"
                ) {

                    if (
                        !isStaff(
                            interaction.member
                        )
                    ) {
                        return interaction.reply({
                            content:
                                "Only staff can claim tickets.",
                            ephemeral: true
                        });
                    }

                    return interaction.reply({
                        embeds: [
                            createEmbed(
                                "Ticket Claimed",
                                `This ticket has been claimed by ${interaction.user}.`
                            )
                        ]
                    });
                }

                // ==================================================
                // CLOSE TICKET
                // ==================================================

                if (
                    interaction.customId ===
                    "close_ticket"
                ) {

                    if (
                        !isStaff(
                            interaction.member
                        )
                    ) {
                        return interaction.reply({
                            content:
                                "Only staff can close tickets.",
                            ephemeral: true
                        });
                    }

                    await interaction.reply({
                        embeds: [
                            createEmbed(
                                "Ticket Closed",
                                `This ticket will be deleted in 5 seconds.\n\nClosed by ${interaction.user}.`
                            )
                        ]
                    });

                    setTimeout(
                        () =>
                            interaction.channel
                                .delete()
                                .catch(() => {}),
                        5000
                    );

                    return;
                }

                // ==================================================
                // SUBMIT SERVER
                // ==================================================

                if (
                    interaction.customId ===
                    "submit_server"
                ) {

                    const guildConfig =
                        getGuildConfig(
                            interaction.guild.id
                        );

                    if (
                        !guildConfig.submitStaffRoleId
                    ) {
                        return interaction.reply({
                            content:
                                "The server submission system has not been configured yet.",
                            ephemeral: true
                        });
                    }

                    const modal =
                        new ModalBuilder()
                            .setCustomId(
                                "server_submission_modal"
                            )
                            .setTitle(
                                "Submit Your Server"
                            );

                    const name =
                        new TextInputBuilder()
                            .setCustomId(
                                "server_name"
                            )
                            .setLabel(
                                "Server Name"
                            )
                            .setStyle(
                                TextInputStyle.Short
                            )
                            .setMaxLength(100)
                            .setRequired(true)
                            .setPlaceholder(
                                "Example: Wyndmere Academy"
                            );

                    const description =
                        new TextInputBuilder()
                            .setCustomId(
                                "server_description"
                            )
                            .setLabel(
                                "Server Description"
                            )
                            .setStyle(
                                TextInputStyle.Paragraph
                            )
                            .setMaxLength(1000)
                            .setRequired(true);

                    const invite =
                        new TextInputBuilder()
                            .setCustomId(
                                "server_invite"
                            )
                            .setLabel(
                                "Discord Invite"
                            )
                            .setStyle(
                                TextInputStyle.Short
                            )
                            .setMaxLength(200)
                            .setRequired(true)
                            .setPlaceholder(
                                "https://discord.gg/example"
                            );

                    const category =
                        new TextInputBuilder()
                            .setCustomId(
                                "server_category"
                            )
                            .setLabel(
                                "Server Category"
                            )
                            .setStyle(
                                TextInputStyle.Short
                            )
                            .setMaxLength(100)
                            .setRequired(true)
                            .setPlaceholder(
                                "Gaming, Community, Roblox..."
                            );

                    const owner =
                        new TextInputBuilder()
                            .setCustomId(
                                "server_owner"
                            )
                            .setLabel(
                                "Your Role"
                            )
                            .setStyle(
                                TextInputStyle.Short
                            )
                            .setMaxLength(100)
                            .setRequired(true)
                            .setPlaceholder(
                                "Owner, Founder, Administrator..."
                            );

                    modal.addComponents(
                        new ActionRowBuilder()
                            .addComponents(name),
                        new ActionRowBuilder()
                            .addComponents(description),
                        new ActionRowBuilder()
                            .addComponents(invite),
                        new ActionRowBuilder()
                            .addComponents(category),
                        new ActionRowBuilder()
                            .addComponents(owner)
                    );

                    return interaction.showModal(
                        modal
                    );
                }

                // ==================================================
                // ACCEPT SUBMISSION
                // ==================================================

                if (
                    interaction.customId.startsWith(
                        "submission_accept_"
                    )
                ) {

                    if (
                        !isStaff(
                            interaction.member
                        )
                    ) {
                        return interaction.reply({
                            content:
                                "Only staff can approve submissions.",
                            ephemeral: true
                        });
                    }

                    await interaction.deferReply({
                        ephemeral: true
                    });

                    const submissionId =
                        interaction.customId.replace(
                            "submission_accept_",
                            ""
                        );

                    const submission =
                        submissions.get(
                            submissionId
                        );

                    if (!submission) {
                        return interaction.editReply(
                            "This submission is no longer available."
                        );
                    }

                    const guildConfig =
                        getGuildConfig(
                            interaction.guild.id
                        );

                    const listingChannel =
                        interaction.guild.channels.cache.get(
                            guildConfig.verifiedChannelId
                        );

                    if (!listingChannel) {
                        return interaction.editReply(
                            "The verified server channel has not been configured."
                        );
                    }

                    // ----------------------------------------------
                    // VERIFIED ROLE
                    // ----------------------------------------------

                    if (
                        guildConfig.verifiedRoleId
                    ) {

                        const applicant =
                            await interaction.guild.members
                                .fetch(
                                    submission.userId
                                )
                                .catch(() => null);

                        const verifiedRole =
                            interaction.guild.roles.cache.get(
                                guildConfig.verifiedRoleId
                            );

                        if (
                            applicant &&
                            verifiedRole
                        ) {
                            await applicant.roles
                                .add(
                                    verifiedRole
                                )
                                .catch(() => {});
                        }
                    }

                    // ----------------------------------------------
                    // WEBHOOK
                    // ----------------------------------------------

                    const webhooks =
                        await listingChannel
                            .fetchWebhooks();

                    let webhook =
                        webhooks.find(
                            hook =>
                                hook.owner?.id ===
                                client.user.id
                        );

                    if (!webhook) {
                        webhook =
                            await listingChannel
                                .createWebhook({
                                    name:
                                        "Verified Servers"
                                });
                    }

                    const listing =
                        new EmbedBuilder()
                            .setColor(
                                BRAND_COLOUR
                            )
                            .setTitle(
                                `${LOGO} ${submission.serverName}`
                            )
                            .setDescription(
                                submission.description
                            )
                            .addFields(
                                {
                                    name:
                                        "Category",
                                    value:
                                        submission.category,
                                    inline: true
                                },
                                {
                                    name:
                                        "Server Owner",
                                    value:
                                        `<@${submission.userId}>`,
                                    inline: true
                                },
                                {
                                    name:
                                        "Join Server",
                                    value:
                                        `[Click here to join](${submission.invite})`,
                                    inline: false
                                }
                            )
                            .setFooter({
                                text:
                                    "Verified Server"
                            })
                            .setTimestamp();

                    await webhook.send({
                        username:
                            submission.serverName,
                        avatarURL:
                            client.user
                                .displayAvatarURL(),
                        embeds: [
                            listing
                        ]
                    });

                    // ----------------------------------------------
                    // DM APPLICANT
                    // ----------------------------------------------

                    const applicant =
                        await client.users
                            .fetch(
                                submission.userId
                            )
                            .catch(() => null);

                    if (applicant) {
                        await applicant
                            .send({
                                embeds: [
                                    createEmbed(
                                        "Server Approved",
                                        `Your server **${submission.serverName}** has been approved and has been added to the verified server listings.`
                                    )
                                ]
                            })
                            .catch(() => {});
                    }

                    submissions.delete(
                        submissionId
                    );

                    await interaction.message
                        .edit({
                            components: [
                                new ActionRowBuilder()
                                    .addComponents(
                                        new ButtonBuilder()
                                            .setCustomId(
                                                "submission_approved"
                                            )
                                            .setLabel(
                                                "Approved"
                                            )
                                            .setStyle(
                                                ButtonStyle.Success
                                            )
                                            .setDisabled(
                                                true
                                            )
                                    )
                            ]
                        });

                    return interaction.editReply(
                        "The server has been approved and listed."
                    );
                }

                // ==================================================
                // DENY SUBMISSION
                // ==================================================

                if (
                    interaction.customId.startsWith(
                        "submission_deny_"
                    )
                ) {

                    if (
                        !isStaff(
                            interaction.member
                        )
                    ) {
                        return interaction.reply({
                            content:
                                "Only staff can deny submissions.",
                            ephemeral: true
                        });
                    }

                    const submissionId =
                        interaction.customId.replace(
                            "submission_deny_",
                            ""
                        );

                    const submission =
                        submissions.get(
                            submissionId
                        );

                    if (!submission) {
                        return interaction.reply({
                            content:
                                "This submission is no longer available.",
                            ephemeral: true
                        });
                    }

                    const modal =
                        new ModalBuilder()
                            .setCustomId(
                                `submission_deny_modal_${submissionId}`
                            )
                            .setTitle(
                                "Deny Submission"
                            );

                    const reason =
                        new TextInputBuilder()
                            .setCustomId(
                                "deny_reason"
                            )
                            .setLabel(
                                "Reason for denial"
                            )
                            .setStyle(
                                TextInputStyle.Paragraph
                            )
                            .setRequired(true)
                            .setMaxLength(1000);

                    modal.addComponents(
                        new ActionRowBuilder()
                            .addComponents(reason)
                    );

                    return interaction.showModal(
                        modal
                    );
                }

                // ==================================================
                // TICKET CONFIG BUTTONS
                // ==================================================

                if (
                    [
                        "ticket_set_staff",
                        "ticket_set_category",
                        "ticket_send_panel"
                    ].includes(
                        interaction.customId
                    )
                ) {

                    if (
                        !canManage(
                            interaction.member
                        )
                    ) {
                        return interaction.reply({
                            content:
                                "You need Manage Server permissions.",
                            ephemeral: true
                        });
                    }

                    if (
                        interaction.customId ===
                        "ticket_set_staff"
                    ) {

                        const roles =
                            interaction.guild.roles.cache
                                .filter(
                                    role =>
                                        role.id !==
                                        interaction.guild.id
                                )
                                .first(25);

                        const menu =
                            new StringSelectMenuBuilder()
                                .setCustomId(
                                    "ticket_staff_select"
                                )
                                .setPlaceholder(
                                    "Select ticket staff role"
                                )
                                .addOptions(
                                    roles.map(
                                        role => ({
                                            label:
                                                role.name.substring(
                                                    0,
                                                    100
                                                ),
                                            value:
                                                role.id
                                        })
                                    )
                                );

                        return interaction.reply({
                            content:
                                "Select the role that should have access to tickets.",
                            components: [
                                new ActionRowBuilder()
                                    .addComponents(
                                        menu
                                    )
                            ],
                            ephemeral: true
                        });
                    }

                    if (
                        interaction.customId ===
                        "ticket_set_category"
                    ) {

                        const categories =
                            interaction.guild.channels.cache
                                .filter(
                                    channel =>
                                        channel.type ===
                                        ChannelType.GuildCategory
                                )
                                .first(25);

                        if (!categories.size) {
                            return interaction.reply({
                                content:
                                    "There are no categories available.",
                                ephemeral: true
                            });
                        }

                        const menu =
                            new StringSelectMenuBuilder()
                                .setCustomId(
                                    "ticket_category_select"
                                )
                                .setPlaceholder(
                                    "Select ticket category"
                                )
                                .addOptions(
                                    categories.map(
                                        category => ({
                                            label:
                                                category.name.substring(
                                                    0,
                                                    100
                                                ),
                                            value:
                                                category.id
                                        })
                                    )
                                );

                        return interaction.reply({
                            content:
                                "Select the category where tickets should be created.",
                            components: [
                                new ActionRowBuilder()
                                    .addComponents(
                                        menu
                                    )
                            ],
                            ephemeral: true
                        });
                    }

                    if (
                        interaction.customId ===
                        "ticket_send_panel"
                    ) {

                        const embed =
                            createEmbed(
                                "Support Tickets",
                                "Need help? Open a ticket below and a member of staff will assist you."
                            );

                        const row =
                            new ActionRowBuilder()
                                .addComponents(
                                    new ButtonBuilder()
                                        .setCustomId(
                                            "open_ticket"
                                        )
                                        .setLabel(
                                            "Open Ticket"
                                        )
                                        .setStyle(
                                            ButtonStyle.Primary
                                        )
                                );

                        await interaction.channel.send({
                            embeds: [embed],
                            components: [row]
                        });

                        return interaction.reply({
                            content:
                                "Ticket panel sent.",
                            ephemeral: true
                        });
                    }
                }

                // ==================================================
                // SUBMIT CONFIG BUTTONS
                // ==================================================

                if (
                    [
                        "submit_set_staff",
                        "submit_set_review",
                        "submit_set_verified",
                        "submit_set_verified_role",
                        "submit_send_panel"
                    ].includes(
                        interaction.customId
                    )
                ) {

                    if (
                        !canManage(
                            interaction.member
                        )
                    ) {
                        return interaction.reply({
                            content:
                                "You need Manage Server permissions.",
                            ephemeral: true
                        });
                    }

                    // STAFF ROLE

                    if (
                        interaction.customId ===
                        "submit_set_staff"
                    ) {

                        const roles =
                            interaction.guild.roles.cache
                                .filter(
                                    role =>
                                        role.id !==
                                        interaction.guild.id
                                )
                                .first(25);

                        const menu =
                            new StringSelectMenuBuilder()
                                .setCustomId(
                                    "submit_staff_select"
                                )
                                .setPlaceholder(
                                    "Select submission staff role"
                                )
                                .addOptions(
                                    roles.map(
                                        role => ({
                                            label:
                                                role.name.substring(
                                                    0,
                                                    100
                                                ),
                                            value:
                                                role.id
                                        })
                                    )
                                );

                        return interaction.reply({
                            content:
                                "Select the role that should review submissions.",
                            components: [
                                new ActionRowBuilder()
                                    .addComponents(
                                        menu
                                    )
                            ],
                            ephemeral: true
                        });
                    }

                    // REVIEW CATEGORY

                    if (
                        interaction.customId ===
                        "submit_set_review"
                    ) {

                        const categories =
                            interaction.guild.channels.cache
                                .filter(
                                    channel =>
                                        channel.type ===
                                        ChannelType.GuildCategory
                                )
                                .first(25);

                        const menu =
                            new StringSelectMenuBuilder()
                                .setCustomId(
                                    "submit_review_select"
                                )
                                .setPlaceholder(
                                    "Select review category"
                                )
                                .addOptions(
                                    categories.map(
                                        category => ({
                                            label:
                                                category.name.substring(
                                                    0,
                                                    100
                                                ),
                                            value:
                                                category.id
                                        })
                                    )
                                );

                        return interaction.reply({
                            content:
                                "Select the category where private review channels should be created.",
                            components: [
                                new ActionRowBuilder()
                                    .addComponents(
                                        menu
                                    )
                            ],
                            ephemeral: true
                        });
                    }

                    // VERIFIED CHANNEL

                    if (
                        interaction.customId ===
                        "submit_set_verified"
                    ) {

                        const channels =
                            interaction.guild.channels.cache
                                .filter(
                                    channel =>
                                        channel.type ===
                                        ChannelType.GuildText
                                )
                                .first(25);

                        const menu =
                            new StringSelectMenuBuilder()
                                .setCustomId(
                                    "submit_verified_select"
                                )
                                .setPlaceholder(
                                    "Select verified server channel"
                                )
                                .addOptions(
                                    channels.map(
                                        channel => ({
                                            label:
                                                channel.name.substring(
                                                    0,
                                                    100
                                                ),
                                            value:
                                                channel.id
                                        })
                                    )
                                );

                        return interaction.reply({
                            content:
                                "Select where approved servers should be listed.",
                            components: [
                                new ActionRowBuilder()
                                    .addComponents(
                                        menu
                                    )
                            ],
                            ephemeral: true
                        });
                    }

                    // VERIFIED ROLE

                    if (
                        interaction.customId ===
                        "submit_set_verified_role"
                    ) {

                        const roles =
                            interaction.guild.roles.cache
                                .filter(
                                    role =>
                                        role.id !==
                                        interaction.guild.id
                                )
                                .first(25);

                        const menu =
                            new StringSelectMenuBuilder()
                                .setCustomId(
                                    "submit_verified_role_select"
                                )
                                .setPlaceholder(
                                    "Select verified role"
                                )
                                .addOptions(
                                    roles.map(
                                        role => ({
                                            label:
                                                role.name.substring(
                                                    0,
                                                    100
                                                ),
                                            value:
                                                role.id
                                        })
                                    )
                                );

                        return interaction.reply({
                            content:
                                "Select the role given to approved server owners.",
                            components: [
                                new ActionRowBuilder()
                                    .addComponents(
                                        menu
                                    )
                            ],
                            ephemeral: true
                        });
                    }

                    // SEND SUBMISSION PANEL

                    if (
                        interaction.customId ===
                        "submit_send_panel"
                    ) {

                        const embed =
                            createEmbed(
                                "Submit Your Server",
                                "Want your server featured in our verified server listings?\n\n" +
                                "Click the button below to submit your server for review.\n\n" +
                                "All submissions are manually reviewed by our staff team."
                            );

                        const row =
                            new ActionRowBuilder()
                                .addComponents(
                                    new ButtonBuilder()
                                        .setCustomId(
                                            "submit_server"
                                        )
                                        .setLabel(
                                            "Submit Server"
                                        )
                                        .setStyle(
                                            ButtonStyle.Primary
                                        )
                                );

                        await interaction.channel.send({
                            embeds: [embed],
                            components: [row]
                        });

                        return interaction.reply({
                            content:
                                "Submission panel sent.",
                            ephemeral: true
                        });
                    }
                }

                // ==================================================
                // REFRESH CONFIG PANELS
                // ==================================================

                if (
                    interaction.customId ===
                    "ticket_refresh"
                ) {

                    await interaction.deferUpdate();

                    return sendTicketConfigPanel(
                        interaction,
                        true
                    );
                }

                if (
                    interaction.customId ===
                    "submit_refresh"
                ) {

                    await interaction.deferUpdate();

                    return sendSubmitConfigPanel(
                        interaction,
                        true
                    );
                }
            }

            // ====================================================
            // SELECT MENUS
            // ====================================================

            if (
                interaction.isStringSelectMenu()
            ) {

                // ==================================================
                // TICKET STAFF
                // ==================================================

                if (
                    interaction.customId ===
                    "ticket_staff_select"
                ) {

                    const roleId =
                        interaction.values[0];

                    getGuildConfig(
                        interaction.guild.id
                    ).ticketStaffRoleId =
                        roleId;

                    saveJSON(
                        configFile,
                        config
                    );

                    return interaction.update({
                        content:
                            `Ticket staff role set to <@&${roleId}>.`,
                        components: []
                    });
                }

                // ==================================================
                // TICKET CATEGORY
                // ==================================================

                if (
                    interaction.customId ===
                    "ticket_category_select"
                ) {

                    const categoryId =
                        interaction.values[0];

                    getGuildConfig(
                        interaction.guild.id
                    ).ticketCategoryId =
                        categoryId;

                    saveJSON(
                        configFile,
                        config
                    );

                    return interaction.update({
                        content:
                            `Ticket category set to <#${categoryId}>.`,
                        components: []
                    });
                }

                // ==================================================
                // SUBMISSION STAFF
                // ==================================================

                if (
                    interaction.customId ===
                    "submit_staff_select"
                ) {

                    const roleId =
                        interaction.values[0];

                    getGuildConfig(
                        interaction.guild.id
                    ).submitStaffRoleId =
                        roleId;

                    // Also use this as general staff role
                    if (
                        !getGuildConfig(
                            interaction.guild.id
                        ).staffRoleId
                    ) {
                        getGuildConfig(
                            interaction.guild.id
                        ).staffRoleId =
                            roleId;
                    }

                    saveJSON(
                        configFile,
                        config
                    );

                    return interaction.update({
                        content:
                            `Submission staff role set to <@&${roleId}>.`,
                        components: []
                    });
                }

                // ==================================================
                // REVIEW CATEGORY
                // ==================================================

                if (
                    interaction.customId ===
                    "submit_review_select"
                ) {

                    const categoryId =
                        interaction.values[0];

                    getGuildConfig(
                        interaction.guild.id
                    ).submitReviewCategoryId =
                        categoryId;

                    saveJSON(
                        configFile,
                        config
                    );

                    return interaction.update({
                        content:
                            `Submission review category set to <#${categoryId}>.`,
                        components: []
                    });
                }

                // ==================================================
                // VERIFIED CHANNEL
                // ==================================================

                if (
                    interaction.customId ===
                    "submit_verified_select"
                ) {

                    const channelId =
                        interaction.values[0];

                    getGuildConfig(
                        interaction.guild.id
                    ).verifiedChannelId =
                        channelId;

                    saveJSON(
                        configFile,
                        config
                    );

                    return interaction.update({
                        content:
                            `Verified server channel set to <#${channelId}>.`,
                        components: []
                    });
                }

                // ==================================================
                // VERIFIED ROLE
                // ==================================================

                if (
                    interaction.customId ===
                    "submit_verified_role_select"
                ) {

                    const roleId =
                        interaction.values[0];

                    getGuildConfig(
                        interaction.guild.id
                    ).verifiedRoleId =
                        roleId;

                    saveJSON(
                        configFile,
                        config
                    );

                    return interaction.update({
                        content:
                            `Verified role set to <@&${roleId}>.`,
                        components: []
                    });
                }
            }

            // ====================================================
            // MODALS
            // ====================================================

            if (
                interaction.isModalSubmit()
            ) {

                // ==================================================
                // SERVER SUBMISSION
                // ==================================================

                if (
                    interaction.customId ===
                    "server_submission_modal"
                ) {

                    const serverName =
                        interaction.fields.getTextInputValue(
                            "server_name"
                        );

                    const description =
                        interaction.fields.getTextInputValue(
                            "server_description"
                        );

                    const invite =
                        interaction.fields.getTextInputValue(
                            "server_invite"
                        );

                    const category =
                        interaction.fields.getTextInputValue(
                            "server_category"
                        );

                    const owner =
                        interaction.fields.getTextInputValue(
                            "server_owner"
                        );

                    const submissionId =
                        `${interaction.user.id}-${Date.now()}`;

                    submissions.set(
                        submissionId,
                        {
                            userId:
                                interaction.user.id,
                            serverName,
                            description,
                            invite,
                            category,
                            owner
                        }
                    );

                    const guildConfig =
                        getGuildConfig(
                            interaction.guild.id
                        );

                    const staffRole =
                        interaction.guild.roles.cache.get(
                            guildConfig.submitStaffRoleId
                        );

                    const reviewCategory =
                        interaction.guild.channels.cache.get(
                            guildConfig.submitReviewCategoryId
                        );

                    if (!staffRole) {
                        return interaction.reply({
                            content:
                                "The submission staff role is not configured correctly.",
                            ephemeral: true
                        });
                    }

                    // ----------------------------------------------
                    // REVIEW CHANNEL
                    // ----------------------------------------------

                    const safeName =
                        serverName
                            .toLowerCase()
                            .replace(
                                /[^a-z0-9]+/g,
                                "-"
                            )
                            .replace(
                                /^-|-$/g,
                                ""
                            )
                            .substring(
                                0,
                                60
                            );

                    const reviewChannel =
                        await interaction.guild.channels.create({
                            name:
                                `review-${safeName}`,
                            type:
                                ChannelType.GuildText,
                            parent:
                                reviewCategory ||
                                undefined,
                            permissionOverwrites: [
                                {
                                    id:
                                        interaction.guild
                                            .roles
                                            .everyone
                                            .id,
                                    deny: [
                                        PermissionFlagsBits.ViewChannel
                                    ]
                                },
                                {
                                    id:
                                        staffRole.id,
                                    allow: [
                                        PermissionFlagsBits.ViewChannel,
                                        PermissionFlagsBits.SendMessages,
                                        PermissionFlagsBits.ReadMessageHistory
                                    ]
                                },
                                {
                                    id:
                                        client.user.id,
                                    allow: [
                                        PermissionFlagsBits.ViewChannel,
                                        PermissionFlagsBits.SendMessages,
                                        PermissionFlagsBits.ReadMessageHistory,
                                        PermissionFlagsBits.ManageChannels
                                    ]
                                }
                            ]
                        });

                    // ----------------------------------------------
                    // REVIEW EMBED
                    // ----------------------------------------------

                    const reviewEmbed =
                        createEmbed(
                            "New Server Submission",
                            `A new server has been submitted for manual verification.\n\n` +
                            `**Submitted by:** <@${interaction.user.id}>`
                        )
                            .addFields(
                                {
                                    name:
                                        "Server Name",
                                    value:
                                        serverName
                                },
                                {
                                    name:
                                        "Description",
                                    value:
                                        description
                                },
                                {
                                    name:
                                        "Invite",
                                    value:
                                        invite
                                },
                                {
                                    name:
                                        "Category",
                                    value:
                                        category
                                },
                                {
                                    name:
                                        "Submitter's Role",
                                    value:
                                        owner
                                }
                            );

                    const buttons =
                        new ActionRowBuilder()
                            .addComponents(
                                new ButtonBuilder()
                                    .setCustomId(
                                        `submission_accept_${submissionId}`
                                    )
                                    .setLabel(
                                        "Accept"
                                    )
                                    .setStyle(
                                        ButtonStyle.Success
                                    ),

                                new ButtonBuilder()
                                    .setCustomId(
                                        `submission_deny_${submissionId}`
                                    )
                                    .setLabel(
                                        "Deny"
                                    )
                                    .setStyle(
                                        ButtonStyle.Danger
                                    )
                            );

                    await reviewChannel.send({
                        content:
                            `${staffRole} — new submission awaiting review.`,
                        embeds: [
                            reviewEmbed
                        ],
                        components: [
                            buttons
                        ]
                    });

                    return interaction.reply({
                        embeds: [
                            createEmbed(
                                "Submission Received",
                                "Your server has been submitted successfully.\n\n" +
                                "Our staff team will manually review it. " +
                                "You will receive a DM once a decision has been made."
                            )
                        ],
                        ephemeral: true
                    });
                }

                // ==================================================
                // DENY MODAL
                // ==================================================

                if (
                    interaction.customId.startsWith(
                        "submission_deny_modal_"
                    )
                ) {

                    if (
                        !isStaff(
                            interaction.member
                        )
                    ) {
                        return interaction.reply({
                            content:
                                "Only staff can do this.",
                            ephemeral: true
                        });
                    }

                    const submissionId =
                        interaction.customId.replace(
                            "submission_deny_modal_",
                            ""
                        );

                    const submission =
                        submissions.get(
                            submissionId
                        );

                    if (!submission) {
                        return interaction.reply({
                            content:
                                "This submission no longer exists.",
                            ephemeral: true
                        });
                    }

                    const reason =
                        interaction.fields.getTextInputValue(
                            "deny_reason"
                        );

                    const applicant =
                        await client.users
                            .fetch(
                                submission.userId
                            )
                            .catch(() => null);

                    if (applicant) {
                        await applicant
                            .send({
                                embeds: [
                                    createEmbed(
                                        "Server Submission Denied",
                                        `Your server **${submission.serverName}** was not approved for our verified server listings.\n\n` +
                                        `**Reason:** ${reason}`
                                    )
                                ]
                            })
                            .catch(() => {});
                    }

                    submissions.delete(
                        submissionId
                    );

                    await interaction.channel.send({
                        embeds: [
                            createEmbed(
                                "Submission Denied",
                                `This submission has been denied by ${interaction.user}.\n\n` +
                                `**Reason:** ${reason}`
                            )
                        ]
                    });

                    await interaction.reply({
                        content:
                            "The submitter has been notified and the submission has been denied.",
                        ephemeral: true
                    });

                    return;
                }
            }

        } catch (error) {

            console.error(
                "INTERACTION ERROR:",
                error
            );

            try {

                if (
                    interaction.replied ||
                    interaction.deferred
                ) {
                    await interaction.followUp({
                        content:
                            "Something went wrong while processing that action.",
                        ephemeral: true
                    });
                } else {
                    await interaction.reply({
                        content:
                            "Something went wrong while processing that action.",
                        ephemeral: true
                    });
                }

            } catch {}
        }
    }
);

// ============================================================
// TICKET CONFIG PANEL
// ============================================================

async function sendTicketConfigPanel(
    interaction,
    edit = false
) {

    const guildConfig =
        getGuildConfig(
            interaction.guild.id
        );

    const staffRole =
        guildConfig.ticketStaffRoleId
            ? interaction.guild.roles.cache.get(
                  guildConfig.ticketStaffRoleId
              )
            : null;

    const category =
        guildConfig.ticketCategoryId
            ? interaction.guild.channels.cache.get(
                  guildConfig.ticketCategoryId
              )
            : null;

    const embed =
        createEmbed(
            "Ticket Configuration",
            "Configure your ticket system using the buttons below."
        )
            .addFields(
                {
                    name:
                        "Staff Role",
                    value:
                        staffRole
                            ? `${staffRole}`
                            : "Not configured",
                    inline: true
                },
                {
                    name:
                        "Ticket Category",
                    value:
                        category
                            ? `${category}`
                            : "Not configured",
                    inline: true
                },
                {
                    name:
                        "Panel",
                    value:
                        "Use **Send Panel** to post the ticket panel in the current channel.",
                    inline: false
                }
            );

    const row =
        new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(
                        "ticket_set_staff"
                    )
                    .setLabel(
                        "Staff Role"
                    )
                    .setStyle(
                        ButtonStyle.Primary
                    ),

                new ButtonBuilder()
                    .setCustomId(
                        "ticket_set_category"
                    )
                    .setLabel(
                        "Ticket Category"
                    )
                    .setStyle(
                        ButtonStyle.Secondary
                    ),

                new ButtonBuilder()
                    .setCustomId(
                        "ticket_send_panel"
                    )
                    .setLabel(
                        "Send Panel"
                    )
                    .setStyle(
                        ButtonStyle.Success
                    ),

                new ButtonBuilder()
                    .setCustomId(
                        "ticket_refresh"
                    )
                    .setLabel(
                        "Refresh"
                    )
                    .setStyle(
                        ButtonStyle.Secondary
                    )
            );

    if (edit) {

        return interaction.editReply({
            embeds: [embed],
            components: [row]
        });
    }

    return interaction.reply({
        embeds: [embed],
        components: [row],
        ephemeral: true
    });
}

// ============================================================
// SUBMIT CONFIG PANEL
// ============================================================

async function sendSubmitConfigPanel(
    interaction,
    edit = false
) {

    const guildConfig =
        getGuildConfig(
            interaction.guild.id
        );

    const staffRole =
        guildConfig.submitStaffRoleId
            ? interaction.guild.roles.cache.get(
                  guildConfig.submitStaffRoleId
              )
            : null;

    const reviewCategory =
        guildConfig.submitReviewCategoryId
            ? interaction.guild.channels.cache.get(
                  guildConfig.submitReviewCategoryId
              )
            : null;

    const verifiedChannel =
        guildConfig.verifiedChannelId
            ? interaction.guild.channels.cache.get(
                  guildConfig.verifiedChannelId
              )
            : null;

    const verifiedRole =
        guildConfig.verifiedRoleId
            ? interaction.guild.roles.cache.get(
                  guildConfig.verifiedRoleId
              )
            : null;

    const embed =
        createEmbed(
            "Server Submission Configuration",
            "Configure how server submissions are reviewed and listed."
        )
            .addFields(
                {
                    name:
                        "Submission Staff",
                    value:
                        staffRole
                            ? `${staffRole}`
                            : "Not configured",
                    inline: true
                },
                {
                    name:
                        "Review Category",
                    value:
                        reviewCategory
                            ? `${reviewCategory}`
                            : "Not configured",
                    inline: true
                },
                {
                    name:
                        "Verified Channel",
                    value:
                        verifiedChannel
                            ? `${verifiedChannel}`
                            : "Not configured",
                    inline: true
                },
                {
                    name:
                        "Verified Role",
                    value:
                        verifiedRole
                            ? `${verifiedRole}`
                            : "Not configured",
                    inline: true
                },
                {
                    name:
                        "How it works",
                    value:
                        "Members use the panel to submit their server. " +
                        "A private review channel is automatically created for staff. " +
                        "Staff can accept or deny the submission. " +
                        "Accepted servers are automatically posted in the configured verified channel using a webhook.",
                    inline: false
                }
            );

    const row1 =
        new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(
                        "submit_set_staff"
                    )
                    .setLabel(
                        "Staff Role"
                    )
                    .setStyle(
                        ButtonStyle.Primary
                    ),

                new ButtonBuilder()
                    .setCustomId(
                        "submit_set_review"
                    )
                    .setLabel(
                        "Review Category"
                    )
                    .setStyle(
                        ButtonStyle.Secondary
                    ),

                new ButtonBuilder()
                    .setCustomId(
                        "submit_set_verified"
                    )
                    .setLabel(
                        "Verified Channel"
                    )
                    .setStyle(
                        ButtonStyle.Secondary
                    )
            );

    const row2 =
        new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(
                        "submit_set_verified_role"
                    )
                    .setLabel(
                        "Verified Role"
                    )
                    .setStyle(
                        ButtonStyle.Primary
                    ),

                new ButtonBuilder()
                    .setCustomId(
                        "submit_send_panel"
                    )
                    .setLabel(
                        "Send Panel"
                    )
                    .setStyle(
                        ButtonStyle.Success
                    ),

                new ButtonBuilder()
                    .setCustomId(
                        "submit_refresh"
                    )
                    .setLabel(
                        "Refresh"
                    )
                    .setStyle(
                        ButtonStyle.Secondary
                    )
            );

    if (edit) {

        return interaction.editReply({
            embeds: [embed],
            components: [
                row1,
                row2
            ]
        });
    }

    return interaction.reply({
        embeds: [embed],
        components: [
            row1,
            row2
        ],
        ephemeral: true
    });
}

// ============================================================
// CLEAN OLD SUBMISSIONS
// ============================================================

setInterval(() => {

    const now =
        Date.now();

    for (
        const [
            id,
            submission
        ] of submissions.entries()
    ) {

        if (
            now -
                submission.createdAt >
            24 * 60 * 60 * 1000
        ) {
            submissions.delete(id);
        }
    }

}, 30 * 60 * 1000);

// ============================================================
// LOGIN
// ============================================================

client.login(TOKEN);
