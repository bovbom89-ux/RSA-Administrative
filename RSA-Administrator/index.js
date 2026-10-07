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
    StringSelectMenuBuilder
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
        GatewayIntentBits.MessageContent
    ],
    partials: [
        Partials.Channel
    ]
});

// ============================================================
// DATA
// ============================================================

const dataFolder = path.join(__dirname, "data");

if (!fs.existsSync(dataFolder)) {
    fs.mkdirSync(dataFolder, {
        recursive: true
    });
}

const warningsFile = path.join(
    dataFolder,
    "warnings.json"
);

const configFile = path.join(
    dataFolder,
    "config.json"
);

function loadJSON(file, fallback = {}) {
    try {
        if (!fs.existsSync(file)) {
            fs.writeFileSync(
                file,
                JSON.stringify(
                    fallback,
                    null,
                    2
                )
            );

            return fallback;
        }

        return JSON.parse(
            fs.readFileSync(
                file,
                "utf8"
            )
        );

    } catch (error) {

        console.error(
            `Could not load ${file}:`,
            error
        );

        return fallback;
    }
}

function saveJSON(file, data) {
    try {
        fs.writeFileSync(
            file,
            JSON.stringify(
                data,
                null,
                2
            )
        );

    } catch (error) {

        console.error(
            `Could not save ${file}:`,
            error
        );
    }
}

let warnings = loadJSON(
    warningsFile,
    {}
);

let config = loadJSON(
    configFile,
    {}
);

// ============================================================
// TEMPORARY DATA
// ============================================================

const submissions = new Map();

const embedBuilders = new Map();

// ============================================================
// EMBED HELPER
// ============================================================

function createEmbed(
    title,
    description
) {
    const embed =
        new EmbedBuilder()
            .setColor(
                BRAND_COLOUR
            )
            .setTitle(
                `${LOGO} ${title}`
            )
            .setTimestamp();

    if (description) {
        embed.setDescription(
            description
        );
    }

    return embed;
}

// ============================================================
// CONFIG HELPER
// ============================================================

function getGuildConfig(
    guildId
) {

    if (!config[guildId]) {
        config[guildId] = {};
    }

    return config[guildId];
}

// ============================================================
// PERMISSIONS
// ============================================================

function canManage(member) {

    if (!member) {
        return false;
    }

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

    if (!member) {
        return false;
    }

    if (
        member.permissions.has(
            PermissionFlagsBits.Administrator
        )
    ) {
        return true;
    }

    const guildConfig =
        getGuildConfig(
            member.guild.id
        );

    const staffRoles = [
        guildConfig.staffRoleId,
        guildConfig.ticketStaffRoleId,
        guildConfig.submitStaffRoleId,
        guildConfig.reportStaffRoleId
    ].filter(Boolean);

    return staffRoles.some(
        roleId =>
            member.roles.cache.has(
                roleId
            )
    );
}

// ============================================================
// SAFE CHANNEL NAME
// ============================================================

function safeChannelName(
    name,
    fallback = "user"
) {

    const cleaned =
        name
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
                70
            );

    return cleaned || fallback;
}

// ============================================================
// INVITE URL
// ============================================================

function normaliseInvite(
    invite
) {

    let url =
        invite.trim();

    if (
        url.startsWith(
            "discord.gg/"
        )
    ) {
        url =
            `https://${url}`;
    }

    if (
        url.startsWith(
            "www.discord.gg/"
        )
    ) {
        url =
            `https://${url}`;
    }

    if (
        url.startsWith(
            "discord.com/invite/"
        )
    ) {
        url =
            `https://${url}`;
    }

    return url;
}

// ============================================================
// WEBHOOK HELPER
// ============================================================

async function getBotWebhook(
    channel,
    name = "Server Listings"
) {

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
                name
            });

    } else if (
        webhook.name !== name
    ) {

        await webhook.edit({
            name
        }).catch(() => {});
    }

    return webhook;
}

// ============================================================
// COMMANDS
// ============================================================

const commands = [

    // GENERAL

    new SlashCommandBuilder()
        .setName("help")
        .setDescription(
            "Shows available commands"
        ),

    new SlashCommandBuilder()
        .setName("ping")
        .setDescription(
            "Checks the bot latency"
        ),

    new SlashCommandBuilder()
        .setName("botinfo")
        .setDescription(
            "Shows information about the bot"
        ),

    new SlashCommandBuilder()
        .setName("serverinfo")
        .setDescription(
            "Shows information about this server"
        ),

    new SlashCommandBuilder()
        .setName("userinfo")
        .setDescription(
            "Shows information about a user"
        )
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription(
                    "User to view"
                )
                .setRequired(false)
        ),

    new SlashCommandBuilder()
        .setName("profile")
        .setDescription(
            "Shows your profile"
        ),

    // MODERATION

    new SlashCommandBuilder()
        .setName("ban")
        .setDescription(
            "Bans a member"
        )
        .setDefaultMemberPermissions(
            PermissionFlagsBits.BanMembers
        )
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription(
                    "Member to ban"
                )
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName("reason")
                .setDescription(
                    "Reason"
                )
                .setRequired(false)
        ),

    new SlashCommandBuilder()
        .setName("kick")
        .setDescription(
            "Kicks a member"
        )
        .setDefaultMemberPermissions(
            PermissionFlagsBits.KickMembers
        )
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription(
                    "Member to kick"
                )
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName("reason")
                .setDescription(
                    "Reason"
                )
                .setRequired(false)
        ),

    new SlashCommandBuilder()
        .setName("timeout")
        .setDescription(
            "Times out a member"
        )
        .setDefaultMemberPermissions(
            PermissionFlagsBits.ModerateMembers
        )
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription(
                    "Member"
                )
                .setRequired(true)
        )
        .addIntegerOption(option =>
            option
                .setName("minutes")
                .setDescription(
                    "Duration in minutes"
                )
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(40320)
        )
        .addStringOption(option =>
            option
                .setName("reason")
                .setDescription(
                    "Reason"
                )
                .setRequired(false)
        ),

    new SlashCommandBuilder()
        .setName("untimeout")
        .setDescription(
            "Removes a timeout"
        )
        .setDefaultMemberPermissions(
            PermissionFlagsBits.ModerateMembers
        )
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription(
                    "Member"
                )
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName("warn")
        .setDescription(
            "Warns a member"
        )
        .setDefaultMemberPermissions(
            PermissionFlagsBits.ModerateMembers
        )
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription(
                    "Member"
                )
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName("reason")
                .setDescription(
                    "Warning reason"
                )
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName("warnings")
        .setDescription(
            "Shows warnings"
        )
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription(
                    "User"
                )
                .setRequired(false)
        ),

    new SlashCommandBuilder()
        .setName("clearwarnings")
        .setDescription(
            "Clears warnings"
        )
        .setDefaultMemberPermissions(
            PermissionFlagsBits.ModerateMembers
        )
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription(
                    "User"
                )
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName("purge")
        .setDescription(
            "Deletes messages"
        )
        .setDefaultMemberPermissions(
            PermissionFlagsBits.ManageMessages
        )
        .addIntegerOption(option =>
            option
                .setName("amount")
                .setDescription(
                    "Amount"
                )
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(100)
        ),

    // MANAGEMENT

    new SlashCommandBuilder()
        .setName("lock")
        .setDescription(
            "Locks this channel"
        )
        .setDefaultMemberPermissions(
            PermissionFlagsBits.ManageChannels
        ),

    new SlashCommandBuilder()
        .setName("unlock")
        .setDescription(
            "Unlocks this channel"
        )
        .setDefaultMemberPermissions(
            PermissionFlagsBits.ManageChannels
        ),

    new SlashCommandBuilder()
        .setName("slowmode")
        .setDescription(
            "Sets slowmode"
        )
        .setDefaultMemberPermissions(
            PermissionFlagsBits.ManageChannels
        )
        .addIntegerOption(option =>
            option
                .setName("seconds")
                .setDescription(
                    "Seconds"
                )
                .setRequired(true)
                .setMinValue(0)
                .setMaxValue(21600)
        ),

    new SlashCommandBuilder()
        .setName("role")
        .setDescription(
            "Manage roles"
        )
        .setDefaultMemberPermissions(
            PermissionFlagsBits.ManageRoles
        )
        .addSubcommand(sub =>
            sub
                .setName("add")
                .setDescription(
                    "Adds a role"
                )
                .addUserOption(option =>
                    option
                        .setName("user")
                        .setDescription(
                            "Member"
                        )
                        .setRequired(true)
                )
                .addRoleOption(option =>
                    option
                        .setName("role")
                        .setDescription(
                            "Role"
                        )
                        .setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub
                .setName("remove")
                .setDescription(
                    "Removes a role"
                )
                .addUserOption(option =>
                    option
                        .setName("user")
                        .setDescription(
                            "Member"
                        )
                        .setRequired(true)
                )
                .addRoleOption(option =>
                    option
                        .setName("role")
                        .setDescription(
                            "Role"
                        )
                        .setRequired(true)
                )
        ),

    new SlashCommandBuilder()
        .setName("announce")
        .setDescription(
            "Creates an announcement"
        )
        .setDefaultMemberPermissions(
            PermissionFlagsBits.ManageGuild
        )
        .addStringOption(option =>
            option
                .setName("message")
                .setDescription(
                    "Announcement"
                )
                .setRequired(true)
        ),

    // WEBHOOK EMBED

    new SlashCommandBuilder()
        .setName("embed")
        .setDescription(
            "Open the webhook embed builder"
        )
        .setDefaultMemberPermissions(
            PermissionFlagsBits.ManageMessages
        ),

    // TICKETS

    new SlashCommandBuilder()
        .setName("ticketconfig")
        .setDescription(
            "Configure tickets"
        )
        .setDefaultMemberPermissions(
            PermissionFlagsBits.ManageGuild
        ),

    // SUBMISSIONS

    new SlashCommandBuilder()
        .setName("submitconfig")
        .setDescription(
            "Configure server submissions"
        )
        .setDefaultMemberPermissions(
            PermissionFlagsBits.ManageGuild
        ),

    // REPORTS

    new SlashCommandBuilder()
        .setName("reportsetup")
        .setDescription(
            "Configure server reports"
        )
        .setDefaultMemberPermissions(
            PermissionFlagsBits.ManageGuild
        ),

    // VERIFICATION

    new SlashCommandBuilder()
        .setName("verification")
        .setDescription(
            "Send the server verification panel"
        )
        .setDefaultMemberPermissions(
            PermissionFlagsBits.ManageGuild
        )

].map(
    command =>
        command.toJSON()
);

// ============================================================
// COMMAND REGISTRATION
// ============================================================

async function registerCommands() {

    try {

        const rest =
            new REST({
                version: "10"
            }).setToken(
                TOKEN
            );

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

client.once(
    "ready",
    async () => {

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
    }
);

// ============================================================
// HELP
// ============================================================

function helpEmbed() {

    return createEmbed(
        "Commands",
        "Here are the available commands."
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
                name: "Systems",
                value:
                    "`/ticketconfig`\n" +
                    "`/submitconfig`\n" +
                    "`/reportsetup`\n" +
                    "`/verification`"
            }
        );
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

            if (
                interaction.isChatInputCommand()
            ) {

                const command =
                    interaction.commandName;

                // ----------------------------------------------
                // HELP
                // ----------------------------------------------

                if (
                    command === "help"
                ) {

                    return interaction.reply({
                        embeds: [
                            helpEmbed()
                        ],
                        ephemeral: true
                    });
                }

                // ----------------------------------------------
                // PING
                // ----------------------------------------------

                if (
                    command === "ping"
                ) {

                    return interaction.reply({
                        content:
                            `Pong! ${client.ws.ping}ms`,
                        ephemeral: true
                    });
                }

                // ----------------------------------------------
                // BOT INFO
                // ----------------------------------------------

                if (
                    command === "botinfo"
                ) {

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

                // ----------------------------------------------
                // SERVER INFO
                // ----------------------------------------------

                if (
                    command === "serverinfo"
                ) {

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

                // ----------------------------------------------
                // USER INFO
                // ----------------------------------------------

                if (
                    command === "userinfo"
                ) {

                    const user =
                        interaction.options.getUser(
                            "user"
                        ) ||
                        interaction.user;

                    const member =
                        await interaction.guild.members
                            .fetch(
                                user.id
                            )
                            .catch(
                                () => null
                            );

                    const embed =
                        createEmbed(
                            "User Information",
                            `**Username:** ${user.tag}\n` +
                            `**User ID:** ${user.id}\n` +
                            `**Created:** <t:${Math.floor(
                                user.createdTimestamp /
                                1000
                            )}:F>`
                        )
                        .setThumbnail(
                            user.displayAvatarURL()
                        );

                    if (
                        member?.joinedTimestamp
                    ) {

                        embed.addFields({
                            name:
                                "Joined Server",
                            value:
                                `<t:${Math.floor(
                                    member.joinedTimestamp /
                                    1000
                                )}:F>`
                        });
                    }

                    return interaction.reply({
                        embeds: [
                            embed
                        ]
                    });
                }

                // ----------------------------------------------
                // PROFILE
                // ----------------------------------------------

                if (
                    command === "profile"
                ) {

                    const member =
                        interaction.member;

                    return interaction.reply({
                        embeds: [
                            createEmbed(
                                `${interaction.user.username}'s Profile`,
                                `**Username:** ${interaction.user.tag}\n` +
                                `**Joined:** <t:${Math.floor(
                                    member.joinedTimestamp /
                                    1000
                                )}:R>\n\n` +
                                `**Roles:** ${
                                    member.roles.cache
                                        .filter(
                                            role =>
                                                role.id !==
                                                interaction.guild.id
                                        )
                                        .map(
                                            role =>
                                                role.toString()
                                        )
                                        .join(
                                            ", "
                                        ) ||
                                    "None"
                                }`
                            ).setThumbnail(
                                interaction.user
                                    .displayAvatarURL()
                            )
                        ]
                    });
                }

                // ----------------------------------------------
                // BAN
                // ----------------------------------------------

                if (
                    command === "ban"
                ) {

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
                            .fetch(
                                user.id
                            )
                            .catch(
                                () => null
                            );

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

                // ----------------------------------------------
                // KICK
                // ----------------------------------------------

                if (
                    command === "kick"
                ) {

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
                            .fetch(
                                user.id
                            )
                            .catch(
                                () => null
                            );

                    if (!member) {

                        return interaction.reply({
                            content:
                                "That member is not in this server.",
                            ephemeral: true
                        });
                    }

                    await member.kick(
                        reason
                    );

                    return interaction.reply({
                        content:
                            `Kicked **${user.tag}**.\nReason: ${reason}`
                    });
                }

                // ----------------------------------------------
                // TIMEOUT
                // ----------------------------------------------

                if (
                    command === "timeout"
                ) {

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
                            .fetch(
                                user.id
                            )
                            .catch(
                                () => null
                            );

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

                // ----------------------------------------------
                // UNTIMEOUT
                // ----------------------------------------------

                if (
                    command === "untimeout"
                ) {

                    const user =
                        interaction.options.getUser(
                            "user"
                        );

                    const member =
                        await interaction.guild.members
                            .fetch(
                                user.id
                            )
                            .catch(
                                () => null
                            );

                    if (!member) {

                        return interaction.reply({
                            content:
                                "Member not found.",
                            ephemeral: true
                        });
                    }

                    await member.timeout(
                        null
                    );

                    return interaction.reply({
                        content:
                            `Removed timeout from **${user.tag}**.`
                    });
                }

                // ----------------------------------------------
                // WARN
                // ----------------------------------------------

                if (
                    command === "warn"
                ) {

                    const user =
                        interaction.options.getUser(
                            "user"
                        );

                    const reason =
                        interaction.options.getString(
                            "reason"
                        );

                    if (
                        !warnings[
                            interaction.guild.id
                        ]
                    ) {

                        warnings[
                            interaction.guild.id
                        ] = {};
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
                        timestamp:
                            Date.now()
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

                // ----------------------------------------------
                // WARNINGS
                // ----------------------------------------------

                if (
                    command === "warnings"
                ) {

                    const user =
                        interaction.options.getUser(
                            "user"
                        ) ||
                        interaction.user;

                    const list =
                        warnings[
                            interaction.guild.id
                        ]?.[
                            user.id
                        ] || [];

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
                                    .join(
                                        "\n"
                                    )
                            )
                        ]
                    });
                }

                // ----------------------------------------------
                // CLEAR WARNINGS
                // ----------------------------------------------

                if (
                    command === "clearwarnings"
                ) {

                    const user =
                        interaction.options.getUser(
                            "user"
                        );

                    if (
                        warnings[
                            interaction.guild.id
                        ]
                    ) {

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

                // ----------------------------------------------
                // PURGE
                // ----------------------------------------------

                if (
                    command === "purge"
                ) {

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

                // ----------------------------------------------
                // LOCK
                // ----------------------------------------------

                if (
                    command === "lock"
                ) {

                    await interaction.channel
                        .permissionOverwrites
                        .edit(
                            interaction.guild.roles.everyone,
                            {
                                SendMessages:
                                    false
                            }
                        );

                    return interaction.reply({
                        content:
                            "Channel locked."
                    });
                }

                // ----------------------------------------------
                // UNLOCK
                // ----------------------------------------------

                if (
                    command === "unlock"
                ) {

                    await interaction.channel
                        .permissionOverwrites
                        .edit(
                            interaction.guild.roles.everyone,
                            {
                                SendMessages:
                                    null
                            }
                        );

                    return interaction.reply({
                        content:
                            "Channel unlocked."
                    });
                }

                // ----------------------------------------------
                // SLOWMODE
                // ----------------------------------------------

                if (
                    command === "slowmode"
                ) {

                    const seconds =
                        interaction.options.getInteger(
                            "seconds"
                        );

                    await interaction.channel.setRateLimitPerUser(
                        seconds
                    );

                    return interaction.reply({
                        content:
                            seconds === 0
                                ? "Slowmode disabled."
                                : `Slowmode set to ${seconds} seconds.`
                    });
                }

                // ----------------------------------------------
                // ROLE
                // ----------------------------------------------

                if (
                    command === "role"
                ) {

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

                    if (
                        sub === "add"
                    ) {

                        await member.roles.add(
                            role
                        );

                        return interaction.reply({
                            content:
                                `Added ${role} to **${member.user.tag}**.`
                        });
                    }

                    await member.roles.remove(
                        role
                    );

                    return interaction.reply({
                        content:
                            `Removed ${role} from **${member.user.tag}**.`
                    });
                }

                // ----------------------------------------------
                // ANNOUNCE
                // ----------------------------------------------

                if (
                    command === "announce"
                ) {

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

                // ----------------------------------------------
                // EMBED BUILDER
                // ----------------------------------------------

                if (
                    command === "embed"
                ) {

                    return sendEmbedBuilder(
                        interaction
                    );
                }

                // ----------------------------------------------
                // TICKET CONFIG
                // ----------------------------------------------

                if (
                    command === "ticketconfig"
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

                    return sendTicketConfigPanel(
                        interaction
                    );
                }

                // ----------------------------------------------
                // SUBMIT CONFIG
                // ----------------------------------------------

                if (
                    command === "submitconfig"
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

                    return sendSubmitConfigPanel(
                        interaction
                    );
                }

                // ----------------------------------------------
                // REPORT SETUP
                // ----------------------------------------------

                if (
                    command === "reportsetup"
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

                    return sendReportConfigPanel(
                        interaction
                    );
                }

                // ----------------------------------------------
                // VERIFICATION
                // ----------------------------------------------

                if (
                    command === "verification"
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

                    const row =
                        new ActionRowBuilder()
                            .addComponents(
                                new ButtonBuilder()
                                    .setCustomId(
                                        "verification_button"
                                    )
                                    .setLabel(
                                        "Verify"
                                    )
                                    .setStyle(
                                        ButtonStyle.Success
                                    )
                            );

                    return interaction.reply({
                        embeds: [
                            createEmbed(
                                "Server Verification",
                                "Click the button below to verify yourself."
                            )
                        ],
                        components: [
                            row
                        ]
                    });
                }
            }

            // ====================================================
            // BUTTONS
            // ====================================================

            if (
                interaction.isButton()
            ) {

                const id =
                    interaction.customId;

                // ----------------------------------------------
                // VERIFICATION
                // ----------------------------------------------

                if (
                    id ===
                    "verification_button"
                ) {

                    const guildConfig =
                        getGuildConfig(
                            interaction.guild.id
                        );

                    if (
                        !guildConfig.verificationRoleId
                    ) {

                        return interaction.reply({
                            content:
                                "Verification has not been configured yet.",
                            ephemeral: true
                        });
                    }

                    const role =
                        interaction.guild.roles.cache.get(
                            guildConfig.verificationRoleId
                        );

                    if (!role) {

                        return interaction.reply({
                            content:
                                "The verification role no longer exists.",
                            ephemeral: true
                        });
                    }

                    await interaction.member.roles.add(
                        role
                    );

                    return interaction.reply({
                        content:
                            `You have been verified and given ${role}.`,
                        ephemeral: true
                    });
                }

                // ----------------------------------------------
                // OPEN TICKET
                // ----------------------------------------------

                if (
                    id ===
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

                    const ticketChannel =
                        await interaction.guild.channels.create({
                            name:
                                `ticket-${safeChannelName(
                                    interaction.user.username
                                )}`,
                            type:
                                ChannelType.GuildText,
                            parent:
                                guildConfig.ticketCategoryId ||
                                undefined,
                            topic:
                                `ticket-owner:${interaction.user.id}`,
                            permissionOverwrites: [
                                {
                                    id:
                                        interaction.guild.roles.everyone.id,
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

                    const buttons =
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

                    await ticketChannel.send({
                        content:
                            `${staffRole} ${interaction.user}`,
                        embeds: [
                            createEmbed(
                                "Support Ticket",
                                `Welcome ${interaction.user}!\n\nA member of staff will assist you shortly.`
                            )
                        ],
                        components: [
                            buttons
                        ]
                    });

                    return interaction.reply({
                        content:
                            `Your ticket has been created: ${ticketChannel}`,
                        ephemeral: true
                    });
                }

                // ----------------------------------------------
                // CLAIM
                // ----------------------------------------------

                if (
                    id ===
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

                // ----------------------------------------------
                // CLOSE
                // ----------------------------------------------

                if (
                    id ===
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
                                `This ticket will be deleted shortly.\n\nClosed by ${interaction.user}.`
                            )
                        ]
                    });

                    await sendTicketLog(
                        interaction.guild,
                        interaction.channel,
                        interaction.user,
                        "closed"
                    );

                    setTimeout(
                        () =>
                            interaction.channel
                                .delete()
                                .catch(
                                    () => {}
                                ),
                        3000
                    );

                    return;
                }

                // ----------------------------------------------
                // SUBMIT SERVER
                // ----------------------------------------------

                if (
                    id ===
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
                                "The submission system has not been configured.",
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

                    const fields = [
                        [
                            "server_name",
                            "Server Name",
                            TextInputStyle.Short,
                            "Example Community"
                        ],
                        [
                            "server_description",
                            "Server Description",
                            TextInputStyle.Paragraph,
                            "Tell us about your server"
                        ],
                        [
                            "server_invite",
                            "Discord Invite",
                            TextInputStyle.Short,
                            "https://discord.gg/example"
                        ],
                        [
                            "server_category",
                            "Server Category",
                            TextInputStyle.Short,
                            "Gaming, Community, Roblox..."
                        ],
                        [
                            "server_owner",
                            "Your Role",
                            TextInputStyle.Short,
                            "Owner, Founder, Administrator..."
                        ]
                    ];

                    for (
                        const [
                            customId,
                            label,
                            style,
                            placeholder
                        ] of fields
                    ) {

                        const input =
                            new TextInputBuilder()
                                .setCustomId(
                                    customId
                                )
                                .setLabel(
                                    label
                                )
                                .setStyle(
                                    style
                                )
                                .setRequired(
                                    true
                                )
                                .setMaxLength(
                                    style ===
                                        TextInputStyle.Paragraph
                                        ? 1000
                                        : 200
                                )
                                .setPlaceholder(
                                    placeholder
                                );

                        modal.addComponents(
                            new ActionRowBuilder()
                                .addComponents(
                                    input
                                )
                        );
                    }

                    return interaction.showModal(
                        modal
                    );
                }

                // ----------------------------------------------
                // ACCEPT SUBMISSION
                // ----------------------------------------------

                if (
                    id.startsWith(
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
                        id.replace(
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
                            "The verified/community channel has not been configured."
                        );
                    }

                    const invite =
                        normaliseInvite(
                            submission.invite
                        );

                    try {
                        new URL(invite);
                    } catch {

                        return interaction.editReply(
                            "The submitted invite is invalid."
                        );
                    }

                    // VERIFIED ROLE

                    if (
                        guildConfig.verifiedRoleId
                    ) {

                        const member =
                            await interaction.guild.members
                                .fetch(
                                    submission.userId
                                )
                                .catch(
                                    () => null
                                );

                        const role =
                            interaction.guild.roles.cache.get(
                                guildConfig.verifiedRoleId
                            );

                        if (
                            member &&
                            role
                        ) {

                            await member.roles.add(
                                role
                            ).catch(
                                () => {}
                            );
                        }
                    }

                    // WEBHOOK

                    const webhook =
                        await getBotWebhook(
                            listingChannel,
                            guildConfig.webhookName ||
                            "Verified Servers"
                        );

                    const listing =
                        new EmbedBuilder()
                            .setColor(
                                BRAND_COLOUR
                            )
                            .setTitle(
                                `${LOGO} Server Listing`
                            )
                            .setDescription(
                                `## ${submission.serverName}\n\n${submission.description}`
                            )
                            .addFields(
                                {
                                    name:
                                        "Category",
                                    value:
                                        submission.category ||
                                        "Not specified",
                                    inline:
                                        true
                                },
                                {
                                    name:
                                        "Server Owner",
                                    value:
                                        `<@${submission.userId}>`,
                                    inline:
                                        true
                                },
                                {
                                    name:
                                        "Status",
                                    value:
                                        "✅ Verified",
                                    inline:
                                        true
                                }
                            )
                            .setFooter({
                                text:
                                    "Manually Verified Server"
                            })
                            .setTimestamp();

                    const joinButton =
                        new ActionRowBuilder()
                            .addComponents(
                                new ButtonBuilder()
                                    .setLabel(
                                        "Join Server!"
                                    )
                                    .setStyle(
                                        ButtonStyle.Link
                                    )
                                    .setURL(
                                        invite
                                    )
                            );

                    await webhook.send({
                        username:
                            submission.serverName,
                        avatarURL:
                            client.user.displayAvatarURL(),
                        embeds: [
                            listing
                        ],
                        components: [
                            joinButton
                        ]
                    });

                    // DM

                    const applicant =
                        await client.users
                            .fetch(
                                submission.userId
                            )
                            .catch(
                                () => null
                            );

                    if (applicant) {

                        await applicant.send({
                            embeds: [
                                createEmbed(
                                    "Server Approved",
                                    `Your server **${submission.serverName}** has been approved and added to the verified server listings.`
                                )
                            ]
                        }).catch(
                            () => {}
                        );
                    }

                    // REVIEW CHANNEL RESULT

                    await interaction.channel.send({
                        embeds: [
                            createEmbed(
                                "Submission Approved",
                                `**${submission.serverName}** has been approved by ${interaction.user} and has been added to ${listingChannel}.`
                            )
                        ]
                    }).catch(
                        () => {}
                    );

                    await sendSubmissionLog(
                        interaction.guild,
                        submission,
                        interaction.user,
                        "approved"
                    );

                    submissions.delete(
                        submissionId
                    );

                    await interaction.message.edit({
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
                    }).catch(
                        () => {}
                    );

                    await interaction.editReply(
                        "The server has been approved and listed. The review channel will now be deleted."
                    );

                    setTimeout(
                        () =>
                            interaction.channel
                                .delete()
                                .catch(
                                    () => {}
                                ),
                        3000
                    );

                    return;
                }

                // ----------------------------------------------
                // DENY SUBMISSION
                // ----------------------------------------------

                if (
                    id.startsWith(
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
                        id.replace(
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
                            .setRequired(
                                true
                            )
                            .setMaxLength(
                                1000
                            );

                    modal.addComponents(
                        new ActionRowBuilder()
                            .addComponents(
                                reason
                            )
                    );

                    return interaction.showModal(
                        modal
                    );
                }

                // ----------------------------------------------
                // REPORT SERVER
                // ----------------------------------------------

                if (
                    id ===
                    "report_server"
                ) {

                    const modal =
                        new ModalBuilder()
                            .setCustomId(
                                "server_report_modal"
                            )
                            .setTitle(
                                "Report a Server"
                            );

                    const server =
                        new TextInputBuilder()
                            .setCustomId(
                                "reported_server"
                            )
                            .setLabel(
                                "Server Name / Listing"
                            )
                            .setStyle(
                                TextInputStyle.Short
                            )
                            .setRequired(
                                true
                            )
                            .setMaxLength(
                                100
                            );

                    const reason =
                        new TextInputBuilder()
                            .setCustomId(
                                "report_reason"
                            )
                            .setLabel(
                                "Reason for Report"
                            )
                            .setStyle(
                                TextInputStyle.Paragraph
                            )
                            .setRequired(
                                true
                            )
                            .setMaxLength(
                                1000
                            );

                    const evidence =
                        new TextInputBuilder()
                            .setCustomId(
                                "report_evidence"
                            )
                            .setLabel(
                                "Evidence / Details"
                            )
                            .setStyle(
                                TextInputStyle.Paragraph
                            )
                            .setRequired(
                                false
                            )
                            .setMaxLength(
                                1000
                            );

                    modal.addComponents(
                        new ActionRowBuilder()
                            .addComponents(
                                server
                            ),
                        new ActionRowBuilder()
                            .addComponents(
                                reason
                            ),
                        new ActionRowBuilder()
                            .addComponents(
                                evidence
                            )
                    );

                    return interaction.showModal(
                        modal
                    );
                }

                // ----------------------------------------------
                // CLAIM REPORT
                // ----------------------------------------------

                if (
                    id ===
                    "claim_report"
                ) {

                    if (
                        !isStaff(
                            interaction.member
                        )
                    ) {

                        return interaction.reply({
                            content:
                                "Only staff can claim reports.",
                            ephemeral: true
                        });
                    }

                    return interaction.reply({
                        embeds: [
                            createEmbed(
                                "Report Claimed",
                                `This report has been claimed by ${interaction.user}.`
                            )
                        ]
                    });
                }

                // ----------------------------------------------
                // CLOSE REPORT
                // ----------------------------------------------

                if (
                    id ===
                    "close_report"
                ) {

                    if (
                        !isStaff(
                            interaction.member
                        )
                    ) {

                        return interaction.reply({
                            content:
                                "Only staff can close reports.",
                            ephemeral: true
                        });
                    }

                    await interaction.reply({
                        embeds: [
                            createEmbed(
                                "Report Closed",
                                `This report has been closed by ${interaction.user}.`
                            )
                        ]
                    });

                    const guildConfig =
                        getGuildConfig(
                            interaction.guild.id
                        );

                    if (
                        guildConfig.reportLogChannelId
                    ) {

                        const log =
                            interaction.guild.channels.cache.get(
                                guildConfig.reportLogChannelId
                            );

                        if (log) {

                            await log.send({
                                embeds: [
                                    createEmbed(
                                        "Server Report Closed",
                                        `**Channel:** ${interaction.channel.name}\n` +
                                        `**Closed by:** ${interaction.user}`
                                    )
                                ]
                            }).catch(
                                () => {}
                            );
                        }
                    }

                    setTimeout(
                        () =>
                            interaction.channel
                                .delete()
                                .catch(
                                    () => {}
                                ),
                        3000
                    );

                    return;
                }

                // ----------------------------------------------
                // TICKET CONFIG
                // ----------------------------------------------

                if (
                    id ===
                    "ticket_set_staff"
                ) {

                    if (
                        !canManage(
                            interaction.member
                        )
                    ) {
                        return;
                    }

                    return roleSelector(
                        interaction,
                        "ticket_staff_select",
                        "Select the ticket staff role."
                    );
                }

                if (
                    id ===
                    "ticket_set_category"
                ) {

                    return categorySelector(
                        interaction,
                        "ticket_category_select",
                        "Select the ticket category."
                    );
                }

                if (
                    id ===
                    "ticket_set_logs"
                ) {

                    return channelSelector(
                        interaction,
                        "ticket_logs_select",
                        "Select the ticket log channel."
                    );
                }

                if (
                    id ===
                    "ticket_send_panel"
                ) {

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
                        embeds: [
                            createEmbed(
                                "Support Tickets",
                                "Need help? Click **Open Ticket** below and a private support ticket will be created for you."
                            )
                        ],
                        components: [
                            row
                        ]
                    });

                    return interaction.reply({
                        content:
                            "Ticket panel sent.",
                        ephemeral: true
                    });
                }

                if (
                    id ===
                    "ticket_refresh"
                ) {

                    await interaction.deferUpdate();

                    return sendTicketConfigPanel(
                        interaction,
                        true
                    );
                }

                // ----------------------------------------------
                // SUBMIT CONFIG
                // ----------------------------------------------

                if (
                    id ===
                    "submit_set_staff"
                ) {

                    return roleSelector(
                        interaction,
                        "submit_staff_select",
                        "Select the submission staff role."
                    );
                }

                if (
                    id ===
                    "submit_set_review"
                ) {

                    return categorySelector(
                        interaction,
                        "submit_review_select",
                        "Select the submission review category."
                    );
                }

                if (
                    id ===
                    "submit_set_verified"
                ) {

                    return channelSelector(
                        interaction,
                        "submit_verified_select",
                        "Select the verified server/community channel."
                    );
                }

                if (
                    id ===
                    "submit_set_verified_role"
                ) {

                    return roleSelector(
                        interaction,
                        "submit_verified_role_select",
                        "Select the verified role."
                    );
                }

                if (
                    id ===
                    "submit_send_panel"
                ) {

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
                        embeds: [
                            createEmbed(
                                "Submit Your Server",
                                "Want your server listed in our verified communities?\n\nClick **Submit Server** below. Your submission will be manually reviewed by our staff team."
                            )
                        ],
                        components: [
                            row
                        ]
                    });

                    return interaction.reply({
                        content:
                            "Submission panel sent.",
                        ephemeral: true
                    });
                }

                if (
                    id ===
                    "submit_refresh"
                ) {

                    await interaction.deferUpdate();

                    return sendSubmitConfigPanel(
                        interaction,
                        true
                    );
                }

                // ----------------------------------------------
                // REPORT CONFIG
                // ----------------------------------------------

                if (
                    id ===
                    "report_set_staff"
                ) {

                    return roleSelector(
                        interaction,
                        "report_staff_select",
                        "Select the report staff role."
                    );
                }

                if (
                    id ===
                    "report_set_logs"
                ) {

                    return channelSelector(
                        interaction,
                        "report_logs_select",
                        "Select the report logs channel."
                    );
                }

                if (
                    id ===
                    "report_send_panel"
                ) {

                    const row =
                        new ActionRowBuilder()
                            .addComponents(
                                new ButtonBuilder()
                                    .setCustomId(
                                        "report_server"
                                    )
                                    .setLabel(
                                        "Report a Server"
                                    )
                                    .setStyle(
                                        ButtonStyle.Danger
                                    )
                            );

                    await interaction.channel.send({
                        embeds: [
                            createEmbed(
                                "Report a Server",
                                "Found a server that breaks our rules or should not be listed?\n\nClick the button below to submit a report. Your report will be reviewed privately by our staff team."
                            )
                        ],
                        components: [
                            row
                        ]
                    });

                    return interaction.reply({
                        content:
                            "Report panel sent.",
                        ephemeral: true
                    });
                }

                if (
                    id ===
                    "report_refresh"
                ) {

                    await interaction.deferUpdate();

                    return sendReportConfigPanel(
                        interaction,
                        true
                    );
                }

                // ----------------------------------------------
                // EMBED BUILDER BUTTONS
                // ----------------------------------------------

                if (
                    id ===
                    "embed_title"
                ) {

                    return showEmbedModal(
                        interaction,
                        "title"
                    );
                }

                if (
                    id ===
                    "embed_description"
                ) {

                    return showEmbedModal(
                        interaction,
                        "description"
                    );
                }

                if (
                    id ===
                    "embed_channel"
                ) {

                    return channelSelector(
                        interaction,
                        "embed_channel_select",
                        "Select where the webhook embed should be sent."
                    );
                }

                if (
                    id ===
                    "embed_webhook_name"
                ) {

                    return showEmbedModal(
                        interaction,
                        "webhook_name"
                    );
                }

                if (
                    id ===
                    "embed_button"
                ) {

                    return showEmbedModal(
                        interaction,
                        "button"
                    );
                }

                if (
                    id ===
                    "embed_send"
                ) {

                    const data =
                        embedBuilders.get(
                            interaction.user.id
                        );

                    if (!data) {

                        return interaction.reply({
                            content:
                                "Your embed builder session has expired.",
                            ephemeral: true
                        });
                    }

                    if (
                        !data.title ||
                        !data.description ||
                        !data.channelId
                    ) {

                        return interaction.reply({
                            content:
                                "Please configure the title, description and channel before sending.",
                            ephemeral: true
                        });
                    }

                    const channel =
                        interaction.guild.channels.cache.get(
                            data.channelId
                        );

                    if (!channel) {

                        return interaction.reply({
                            content:
                                "The selected channel no longer exists.",
                            ephemeral: true
                        });
                    }

                    const webhook =
                        await getBotWebhook(
                            channel,
                            data.webhookName ||
                            "Server Listings"
                        );

                    const embed =
                        new EmbedBuilder()
                            .setColor(
                                BRAND_COLOUR
                            )
                            .setTitle(
                                `${LOGO} ${data.title}`
                            )
                            .setDescription(
                                data.description
                            )
                            .setTimestamp();

                    const payload = {
                        username:
                            data.webhookName ||
                            "Server Listings",
                        avatarURL:
                            client.user.displayAvatarURL(),
                        embeds: [
                            embed
                        ]
                    };

                    if (
                        data.buttonLabel &&
                        data.buttonURL
                    ) {

                        payload.components = [
                            new ActionRowBuilder()
                                .addComponents(
                                    new ButtonBuilder()
                                        .setLabel(
                                            data.buttonLabel
                                        )
                                        .setStyle(
                                            ButtonStyle.Link
                                        )
                                        .setURL(
                                            data.buttonURL
                                        )
                                )
                        ];
                    }

                    await webhook.send(
                        payload
                    );

                    embedBuilders.delete(
                        interaction.user.id
                    );

                    return interaction.update({
                        content:
                            `Webhook embed sent to ${channel}.`,
                        embeds: [],
                        components: []
                    });
                }

                if (
                    id ===
                    "embed_cancel"
                ) {

                    embedBuilders.delete(
                        interaction.user.id
                    );

                    return interaction.update({
                        content:
                            "Embed builder cancelled.",
                        embeds: [],
                        components: []
                    });
                }
            }

            // ====================================================
            // SELECT MENUS
            // ====================================================

            if (
                interaction.isStringSelectMenu()
            ) {

                const id =
                    interaction.customId;

                if (
                    id ===
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

                if (
                    id ===
                    "ticket_category_select"
                ) {

                    const channelId =
                        interaction.values[0];

                    getGuildConfig(
                        interaction.guild.id
                    ).ticketCategoryId =
                        channelId;

                    saveJSON(
                        configFile,
                        config
                    );

                    return interaction.update({
                        content:
                            `Ticket category set to <#${channelId}>.`,
                        components: []
                    });
                }

                if (
                    id ===
                    "ticket_logs_select"
                ) {

                    const channelId =
                        interaction.values[0];

                    getGuildConfig(
                        interaction.guild.id
                    ).ticketLogChannelId =
                        channelId;

                    saveJSON(
                        configFile,
                        config
                    );

                    return interaction.update({
                        content:
                            `Ticket logs set to <#${channelId}>.`,
                        components: []
                    });
                }

                if (
                    id ===
                    "submit_staff_select"
                ) {

                    const roleId =
                        interaction.values[0];

                    getGuildConfig(
                        interaction.guild.id
                    ).submitStaffRoleId =
                        roleId;

                    getGuildConfig(
                        interaction.guild.id
                    ).staffRoleId =
                        roleId;

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

                if (
                    id ===
                    "submit_review_select"
                ) {

                    const channelId =
                        interaction.values[0];

                    getGuildConfig(
                        interaction.guild.id
                    ).submitReviewCategoryId =
                        channelId;

                    saveJSON(
                        configFile,
                        config
                    );

                    return interaction.update({
                        content:
                            `Submission review category set to <#${channelId}>.`,
                        components: []
                    });
                }

                if (
                    id ===
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
                            `Verified/community channel set to <#${channelId}>.`,
                        components: []
                    });
                }

                if (
                    id ===
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

                if (
                    id ===
                    "report_staff_select"
                ) {

                    const roleId =
                        interaction.values[0];

                    getGuildConfig(
                        interaction.guild.id
                    ).reportStaffRoleId =
                        roleId;

                    saveJSON(
                        configFile,
                        config
                    );

                    return interaction.update({
                        content:
                            `Report staff role set to <@&${roleId}>.`,
                        components: []
                    });
                }

                if (
                    id ===
                    "report_logs_select"
                ) {

                    const channelId =
                        interaction.values[0];

                    getGuildConfig(
                        interaction.guild.id
                    ).reportLogChannelId =
                        channelId;

                    saveJSON(
                        configFile,
                        config
                    );

                    return interaction.update({
                        content:
                            `Report logs set to <#${channelId}>.`,
                        components: []
                    });
                }

                if (
                    id ===
                    "embed_channel_select"
                ) {

                    const channelId =
                        interaction.values[0];

                    const data =
                        embedBuilders.get(
                            interaction.user.id
                        ) || {};

                    data.channelId =
                        channelId;

                    embedBuilders.set(
                        interaction.user.id,
                        data
                    );

                    return interaction.update({
                        content:
                            `Embed channel set to <#${channelId}>.`,
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

                const id =
                    interaction.customId;

                // ----------------------------------------------
                // SERVER SUBMISSION
                // ----------------------------------------------

                if (
                    id ===
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
                            owner,
                            createdAt:
                                Date.now()
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

                    if (!staffRole) {

                        return interaction.reply({
                            content:
                                "The submission staff role is not configured correctly.",
                            ephemeral: true
                        });
                    }

                    const reviewChannel =
                        await interaction.guild.channels.create({
                            name:
                                `review-${safeChannelName(
                                    serverName
                                )}`,
                            type:
                                ChannelType.GuildText,
                            parent:
                                guildConfig.submitReviewCategoryId ||
                                undefined,
                            permissionOverwrites: [
                                {
                                    id:
                                        interaction.guild.roles.everyone.id,
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

                    const reviewEmbed =
                        createEmbed(
                            "New Server Submission",
                            `A new server has been submitted for manual verification.\n\n**Submitted by:** <@${interaction.user.id}>`
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
                                "Your server has been submitted successfully.\n\nOur staff team will manually review it. You will receive a DM once a decision has been made."
                            )
                        ],
                        ephemeral: true
                    });
                }

                // ----------------------------------------------
                // DENIAL
                // ----------------------------------------------

                if (
                    id.startsWith(
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
                                "Only staff can deny submissions.",
                            ephemeral: true
                        });
                    }

                    const submissionId =
                        id.replace(
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
                            .catch(
                                () => null
                            );

                    if (applicant) {

                        await applicant.send({
                            embeds: [
                                createEmbed(
                                    "Server Submission Denied",
                                    `Your server **${submission.serverName}** was not approved for our verified server listings.\n\n**Reason:** ${reason}`
                                )
                            ]
                        }).catch(
                            () => {}
                        );
                    }

                    await interaction.channel.send({
                        embeds: [
                            createEmbed(
                                "Submission Denied",
                                `**${submission.serverName}** has been denied by ${interaction.user}.\n\n**Reason:** ${reason}`
                            )
                        ]
                    }).catch(
                        () => {}
                    );

                    await sendSubmissionLog(
                        interaction.guild,
                        submission,
                        interaction.user,
                        "denied",
                        reason
                    );

                    submissions.delete(
                        submissionId
                    );

                    await interaction.reply({
                        content:
                            "The submission has been denied. The submitter has been notified and the review channel will now be deleted.",
                        ephemeral: true
                    });

                    setTimeout(
                        () =>
                            interaction.channel
                                .delete()
                                .catch(
                                    () => {}
                                ),
                        3000
                    );

                    return;
                }

                // ----------------------------------------------
                // SERVER REPORT
                // ----------------------------------------------

                if (
                    id ===
                    "server_report_modal"
                ) {

                    const reportedServer =
                        interaction.fields.getTextInputValue(
                            "reported_server"
                        );

                    const reason =
                        interaction.fields.getTextInputValue(
                            "report_reason"
                        );

                    const evidence =
                        interaction.fields.getTextInputValue(
                            "report_evidence"
                        ) ||
                        "No additional evidence provided.";

                    const guildConfig =
                        getGuildConfig(
                            interaction.guild.id
                        );

                    const staffRole =
                        interaction.guild.roles.cache.get(
                            guildConfig.reportStaffRoleId
                        );

                    if (!staffRole) {

                        return interaction.reply({
                            content:
                                "The report system has not been configured correctly.",
                            ephemeral: true
                        });
                    }

                    const reportChannel =
                        await interaction.guild.channels.create({
                            name:
                                `server-reports-${safeChannelName(
                                    interaction.user.username
                                )}`,
                            type:
                                ChannelType.GuildText,
                            permissionOverwrites: [
                                {
                                    id:
                                        interaction.guild.roles.everyone.id,
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

                    const buttons =
                        new ActionRowBuilder()
                            .addComponents(
                                new ButtonBuilder()
                                    .setCustomId(
                                        "claim_report"
                                    )
                                    .setLabel(
                                        "Claim"
                                    )
                                    .setStyle(
                                        ButtonStyle.Primary
                                    ),
                                new ButtonBuilder()
                                    .setCustomId(
                                        "close_report"
                                    )
                                    .setLabel(
                                        "Close"
                                    )
                                    .setStyle(
                                        ButtonStyle.Danger
                                    )
                            );

                    await reportChannel.send({
                        content:
                            `${staffRole} — new server report.`,
                        embeds: [
                            createEmbed(
                                "Server Report",
                                `**Reported by:** ${interaction.user}`
                            ).addFields(
                                {
                                    name:
                                        "Reported Server",
                                    value:
                                        reportedServer
                                },
                                {
                                    name:
                                        "Reason",
                                    value:
                                        reason
                                },
                                {
                                    name:
                                        "Evidence / Details",
                                    value:
                                        evidence
                                }
                            )
                        ],
                        components: [
                            buttons
                        ]
                    });

                    const log =
                        guildConfig.reportLogChannelId
                            ? interaction.guild.channels.cache.get(
                                guildConfig.reportLogChannelId
                            )
                            : null;

                    if (log) {

                        await log.send({
                            embeds: [
                                createEmbed(
                                    "New Server Report",
                                    `A new report was opened by ${interaction.user}.\n\n**Channel:** ${reportChannel}`
                                )
                            ]
                        }).catch(
                            () => {}
                        );
                    }

                    return interaction.reply({
                        content:
                            `Your report has been submitted privately: ${reportChannel}`,
                        ephemeral: true
                    });
                }

                // ----------------------------------------------
                // EMBED BUILDER MODALS
                // ----------------------------------------------

                if (
                    id.startsWith(
                        "embed_modal_"
                    )
                ) {

                    const type =
                        id.replace(
                            "embed_modal_",
                            ""
                        );

                    const data =
                        embedBuilders.get(
                            interaction.user.id
                        ) || {};

                    if (
                        type ===
                        "title"
                    ) {

                        data.title =
                            interaction.fields.getTextInputValue(
                                "embed_value"
                            );
                    }

                    if (
                        type ===
                        "description"
                    ) {

                        data.description =
                            interaction.fields.getTextInputValue(
                                "embed_value"
                            );
                    }

                    if (
                        type ===
                        "webhook_name"
                    ) {

                        data.webhookName =
                            interaction.fields.getTextInputValue(
                                "embed_value"
                            );
                    }

                    if (
                        type ===
                        "button"
                    ) {

                        data.buttonLabel =
                            interaction.fields.getTextInputValue(
                                "button_label"
                            );

                        data.buttonURL =
                            interaction.fields.getTextInputValue(
                                "button_url"
                            );
                    }

                    embedBuilders.set(
                        interaction.user.id,
                        data
                    );

                    return sendEmbedBuilder(
                        interaction,
                        true
                    );
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
// SELECTOR HELPERS
// ============================================================

async function roleSelector(
    interaction,
    customId,
    message
) {

    const roles =
        interaction.guild.roles.cache
            .filter(
                role =>
                    role.id !==
                    interaction.guild.id
            )
            .first(25);

    if (!roles.length) {

        return interaction.reply({
            content:
                "There are no roles available.",
            ephemeral: true
        });
    }

    const menu =
        new StringSelectMenuBuilder()
            .setCustomId(
                customId
            )
            .setPlaceholder(
                message
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
            message,
        components: [
            new ActionRowBuilder()
                .addComponents(
                    menu
                )
        ],
        ephemeral: true
    });
}

async function channelSelector(
    interaction,
    customId,
    message
) {

    const channels =
        interaction.guild.channels.cache
            .filter(
                channel =>
                    channel.type ===
                        ChannelType.GuildText ||
                    channel.type ===
                        ChannelType.GuildCategory
            )
            .first(25);

    if (!channels.length) {

        return interaction.reply({
            content:
                "There are no suitable channels available.",
            ephemeral: true
        });
    }

    const menu =
        new StringSelectMenuBuilder()
            .setCustomId(
                customId
            )
            .setPlaceholder(
                message
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
            message,
        components: [
            new ActionRowBuilder()
                .addComponents(
                    menu
                )
        ],
        ephemeral: true
    });
}

async function categorySelector(
    interaction,
    customId,
    message
) {

    const categories =
        interaction.guild.channels.cache
            .filter(
                channel =>
                    channel.type ===
                    ChannelType.GuildCategory
            )
            .first(25);

    if (!categories.length) {

        return interaction.reply({
            content:
                "There are no categories available.",
            ephemeral: true
        });
    }

    const menu =
        new StringSelectMenuBuilder()
            .setCustomId(
                customId
            )
            .setPlaceholder(
                message
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
            message,
        components: [
            new ActionRowBuilder()
                .addComponents(
                    menu
                )
        ],
        ephemeral: true
    });
}

// ============================================================
// EMBED BUILDER
// ============================================================

async function sendEmbedBuilder(
    interaction,
    update = false
) {

    const data =
        embedBuilders.get(
            interaction.user.id
        ) || {};

    embedBuilders.set(
        interaction.user.id,
        data
    );

    const embed =
        createEmbed(
            "Webhook Embed Builder",
            "Build your webhook message using the buttons below."
        )
        .addFields(
            {
                name:
                    "Title",
                value:
                    data.title ||
                    "Not set",
                inline:
                    true
            },
            {
                name:
                    "Description",
                value:
                    data.description ||
                    "Not set",
                inline:
                    true
            },
            {
                name:
                    "Channel",
                value:
                    data.channelId
                        ? `<#${data.channelId}>`
                        : "Not set",
                inline:
                    true
            },
            {
                name:
                    "Webhook Name",
                value:
                    data.webhookName ||
                    "Server Listings",
                inline:
                    true
            },
            {
                name:
                    "Button",
                value:
                    data.buttonLabel &&
                    data.buttonURL
                        ? `${data.buttonLabel}\n${data.buttonURL}`
                        : "No button",
                inline:
                    true
            }
        );

    const row1 =
        new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(
                        "embed_title"
                    )
                    .setLabel(
                        "Title"
                    )
                    .setStyle(
                        ButtonStyle.Primary
                    ),
                new ButtonBuilder()
                    .setCustomId(
                        "embed_description"
                    )
                    .setLabel(
                        "Description"
                    )
                    .setStyle(
                        ButtonStyle.Primary
                    ),
                new ButtonBuilder()
                    .setCustomId(
                        "embed_channel"
                    )
                    .setLabel(
                        "Channel"
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
                        "embed_webhook_name"
                    )
                    .setLabel(
                        "Webhook Name"
                    )
                    .setStyle(
                        ButtonStyle.Secondary
                    ),
                new ButtonBuilder()
                    .setCustomId(
                        "embed_button"
                    )
                    .setLabel(
                        "Button"
                    )
                    .setStyle(
                        ButtonStyle.Secondary
                    ),
                new ButtonBuilder()
                    .setCustomId(
                        "embed_send"
                    )
                    .setLabel(
                        "Send"
                    )
                    .setStyle(
                        ButtonStyle.Success
                    ),
                new ButtonBuilder()
                    .setCustomId(
                        "embed_cancel"
                    )
                    .setLabel(
                        "Cancel"
                    )
                    .setStyle(
                        ButtonStyle.Danger
                    )
            );

    if (update) {

        return interaction.update({
            embeds: [
                embed
            ],
            components: [
                row1,
                row2
            ]
        });
    }

    return interaction.reply({
        embeds: [
            embed
        ],
        components: [
            row1,
            row2
        ],
        ephemeral: true
    });
}

async function showEmbedModal(
    interaction,
    type
) {

    if (
        type === "button"
    ) {

        const modal =
            new ModalBuilder()
                .setCustomId(
                    "embed_modal_button"
                )
                .setTitle(
                    "Webhook Button"
                );

        const label =
            new TextInputBuilder()
                .setCustomId(
                    "button_label"
                )
                .setLabel(
                    "Button Name"
                )
                .setStyle(
                    TextInputStyle.Short
                )
                .setRequired(
                    true
                )
                .setMaxLength(
                    80
                )
                .setPlaceholder(
                    "Join Server!"
                );

        const url =
            new TextInputBuilder()
                .setCustomId(
                    "button_url"
                )
                .setLabel(
                    "Button URL"
                )
                .setStyle(
                    TextInputStyle.Short
                )
                .setRequired(
                    true
                )
                .setPlaceholder(
                    "https://discord.gg/example"
                );

        modal.addComponents(
            new ActionRowBuilder()
                .addComponents(
                    label
                ),
            new ActionRowBuilder()
                .addComponents(
                    url
                )
        );

        return interaction.showModal(
            modal
        );
    }

    const labels = {
        title:
            "Embed Title",
        description:
            "Embed Description",
        webhook_name:
            "Webhook Name"
    };

    const placeholders = {
        title:
            "Server Listing",
        description:
            "Your embed description...",
        webhook_name:
            "Server Listings"
    };

    const modal =
        new ModalBuilder()
            .setCustomId(
                `embed_modal_${type}`
            )
            .setTitle(
                labels[type]
            );

    const input =
        new TextInputBuilder()
            .setCustomId(
                "embed_value"
            )
            .setLabel(
                labels[type]
            )
            .setStyle(
                type === "description"
                    ? TextInputStyle.Paragraph
                    : TextInputStyle.Short
            )
            .setRequired(
                true
            )
            .setMaxLength(
                type === "description"
                    ? 4000
                    : 100
            )
            .setPlaceholder(
                placeholders[type]
            );

    modal.addComponents(
        new ActionRowBuilder()
            .addComponents(
                input
            )
    );

    return interaction.showModal(
        modal
    );
}

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

    const staff =
        guildConfig.ticketStaffRoleId
            ? `<@&${guildConfig.ticketStaffRoleId}>`
            : "Not configured";

    const category =
        guildConfig.ticketCategoryId
            ? `<#${guildConfig.ticketCategoryId}>`
            : "Not configured";

    const logs =
        guildConfig.ticketLogChannelId
            ? `<#${guildConfig.ticketLogChannelId}>`
            : "Not configured";

    const embed =
        createEmbed(
            "Ticket Configuration",
            "Configure your ticket system below."
        )
        .addFields(
            {
                name:
                    "Staff Role",
                value:
                    staff,
                inline:
                    true
            },
            {
                name:
                    "Ticket Category",
                value:
                    category,
                inline:
                    true
            },
            {
                name:
                    "Ticket Logs",
                value:
                    logs,
                inline:
                    true
            }
        );

    const row1 =
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
                        "Category"
                    )
                    .setStyle(
                        ButtonStyle.Secondary
                    ),
                new ButtonBuilder()
                    .setCustomId(
                        "ticket_set_logs"
                    )
                    .setLabel(
                        "Ticket Logs"
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
            embeds: [
                embed
            ],
            components: [
                row1,
                row2
            ]
        });
    }

    return interaction.reply({
        embeds: [
            embed
        ],
        components: [
            row1,
            row2
        ],
        ephemeral: true
    });
}

// ============================================================
// SUBMISSION CONFIG PANEL
// ============================================================

async function sendSubmitConfigPanel(
    interaction,
    edit = false
) {

    const guildConfig =
        getGuildConfig(
            interaction.guild.id
        );

    const embed =
        createEmbed(
            "Server Submission Configuration",
            "Configure your server listing system."
        )
        .addFields(
            {
                name:
                    "Submission Staff",
                value:
                    guildConfig.submitStaffRoleId
                        ? `<@&${guildConfig.submitStaffRoleId}>`
                        : "Not configured",
                inline:
                    true
            },
            {
                name:
                    "Review Category",
                value:
                    guildConfig.submitReviewCategoryId
                        ? `<#${guildConfig.submitReviewCategoryId}>`
                        : "Not configured",
                inline:
                    true
            },
            {
                name:
                    "Verified Community Channel",
                value:
                    guildConfig.verifiedChannelId
                        ? `<#${guildConfig.verifiedChannelId}>`
                        : "Not configured",
                inline:
                    true
            },
            {
                name:
                    "Verified Role",
                value:
                    guildConfig.verifiedRoleId
                        ? `<@&${guildConfig.verifiedRoleId}>`
                        : "Not configured",
                inline:
                    true
            },
            {
                name:
                    "Process",
                value:
                    "User submits server → private review channel is created → staff Accept/Deny → accepted server is posted through a webhook → review channel closes automatically.",
                inline:
                    false
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
                        "Community Channel"
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
            embeds: [
                embed
            ],
            components: [
                row1,
                row2
            ]
        });
    }

    return interaction.reply({
        embeds: [
            embed
        ],
        components: [
            row1,
            row2
        ],
        ephemeral: true
    });
}

// ============================================================
// REPORT CONFIG PANEL
// ============================================================

async function sendReportConfigPanel(
    interaction,
    edit = false
) {

    const guildConfig =
        getGuildConfig(
            interaction.guild.id
        );

    const embed =
        createEmbed(
            "Server Report Configuration",
            "Configure the system used by members to report listed servers."
        )
        .addFields(
            {
                name:
                    "Report Staff",
                value:
                    guildConfig.reportStaffRoleId
                        ? `<@&${guildConfig.reportStaffRoleId}>`
                        : "Not configured",
                inline:
                    true
            },
            {
                name:
                    "Report Logs",
                value:
                    guildConfig.reportLogChannelId
                        ? `<#${guildConfig.reportLogChannelId}>`
                        : "Not configured",
                inline:
                    true
            },
            {
                name:
                    "Report Channels",
                value:
                    "`server-reports-{user}`",
                inline:
                    true
            }
        );

    const row1 =
        new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(
                        "report_set_staff"
                    )
                    .setLabel(
                        "Staff Role"
                    )
                    .setStyle(
                        ButtonStyle.Primary
                    ),
                new ButtonBuilder()
                    .setCustomId(
                        "report_set_logs"
                    )
                    .setLabel(
                        "Report Logs"
                    )
                    .setStyle(
                        ButtonStyle.Secondary
                    ),
                new ButtonBuilder()
                    .setCustomId(
                        "report_send_panel"
                    )
                    .setLabel(
                        "Send Panel"
                    )
                    .setStyle(
                        ButtonStyle.Success
                    ),
                new ButtonBuilder()
                    .setCustomId(
                        "report_refresh"
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
            embeds: [
                embed
            ],
            components: [
                row1
            ]
        });
    }

    return interaction.reply({
        embeds: [
            embed
        ],
        components: [
            row1
        ],
        ephemeral: true
    });
}

// ============================================================
// TICKET LOG
// ============================================================

async function sendTicketLog(
    guild,
    channel,
    user,
    action
) {

    const guildConfig =
        getGuildConfig(
            guild.id
        );

    if (
        !guildConfig.ticketLogChannelId
    ) {
        return;
    }

    const log =
        guild.channels.cache.get(
            guildConfig.ticketLogChannelId
        );

    if (!log) {
        return;
    }

    await log.send({
        embeds: [
            createEmbed(
                "Ticket Log",
                `**Action:** ${action}\n` +
                `**Channel:** ${channel.name}\n` +
                `**Staff:** ${user}`
            )
        ]
    }).catch(
        () => {}
    );
}

// ============================================================
// SUBMISSION LOG
// ============================================================

async function sendSubmissionLog(
    guild,
    submission,
    moderator,
    action,
    reason = null
) {

    const guildConfig =
        getGuildConfig(
            guild.id
        );

    const channel =
        guildConfig.reportLogChannelId
            ? guild.channels.cache.get(
                guildConfig.reportLogChannelId
            )
            : null;

    if (!channel) {
        return;
    }

    await channel.send({
        embeds: [
            createEmbed(
                `Submission ${action}`,
                `**Server:** ${submission.serverName}\n` +
                `**Submitted by:** <@${submission.userId}>\n` +
                `**Actioned by:** ${moderator}` +
                (
                    reason
                        ? `\n**Reason:** ${reason}`
                        : ""
                )
            )
        ]
    }).catch(
        () => {}
    );
}

// ============================================================
// WELCOME SYSTEM
// ============================================================

client.on(
    "guildMemberAdd",
    async member => {

        try {

            const guildConfig =
                getGuildConfig(
                    member.guild.id
                );

            if (
                !guildConfig.welcomeChannelId
            ) {
                return;
            }

            const channel =
                member.guild.channels.cache.get(
                    guildConfig.welcomeChannelId
                );

            if (!channel) {
                return;
            }

            // IMPORTANT:
            // No thumbnail or member profile picture.

            await channel.send({
                embeds: [
                    createEmbed(
                        "Welcome!",
                        `Welcome ${member} to **${member.guild.name}**!\n\nWe're glad to have you here.`
                    )
                ]
            });

        } catch (error) {

            console.error(
                "Welcome error:",
                error
            );
        }
    }
);

// ============================================================
// CLEAN TEMPORARY SUBMISSIONS
// ============================================================

setInterval(
    () => {

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

                submissions.delete(
                    id
                );
            }
        }

    },
    30 * 60 * 1000
);

// ============================================================
// LOGIN
// ============================================================

client.login(
    TOKEN
);
