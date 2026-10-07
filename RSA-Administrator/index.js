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

function loadJSON(file, fallback) {
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
            `Failed loading ${file}:`,
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
            `Failed saving ${file}:`,
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
// HELPERS
// ============================================================

function getGuildConfig(guildId) {
    if (!config[guildId]) {
        config[guildId] = {};
    }

    return config[guildId];
}

function saveConfig() {
    saveJSON(
        configFile,
        config
    );
}

function createEmbed(
    title,
    description
) {
    return new EmbedBuilder()
        .setColor(BRAND_COLOUR)
        .setTitle(
            `${LOGO} ${title}`
        )
        .setDescription(
            description || null
        )
        .setTimestamp();
}

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

    if (
        guildConfig.staffRoleId &&
        member.roles.cache.has(
            guildConfig.staffRoleId
        )
    ) {
        return true;
    }

    if (
        guildConfig.submitStaffRoleId &&
        member.roles.cache.has(
            guildConfig.submitStaffRoleId
        )
    ) {
        return true;
    }

    if (
        guildConfig.ticketStaffRoleId &&
        member.roles.cache.has(
            guildConfig.ticketStaffRoleId
        )
    ) {
        return true;
    }

    return false;
}

function safeChannelName(name) {
    return String(name)
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
        ) || "server";
}

function makeId() {
    return `${Date.now()}-${Math.random()
        .toString(36)
        .substring(2, 8)}`;
}

// ============================================================
// SLASH COMMANDS
// ============================================================

const commands = [

    // --------------------------------------------------------
    // GENERAL
    // --------------------------------------------------------

    new SlashCommandBuilder()
        .setName("help")
        .setDescription(
            "Shows all available commands"
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

    // --------------------------------------------------------
    // MODERATION
    // --------------------------------------------------------

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
                    "Member to timeout"
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
                    "Reason"
                )
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName("warnings")
        .setDescription(
            "Shows a member's warnings"
        )
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription(
                    "Member"
                )
                .setRequired(false)
        ),

    new SlashCommandBuilder()
        .setName("clearwarnings")
        .setDescription(
            "Clears a member's warnings"
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

    // --------------------------------------------------------
    // MANAGEMENT
    // --------------------------------------------------------

    new SlashCommandBuilder()
        .setName("lock")
        .setDescription(
            "Locks the current channel"
        )
        .setDefaultMemberPermissions(
            PermissionFlagsBits.ManageChannels
        ),

    new SlashCommandBuilder()
        .setName("unlock")
        .setDescription(
            "Unlocks the current channel"
        )
        .setDefaultMemberPermissions(
            PermissionFlagsBits.ManageChannels
        ),

    new SlashCommandBuilder()
        .setName("slowmode")
        .setDescription(
            "Changes channel slowmode"
        )
        .setDefaultMemberPermissions(
            PermissionFlagsBits.ManageChannels
        )
        .addIntegerOption(option =>
            option
                .setName("seconds")
                .setDescription(
                    "Slowmode seconds"
                )
                .setRequired(true)
                .setMinValue(0)
                .setMaxValue(21600)
        ),

    new SlashCommandBuilder()
        .setName("role")
        .setDescription(
            "Manage member roles"
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

    // --------------------------------------------------------
    // WEBHOOK EMBEDS
    // --------------------------------------------------------

    new SlashCommandBuilder()
        .setName("embed")
        .setDescription(
            "Open the webhook embed builder"
        )
        .setDefaultMemberPermissions(
            PermissionFlagsBits.ManageMessages
        ),

    // --------------------------------------------------------
    // TICKETS
    // --------------------------------------------------------

    new SlashCommandBuilder()
        .setName("ticketconfig")
        .setDescription(
            "Configure the ticket system"
        )
        .setDefaultMemberPermissions(
            PermissionFlagsBits.ManageGuild
        ),

    // --------------------------------------------------------
    // SERVER SUBMISSIONS
    // --------------------------------------------------------

    new SlashCommandBuilder()
        .setName("submitconfig")
        .setDescription(
            "Configure server submissions"
        )
        .setDefaultMemberPermissions(
            PermissionFlagsBits.ManageGuild
        ),

    // --------------------------------------------------------
    // REPORTS
    // --------------------------------------------------------

    new SlashCommandBuilder()
        .setName("reportsetup")
        .setDescription(
            "Configure the server reporting system"
        )
        .setDefaultMemberPermissions(
            PermissionFlagsBits.ManageGuild
        ),

    // --------------------------------------------------------
    // VERIFICATION
    // --------------------------------------------------------

    new SlashCommandBuilder()
        .setName("verification")
        .setDescription(
            "Send the server verification panel"
        )
        .setDefaultMemberPermissions(
            PermissionFlagsBits.ManageGuild
        )

].map(command =>
    command.toJSON()
);

// ============================================================
// REGISTER COMMANDS
// ============================================================

async function registerCommands() {

    try {

        const rest =
            new REST({
                version: "10"
            }).setToken(TOKEN);

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
            "server listings",
            {
                type: 3
            }
        );
    }
);

// ============================================================
// WELCOMER
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

            if (
                !channel ||
                channel.type !==
                    ChannelType.GuildText
            ) {
                return;
            }

            const message =
                guildConfig.welcomeMessage ||
                `Welcome ${member} to **${member.guild.name}**!`;

            const embed =
                createEmbed(
                    "Welcome!",
                    message
                );

            // IMPORTANT:
            // No member avatar / thumbnail.
            await channel.send({
                content: `${member}`,
                embeds: [embed]
            });

        } catch (error) {

            console.error(
                "WELCOME ERROR:",
                error
            );
        }
    }
);

// ============================================================
// HELP
// ============================================================

function helpEmbed() {

    return new EmbedBuilder()
        .setColor(BRAND_COLOUR)
        .setTitle(
            `${LOGO} Commands`
        )
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
                    "`/profile`",
                inline: true
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
                    "`/purge`",
                inline: true
            },
            {
                name: "Management",
                value:
                    "`/lock`\n" +
                    "`/unlock`\n" +
                    "`/slowmode`\n" +
                    "`/role`\n" +
                    "`/announce`\n" +
                    "`/embed`",
                inline: true
            },
            {
                name: "Systems",
                value:
                    "`/ticketconfig`\n" +
                    "`/submitconfig`\n" +
                    "`/reportsetup`\n" +
                    "`/verification`",
                inline: true
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

            // ==================================================
            // SLASH COMMANDS
            // ==================================================

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
                                user.createdTimestamp / 1000
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
                                    member.joinedTimestamp / 1000
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
                                    member.joinedTimestamp / 1000
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
                // MODERATION
                // ==================================================

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
                        ]?.[user.id] || [];

                    if (
                        !list.length
                    ) {
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
                                list.map(
                                    (warning, index) =>
                                        `**${index + 1}.** ${warning.reason} — <@${warning.moderator}>`
                                ).join("\n")
                            )
                        ]
                    });
                }

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

                // ==================================================
                // MANAGEMENT
                // ==================================================

                if (
                    command === "lock"
                ) {

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

                if (
                    command === "unlock"
                ) {

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
                        role.position >=
                        interaction.guild.members.me.roles.highest.position
                    ) {
                        return interaction.reply({
                            content:
                                "My highest role is not high enough to manage that role.",
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

                // ==================================================
                // EMBED BUILDER
                // ==================================================

                if (
                    command === "embed"
                ) {

                    return sendEmbedBuilder(
                        interaction
                    );
                }

                // ==================================================
                // TICKET CONFIG
                // ==================================================

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

                // ==================================================
                // SUBMIT CONFIG
                // ==================================================

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

                // ==================================================
                // REPORT SETUP
                // ==================================================

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

                // ==================================================
                // VERIFICATION
                // ==================================================

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
                                        "verification_start"
                                    )
                                    .setLabel(
                                        "Verify"
                                    )
                                    .setStyle(
                                        ButtonStyle.Primary
                                    )
                            );

                    await interaction.channel.send({
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

                    return interaction.reply({
                        content:
                            "Verification panel sent.",
                        ephemeral: true
                    });
                }
            }

            // ==================================================
            // BUTTONS
            // ==================================================

            if (
                interaction.isButton()
            ) {

                const id =
                    interaction.customId;

                // ==================================================
                // VERIFICATION
                // ==================================================

                if (
                    id ===
                    "verification_start"
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
                                "Verification has not been configured with a role yet.",
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
                                "The configured verification role no longer exists.",
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

                // ==================================================
                // EMBED BUILDER BUTTONS
                // ==================================================

                if (
                    id === "embed_edit"
                ) {

                    const modal =
                        new ModalBuilder()
                            .setCustomId(
                                "embed_builder_modal"
                            )
                            .setTitle(
                                "Create Webhook Embed"
                            );

                    const title =
                        new TextInputBuilder()
                            .setCustomId(
                                "embed_title"
                            )
                            .setLabel(
                                "Embed Title"
                            )
                            .setStyle(
                                TextInputStyle.Short
                            )
                            .setRequired(true)
                            .setMaxLength(256);

                    const description =
                        new TextInputBuilder()
                            .setCustomId(
                                "embed_description"
                            )
                            .setLabel(
                                "Description"
                            )
                            .setStyle(
                                TextInputStyle.Paragraph
                            )
                            .setRequired(true)
                            .setMaxLength(4000);

                    const webhookName =
                        new TextInputBuilder()
                            .setCustomId(
                                "webhook_name"
                            )
                            .setLabel(
                                "Webhook Name"
                            )
                            .setStyle(
                                TextInputStyle.Short
                            )
                            .setRequired(true)
                            .setMaxLength(80)
                            .setValue(
                                "Server Listing"
                            );

                    modal.addComponents(
                        new ActionRowBuilder()
                            .addComponents(
                                title
                            ),
                        new ActionRowBuilder()
                            .addComponents(
                                description
                            ),
                        new ActionRowBuilder()
                            .addComponents(
                                webhookName
                            )
                    );

                    return interaction.showModal(
                        modal
                    );
                }

                if (
                    id === "embed_channel"
                ) {

                    const channels =
                        interaction.guild.channels.cache
                            .filter(
                                channel =>
                                    channel.type ===
                                    ChannelType.GuildText
                            )
                            .first(25);

                    if (
                        !channels.size
                    ) {
                        return interaction.reply({
                            content:
                                "No text channels found.",
                            ephemeral: true
                        });
                    }

                    const menu =
                        new StringSelectMenuBuilder()
                            .setCustomId(
                                "embed_channel_select"
                            )
                            .setPlaceholder(
                                "Select a channel"
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
                            "Select where the webhook embed should be sent.",
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
                    id === "embed_button"
                ) {

                    const current =
                        embedBuilders.get(
                            interaction.user.id
                        ) || {};

                    current.buttonEnabled =
                        !current.buttonEnabled;

                    embedBuilders.set(
                        interaction.user.id,
                        current
                    );

                    return interaction.update(
                        buildEmbedBuilderMessage(
                            current
                        )
                    );
                }

                if (
                    id === "embed_send"
                ) {

                    const current =
                        embedBuilders.get(
                            interaction.user.id
                        );

                    if (
                        !current ||
                        !current.title ||
                        !current.description
                    ) {
                        return interaction.reply({
                            content:
                                "Complete the embed details first.",
                            ephemeral: true
                        });
                    }

                    if (
                        !current.channelId
                    ) {
                        return interaction.reply({
                            content:
                                "Choose a channel first.",
                            ephemeral: true
                        });
                    }

                    await interaction.deferReply({
                        ephemeral: true
                    });

                    const channel =
                        interaction.guild.channels.cache.get(
                            current.channelId
                        );

                    if (!channel) {
                        return interaction.editReply(
                            "The selected channel no longer exists."
                        );
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
                                name:
                                    current.webhookName ||
                                    "Server Listing"
                            });
                    } else if (
                        current.webhookName
                    ) {
                        await webhook.edit({
                            name:
                                current.webhookName
                        });
                    }

                    const embed =
                        new EmbedBuilder()
                            .setColor(
                                BRAND_COLOUR
                            )
                            .setTitle(
                                `${LOGO} ${current.title}`
                            )
                            .setDescription(
                                current.description
                            )
                            .setTimestamp();

                    let components = [];

                    if (
                        current.buttonEnabled &&
                        current.buttonUrl
                    ) {

                        components = [
                            new ActionRowBuilder()
                                .addComponents(
                                    new ButtonBuilder()
                                        .setLabel(
                                            current.buttonLabel ||
                                            "Join Server!"
                                        )
                                        .setStyle(
                                            ButtonStyle.Link
                                        )
                                        .setURL(
                                            current.buttonUrl
                                        )
                                )
                        ];
                    }

                    await webhook.send({
                        username:
                            current.webhookName ||
                            "Server Listing",
                        avatarURL:
                            client.user.displayAvatarURL(),
                        embeds: [
                            embed
                        ],
                        components
                    });

                    embedBuilders.delete(
                        interaction.user.id
                    );

                    return interaction.editReply(
                        `Webhook embed sent to ${channel}.`
                    );
                }

                if (
                    id === "embed_button_settings"
                ) {

                    const modal =
                        new ModalBuilder()
                            .setCustomId(
                                "embed_button_modal"
                            )
                            .setTitle(
                                "Button Settings"
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
                            .setRequired(true)
                            .setMaxLength(80)
                            .setValue(
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
                            .setRequired(true)
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

                // ==================================================
                // TICKET
                // ==================================================

                if (
                    id === "open_ticket"
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

                    if (!staffRole) {
                        return interaction.reply({
                            content:
                                "The configured ticket staff role no longer exists.",
                            ephemeral: true
                        });
                    }

                    const category =
                        guildConfig.ticketCategoryId
                            ? interaction.guild.channels.cache.get(
                                  guildConfig.ticketCategoryId
                              )
                            : null;

                    const channel =
                        await interaction.guild.channels.create({
                            name:
                                `ticket-${safeChannelName(
                                    interaction.user.username
                                )}`,
                            type:
                                ChannelType.GuildText,
                            parent:
                                category?.type ===
                                ChannelType.GuildCategory
                                    ? category.id
                                    : undefined,
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

                    const row =
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
                                `Welcome ${interaction.user}!\n\nPlease explain what you need help with. A member of staff will assist you shortly.`
                            )
                        ],
                        components: [
                            row
                        ]
                    });

                    return interaction.reply({
                        content:
                            `Your ticket has been created: ${channel}`,
                        ephemeral: true
                    });
                }

                if (
                    id === "claim_ticket"
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

                if (
                    id === "close_ticket"
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
                        interaction.user
                    );

                    setTimeout(
                        () => {
                            interaction.channel
                                .delete()
                                .catch(
                                    () => {}
                                );
                        },
                        3000
                    );

                    return;
                }

                // ==================================================
                // SERVER SUBMISSION
                // ==================================================

                if (
                    id === "submit_server"
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
                                "The submission system has not been configured yet.",
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
                            .setRequired(true)
                            .setMaxLength(100);

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
                            .setRequired(true)
                            .setMaxLength(1000);

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
                            .setRequired(true)
                            .setMaxLength(200);

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
                            .setRequired(true)
                            .setMaxLength(100);

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
                            .setRequired(true)
                            .setMaxLength(100);

                    modal.addComponents(
                        new ActionRowBuilder()
                            .addComponents(
                                name
                            ),
                        new ActionRowBuilder()
                            .addComponents(
                                description
                            ),
                        new ActionRowBuilder()
                            .addComponents(
                                invite
                            ),
                        new ActionRowBuilder()
                            .addComponents(
                                category
                            ),
                        new ActionRowBuilder()
                            .addComponents(
                                owner
                            )
                    );

                    return interaction.showModal(
                        modal
                    );
                }

                // ==================================================
                // ACCEPT
                // ==================================================

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

                    if (
                        !listingChannel
                    ) {
                        return interaction.editReply(
                            "The verified/community channel has not been configured."
                        );
                    }

                    // Give verified role.
                    if (
                        guildConfig.verifiedRoleId
                    ) {

                        const applicant =
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
                            applicant &&
                            role
                        ) {
                            await applicant.roles
                                .add(
                                    role
                                )
                                .catch(
                                    () => {}
                                );
                        }
                    }

                    // ------------------------------------------
                    // WEBHOOK
                    // ------------------------------------------

                    const webhooks =
                        await listingChannel.fetchWebhooks();

                    let webhook =
                        webhooks.find(
                            hook =>
                                hook.owner?.id ===
                                client.user.id
                        );

                    if (!webhook) {
                        webhook =
                            await listingChannel.createWebhook({
                                name:
                                    "Server Listing"
                            });
                    } else {
                        await webhook.edit({
                            name:
                                "Server Listing"
                        }).catch(
                            () => {}
                        );
                    }

                    // IMPORTANT:
                    // The server invite is NOT in the embed.
                    // It is ONLY in the button underneath.

                    const listingEmbed =
                        new EmbedBuilder()
                            .setColor(
                                BRAND_COLOUR
                            )
                            .setTitle(
                                `${LOGO} Server Listing`
                            )
                            .setDescription(
                                submission.description
                            )
                            .addFields(
                                {
                                    name:
                                        "Server Name",
                                    value:
                                        submission.serverName,
                                    inline: true
                                },
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
                                }
                            )
                            .setFooter({
                                text:
                                    "Verified Server"
                            })
                            .setTimestamp();

                    const joinRow =
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
                                        submission.invite
                                    )
                            );

                    await webhook.send({
                        username:
                            "Server Listing",
                        avatarURL:
                            client.user.displayAvatarURL(),
                        embeds: [
                            listingEmbed
                        ],
                        components: [
                            joinRow
                        ]
                    });

                    // ------------------------------------------
                    // DM
                    // ------------------------------------------

                    const applicant =
                        await client.users.fetch(
                            submission.userId
                        ).catch(
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

                    // ------------------------------------------
                    // UPDATE REVIEW CHANNEL
                    // ------------------------------------------

                    await interaction.channel.send({
                        embeds: [
                            createEmbed(
                                "Submission Approved",
                                `**${submission.serverName}** has been approved by ${interaction.user}.\n\nThe server has been posted in ${listingChannel}.`
                            )
                        ]
                    }).catch(
                        () => {}
                    );

                    await interaction.editReply(
                        "The server has been approved and listed."
                    );

                    submissions.delete(
                        submissionId
                    );

                    // DELETE REVIEW CHANNEL
                    setTimeout(
                        () => {
                            interaction.channel
                                .delete()
                                .catch(
                                    () => {}
                                );
                        },
                        3000
                    );

                    return;
                }

                // ==================================================
                // DENY
                // ==================================================

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
                                "Reason"
                            )
                            .setStyle(
                                TextInputStyle.Paragraph
                            )
                            .setRequired(true)
                            .setMaxLength(1000);

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

                // ==================================================
                // REPORT SERVER
                // ==================================================

                if (
                    id === "report_server"
                ) {

                    const modal =
                        new ModalBuilder()
                            .setCustomId(
                                "server_report_modal"
                            )
                            .setTitle(
                                "Report a Server"
                            );

                    const serverName =
                        new TextInputBuilder()
                            .setCustomId(
                                "report_server_name"
                            )
                            .setLabel(
                                "Server Name"
                            )
                            .setStyle(
                                TextInputStyle.Short
                            )
                            .setRequired(true)
                            .setMaxLength(100);

                    const serverId =
                        new TextInputBuilder()
                            .setCustomId(
                                "report_server_id"
                            )
                            .setLabel(
                                "Server ID / Invite"
                            )
                            .setStyle(
                                TextInputStyle.Short
                            )
                            .setRequired(true)
                            .setMaxLength(200);

                    const reason =
                        new TextInputBuilder()
                            .setCustomId(
                                "report_reason"
                            )
                            .setLabel(
                                "Reason for report"
                            )
                            .setStyle(
                                TextInputStyle.Paragraph
                            )
                            .setRequired(true)
                            .setMaxLength(1000);

                    modal.addComponents(
                        new ActionRowBuilder()
                            .addComponents(
                                serverName
                            ),
                        new ActionRowBuilder()
                            .addComponents(
                                serverId
                            ),
                        new ActionRowBuilder()
                            .addComponents(
                                reason
                            )
                    );

                    return interaction.showModal(
                        modal
                    );
                }

                // ==================================================
                // REPORT CLOSE
                // ==================================================

                if (
                    id === "close_report"
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

                    setTimeout(
                        () => {
                            interaction.channel
                                .delete()
                                .catch(
                                    () => {}
                                );
                        },
                        3000
                    );

                    return;
                }

                // ==================================================
                // CONFIG BUTTONS
                // ==================================================

                if (
                    id === "ticket_set_staff"
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

                    return roleSelect(
                        interaction,
                        "ticket_staff_select",
                        "Select ticket staff role"
                    );
                }

                if (
                    id === "ticket_set_category"
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

                    return categorySelect(
                        interaction,
                        "ticket_category_select",
                        "Select ticket category"
                    );
                }

                if (
                    id === "ticket_set_logs"
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

                    return channelSelect(
                        interaction,
                        "ticket_logs_select",
                        "Select ticket logs channel"
                    );
                }

                if (
                    id === "ticket_send_panel"
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
                                "Need help? Click the button below to open a private support ticket."
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
                    id === "ticket_refresh"
                ) {

                    return sendTicketConfigPanel(
                        interaction,
                        true
                    );
                }

                if (
                    id === "submit_set_staff"
                ) {

                    return roleSelect(
                        interaction,
                        "submit_staff_select",
                        "Select submission staff role"
                    );
                }

                if (
                    id === "submit_set_review"
                ) {

                    return categorySelect(
                        interaction,
                        "submit_review_select",
                        "Select review category"
                    );
                }

                if (
                    id === "submit_set_verified"
                ) {

                    return channelSelect(
                        interaction,
                        "submit_verified_select",
                        "Select community/verified channel"
                    );
                }

                if (
                    id === "submit_set_verified_role"
                ) {

                    return roleSelect(
                        interaction,
                        "submit_verified_role_select",
                        "Select verified role"
                    );
                }

                if (
                    id === "submit_send_panel"
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
                                "Want your server featured in our verified server listings?\n\nClick the button below to submit your server.\n\nAll submissions are manually reviewed."
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
                    id === "submit_refresh"
                ) {

                    return sendSubmitConfigPanel(
                        interaction,
                        true
                    );
                }

                // REPORT CONFIG

                if (
                    id === "report_set_staff"
                ) {

                    return roleSelect(
                        interaction,
                        "report_staff_select",
                        "Select report staff role"
                    );
                }

                if (
                    id === "report_set_category"
                ) {

                    return categorySelect(
                        interaction,
                        "report_category_select",
                        "Select report category"
                    );
                }

                if (
                    id === "report_send_panel"
                ) {

                    const row =
                        new ActionRowBuilder()
                            .addComponents(
                                new ButtonBuilder()
                                    .setCustomId(
                                        "report_server"
                                    )
                                    .setLabel(
                                        "Report Server"
                                    )
                                    .setStyle(
                                        ButtonStyle.Danger
                                    )
                            );

                    await interaction.channel.send({
                        embeds: [
                            createEmbed(
                                "Report a Server",
                                "If you believe a listed server breaks our rules, you can report it to our staff team below."
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
                    id === "report_refresh"
                ) {

                    return sendReportConfigPanel(
                        interaction,
                        true
                    );
                }

                if (
                    id === "verification_set_role"
                ) {

                    return roleSelect(
                        interaction,
                        "verification_role_select",
                        "Select verification role"
                    );
                }
            }

            // ==================================================
            // SELECT MENUS
            // ==================================================

            if (
                interaction.isStringSelectMenu()
            ) {

                const id =
                    interaction.customId;

                if (
                    id ===
                    "ticket_staff_select"
                ) {

                    const cfg =
                        getGuildConfig(
                            interaction.guild.id
                        );

                    cfg.ticketStaffRoleId =
                        interaction.values[0];

                    cfg.staffRoleId =
                        cfg.staffRoleId ||
                        interaction.values[0];

                    saveConfig();

                    return interaction.update({
                        content:
                            `Ticket staff role set to <@&${interaction.values[0]}>.`,
                        components: []
                    });
                }

                if (
                    id ===
                    "ticket_category_select"
                ) {

                    const cfg =
                        getGuildConfig(
                            interaction.guild.id
                        );

                    cfg.ticketCategoryId =
                        interaction.values[0];

                    saveConfig();

                    return interaction.update({
                        content:
                            `Ticket category set to <#${interaction.values[0]}>.`,
                        components: []
                    });
                }

                if (
                    id ===
                    "ticket_logs_select"
                ) {

                    const cfg =
                        getGuildConfig(
                            interaction.guild.id
                        );

                    cfg.ticketLogsChannelId =
                        interaction.values[0];

                    saveConfig();

                    return interaction.update({
                        content:
                            `Ticket logs channel set to <#${interaction.values[0]}>.`,
                        components: []
                    });
                }

                if (
                    id ===
                    "submit_staff_select"
                ) {

                    const cfg =
                        getGuildConfig(
                            interaction.guild.id
                        );

                    cfg.submitStaffRoleId =
                        interaction.values[0];

                    cfg.staffRoleId =
                        cfg.staffRoleId ||
                        interaction.values[0];

                    saveConfig();

                    return interaction.update({
                        content:
                            `Submission staff role set to <@&${interaction.values[0]}>.`,
                        components: []
                    });
                }

                if (
                    id ===
                    "submit_review_select"
                ) {

                    const cfg =
                        getGuildConfig(
                            interaction.guild.id
                        );

                    cfg.submitReviewCategoryId =
                        interaction.values[0];

                    saveConfig();

                    return interaction.update({
                        content:
                            `Review category set to <#${interaction.values[0]}>.`,
                        components: []
                    });
                }

                if (
                    id ===
                    "submit_verified_select"
                ) {

                    const cfg =
                        getGuildConfig(
                            interaction.guild.id
                        );

                    cfg.verifiedChannelId =
                        interaction.values[0];

                    saveConfig();

                    return interaction.update({
                        content:
                            `Community/verified channel set to <#${interaction.values[0]}>.`,
                        components: []
                    });
                }

                if (
                    id ===
                    "submit_verified_role_select"
                ) {

                    const cfg =
                        getGuildConfig(
                            interaction.guild.id
                        );

                    cfg.verifiedRoleId =
                        interaction.values[0];

                    saveConfig();

                    return interaction.update({
                        content:
                            `Verified role set to <@&${interaction.values[0]}>.`,
                        components: []
                    });
                }

                if (
                    id ===
                    "report_staff_select"
                ) {

                    const cfg =
                        getGuildConfig(
                            interaction.guild.id
                        );

                    cfg.reportStaffRoleId =
                        interaction.values[0];

                    cfg.staffRoleId =
                        cfg.staffRoleId ||
                        interaction.values[0];

                    saveConfig();

                    return interaction.update({
                        content:
                            `Report staff role set to <@&${interaction.values[0]}>.`,
                        components: []
                    });
                }

                if (
                    id ===
                    "report_category_select"
                ) {

                    const cfg =
                        getGuildConfig(
                            interaction.guild.id
                        );

                    cfg.reportCategoryId =
                        interaction.values[0];

                    saveConfig();

                    return interaction.update({
                        content:
                            `Report category set to <#${interaction.values[0]}>.`,
                        components: []
                    });
                }

                if (
                    id ===
                    "verification_role_select"
                ) {

                    const cfg =
                        getGuildConfig(
                            interaction.guild.id
                        );

                    cfg.verificationRoleId =
                        interaction.values[0];

                    saveConfig();

                    return interaction.update({
                        content:
                            `Verification role set to <@&${interaction.values[0]}>.`,
                        components: []
                    });
                }

                if (
                    id ===
                    "embed_channel_select"
                ) {

                    const current =
                        embedBuilders.get(
                            interaction.user.id
                        ) || {};

                    current.channelId =
                        interaction.values[0];

                    embedBuilders.set(
                        interaction.user.id,
                        current
                    );

                    return interaction.update({
                        content:
                            `Embed channel set to <#${interaction.values[0]}>.`,
                        components: []
                    });
                }
            }

            // ==================================================
            // MODALS
            // ==================================================

            if (
                interaction.isModalSubmit()
            ) {

                // ----------------------------------------------
                // EMBED BUILDER
                // ----------------------------------------------

                if (
                    interaction.customId ===
                    "embed_builder_modal"
                ) {

                    const current =
                        embedBuilders.get(
                            interaction.user.id
                        ) || {};

                    current.title =
                        interaction.fields.getTextInputValue(
                            "embed_title"
                        );

                    current.description =
                        interaction.fields.getTextInputValue(
                            "embed_description"
                        );

                    current.webhookName =
                        interaction.fields.getTextInputValue(
                            "webhook_name"
                        );

                    embedBuilders.set(
                        interaction.user.id,
                        current
                    );

                    return interaction.reply({
                        content:
                            "Embed details saved. Use the embed builder buttons to choose a channel, configure a button, or send it.",
                        ephemeral: true
                    });
                }

                // ----------------------------------------------
                // BUTTON SETTINGS
                // ----------------------------------------------

                if (
                    interaction.customId ===
                    "embed_button_modal"
                ) {

                    const current =
                        embedBuilders.get(
                            interaction.user.id
                        ) || {};

                    current.buttonEnabled =
                        true;

                    current.buttonLabel =
                        interaction.fields.getTextInputValue(
                            "button_label"
                        );

                    current.buttonUrl =
                        interaction.fields.getTextInputValue(
                            "button_url"
                        );

                    embedBuilders.set(
                        interaction.user.id,
                        current
                    );

                    return interaction.reply({
                        content:
                            "Button settings saved.",
                        ephemeral: true
                    });
                }

                // ----------------------------------------------
                // SERVER SUBMISSION
                // ----------------------------------------------

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
                        makeId();

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

                    const cfg =
                        getGuildConfig(
                            interaction.guild.id
                        );

                    const staffRole =
                        interaction.guild.roles.cache.get(
                            cfg.submitStaffRoleId
                        );

                    if (!staffRole) {
                        return interaction.reply({
                            content:
                                "The submission staff role is not configured correctly.",
                            ephemeral: true
                        });
                    }

                    const categoryChannel =
                        cfg.submitReviewCategoryId
                            ? interaction.guild.channels.cache.get(
                                  cfg.submitReviewCategoryId
                              )
                            : null;

                    const reviewChannel =
                        await interaction.guild.channels.create({
                            name:
                                `review-${safeChannelName(
                                    serverName
                                )}`,
                            type:
                                ChannelType.GuildText,
                            parent:
                                categoryChannel?.type ===
                                ChannelType.GuildCategory
                                    ? categoryChannel.id
                                    : undefined,
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

                    const row =
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

                    const reviewEmbed =
                        createEmbed(
                            "New Server Submission",
                            "A server has been submitted for manual verification."
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
                                    "Submitter",
                                value:
                                    `<@${interaction.user.id}>`
                            },
                            {
                                name:
                                    "Submitter's Role",
                                value:
                                    owner
                            }
                        );

                    await reviewChannel.send({
                        content:
                            `${staffRole} — new submission awaiting review.`,
                        embeds: [
                            reviewEmbed
                        ],
                        components: [
                            row
                        ]
                    });

                    return interaction.reply({
                        embeds: [
                            createEmbed(
                                "Submission Received",
                                "Your server has been submitted successfully.\n\nOur staff team will manually review it. You will receive a DM when a decision has been made."
                            )
                        ],
                        ephemeral: true
                    });
                }

                // ----------------------------------------------
                // DENIAL
                // ----------------------------------------------

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
                                "Only staff can deny submissions.",
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
                        await client.users.fetch(
                            submission.userId
                        ).catch(
                            () => null
                        );

                    if (applicant) {

                        await applicant.send({
                            embeds: [
                                createEmbed(
                                    "Server Submission Denied",
                                    `Your server **${submission.serverName}** was not approved.\n\n**Reason:** ${reason}`
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

                    await interaction.reply({
                        content:
                            "The submitter has been notified. This review channel will now be deleted.",
                        ephemeral: true
                    });

                    submissions.delete(
                        submissionId
                    );

                    setTimeout(
                        () => {
                            interaction.channel
                                .delete()
                                .catch(
                                    () => {}
                                );
                        },
                        3000
                    );

                    return;
                }

                // ----------------------------------------------
                // SERVER REPORT
                // ----------------------------------------------

                if (
                    interaction.customId ===
                    "server_report_modal"
                ) {

                    const serverName =
                        interaction.fields.getTextInputValue(
                            "report_server_name"
                        );

                    const serverId =
                        interaction.fields.getTextInputValue(
                            "report_server_id"
                        );

                    const reason =
                        interaction.fields.getTextInputValue(
                            "report_reason"
                        );

                    const cfg =
                        getGuildConfig(
                            interaction.guild.id
                        );

                    const staffRole =
                        interaction.guild.roles.cache.get(
                            cfg.reportStaffRoleId
                        );

                    if (!staffRole) {
                        return interaction.reply({
                            content:
                                "The report system has not been configured correctly.",
                            ephemeral: true
                        });
                    }

                    const category =
                        cfg.reportCategoryId
                            ? interaction.guild.channels.cache.get(
                                  cfg.reportCategoryId
                              )
                            : null;

                    const reportChannel =
                        await interaction.guild.channels.create({
                            name:
                                `server-reports-${safeChannelName(
                                    interaction.user.username
                                )}`,
                            type:
                                ChannelType.GuildText,
                            parent:
                                category?.type ===
                                ChannelType.GuildCategory
                                    ? category.id
                                    : undefined,
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

                    const row =
                        new ActionRowBuilder()
                            .addComponents(
                                new ButtonBuilder()
                                    .setCustomId(
                                        "close_report"
                                    )
                                    .setLabel(
                                        "Close Report"
                                    )
                                    .setStyle(
                                        ButtonStyle.Danger
                                    )
                            );

                    await reportChannel.send({
                        content:
                            `${staffRole} ${interaction.user}`,
                        embeds: [
                            createEmbed(
                                "Server Report",
                                "A server has been reported."
                            ).addFields(
                                {
                                    name:
                                        "Reported Server",
                                    value:
                                        serverName
                                },
                                {
                                    name:
                                        "Server ID / Invite",
                                    value:
                                        serverId
                                },
                                {
                                    name:
                                        "Reason",
                                    value:
                                        reason
                                },
                                {
                                    name:
                                        "Reported By",
                                    value:
                                        `<@${interaction.user.id}>`
                                }
                            )
                        ],
                        components: [
                            row
                        ]
                    });

                    return interaction.reply({
                        content:
                            `Your report has been submitted: ${reportChannel}`,
                        ephemeral: true
                    });
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
// SELECT MENU HELPERS
// ============================================================

async function roleSelect(
    interaction,
    customId,
    placeholder
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
                customId
            )
            .setPlaceholder(
                placeholder
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
            placeholder,
        components: [
            new ActionRowBuilder()
                .addComponents(
                    menu
                )
        ],
        ephemeral: true
    });
}

async function categorySelect(
    interaction,
    customId,
    placeholder
) {

    const categories =
        interaction.guild.channels.cache
            .filter(
                channel =>
                    channel.type ===
                    ChannelType.GuildCategory
            )
            .first(25);

    if (
        !categories.size
    ) {
        return interaction.reply({
            content:
                "No categories found.",
            ephemeral: true
        });
    }

    const menu =
        new StringSelectMenuBuilder()
            .setCustomId(
                customId
            )
            .setPlaceholder(
                placeholder
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
            placeholder,
        components: [
            new ActionRowBuilder()
                .addComponents(
                    menu
                )
        ],
        ephemeral: true
    });
}

async function channelSelect(
    interaction,
    customId,
    placeholder
) {

    const channels =
        interaction.guild.channels.cache
            .filter(
                channel =>
                    channel.type ===
                    ChannelType.GuildText
            )
            .first(25);

    if (
        !channels.size
    ) {
        return interaction.reply({
            content:
                "No text channels found.",
            ephemeral: true
        });
    }

    const menu =
        new StringSelectMenuBuilder()
            .setCustomId(
                customId
            )
            .setPlaceholder(
                placeholder
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
            placeholder,
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

function buildEmbedBuilderMessage(
    current = {}
) {

    const embed =
        createEmbed(
            "Webhook Embed Builder",
            "Build your webhook message below. The message will be sent using a real Discord webhook."
        ).addFields(
            {
                name:
                    "Title",
                value:
                    current.title ||
                    "Not set",
                inline: true
            },
            {
                name:
                    "Channel",
                value:
                    current.channelId
                        ? `<#${current.channelId}>`
                        : "Not set",
                inline: true
            },
            {
                name:
                    "Webhook Name",
                value:
                    current.webhookName ||
                    "Server Listing",
                inline: true
            },
            {
                name:
                    "Button",
                value:
                    current.buttonEnabled &&
                    current.buttonUrl
                        ? `${current.buttonLabel || "Join Server!"} → ${current.buttonUrl}`
                        : "Disabled",
                inline: false
            }
        );

    const row1 =
        new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(
                        "embed_edit"
                    )
                    .setLabel(
                        "Edit Embed"
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
                    ),
                new ButtonBuilder()
                    .setCustomId(
                        "embed_button_settings"
                    )
                    .setLabel(
                        "Button"
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
                        "embed_send"
                    )
                    .setLabel(
                        "Send"
                    )
                    .setStyle(
                        ButtonStyle.Success
                    )
            );

    return {
        embeds: [
            embed
        ],
        components: [
            row1,
            row2
        ],
        ephemeral: true
    };
}

async function sendEmbedBuilder(
    interaction
) {

    embedBuilders.set(
        interaction.user.id,
        {}
    );

    return interaction.reply(
        buildEmbedBuilderMessage({})
    );
}

// ============================================================
// TICKET CONFIG
// ============================================================

async function sendTicketConfigPanel(
    interaction,
    edit = false
) {

    const cfg =
        getGuildConfig(
            interaction.guild.id
        );

    const staff =
        cfg.ticketStaffRoleId
            ? `<@&${cfg.ticketStaffRoleId}>`
            : "Not configured";

    const category =
        cfg.ticketCategoryId
            ? `<#${cfg.ticketCategoryId}>`
            : "Not configured";

    const logs =
        cfg.ticketLogsChannelId
            ? `<#${cfg.ticketLogsChannelId}>`
            : "Not configured";

    const embed =
        createEmbed(
            "Ticket Configuration",
            "Configure the ticket system below."
        ).addFields(
            {
                name:
                    "Staff Role",
                value:
                    staff,
                inline: true
            },
            {
                name:
                    "Ticket Category",
                value:
                    category,
                inline: true
            },
            {
                name:
                    "Ticket Logs",
                value:
                    logs,
                inline: true
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

    const response = {
        embeds: [
            embed
        ],
        components: [
            row1,
            row2
        ],
        ephemeral: true
    };

    if (edit) {
        return interaction.editReply(
            response
        );
    }

    return interaction.reply(
        response
    );
}

// ============================================================
// SUBMISSION CONFIG
// ============================================================

async function sendSubmitConfigPanel(
    interaction,
    edit = false
) {

    const cfg =
        getGuildConfig(
            interaction.guild.id
        );

    const embed =
        createEmbed(
            "Server Submission Configuration",
            "Configure your manual server verification system."
        ).addFields(
            {
                name:
                    "Submission Staff",
                value:
                    cfg.submitStaffRoleId
                        ? `<@&${cfg.submitStaffRoleId}>`
                        : "Not configured",
                inline: true
            },
            {
                name:
                    "Review Category",
                value:
                    cfg.submitReviewCategoryId
                        ? `<#${cfg.submitReviewCategoryId}>`
                        : "Not configured",
                inline: true
            },
            {
                name:
                    "Community Channel",
                value:
                    cfg.verifiedChannelId
                        ? `<#${cfg.verifiedChannelId}>`
                        : "Not configured",
                inline: true
            },
            {
                name:
                    "Verified Role",
                value:
                    cfg.verifiedRoleId
                        ? `<@&${cfg.verifiedRoleId}>`
                        : "Not configured",
                inline: true
            },
            {
                name:
                    "Process",
                value:
                    "Submit → Private review channel → Accept/Deny → Listing posted by webhook → Review channel deleted.",
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

    const response = {
        embeds: [
            embed
        ],
        components: [
            row1,
            row2
        ],
        ephemeral: true
    };

    if (edit) {
        return interaction.editReply(
            response
        );
    }

    return interaction.reply(
        response
    );
}

// ============================================================
// REPORT CONFIG
// ============================================================

async function sendReportConfigPanel(
    interaction,
    edit = false
) {

    const cfg =
        getGuildConfig(
            interaction.guild.id
        );

    const embed =
        createEmbed(
            "Server Report Configuration",
            "Configure the server reporting system."
        ).addFields(
            {
                name:
                    "Report Staff",
                value:
                    cfg.reportStaffRoleId
                        ? `<@&${cfg.reportStaffRoleId}>`
                        : "Not configured",
                inline: true
            },
            {
                name:
                    "Report Category",
                value:
                    cfg.reportCategoryId
                        ? `<#${cfg.reportCategoryId}>`
                        : "Not configured",
                inline: true
            },
            {
                name:
                    "Report Tickets",
                value:
                    "`server-reports-{user}`",
                inline: false
            }
        );

    const row =
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
                        "report_set_category"
                    )
                    .setLabel(
                        "Report Category"
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

    const response = {
        embeds: [
            embed
        ],
        components: [
            row
        ],
        ephemeral: true
    };

    if (edit) {
        return interaction.editReply(
            response
        );
    }

    return interaction.reply(
        response
    );
}

// ============================================================
// TICKET LOGGING
// ============================================================

async function sendTicketLog(
    guild,
    channel,
    closer
) {

    try {

        const cfg =
            getGuildConfig(
                guild.id
            );

        if (
            !cfg.ticketLogsChannelId
        ) {
            return;
        }

        const logChannel =
            guild.channels.cache.get(
                cfg.ticketLogsChannelId
            );

        if (!logChannel) {
            return;
        }

        await logChannel.send({
            embeds: [
                createEmbed(
                    "Ticket Closed",
                    `**Channel:** #${channel.name}\n` +
                    `**Closed by:** ${closer}\n` +
                    `**Channel ID:** ${channel.id}`
                )
            ]
        });

    } catch (error) {

        console.error(
            "TICKET LOG ERROR:",
            error
        );
    }
}

// ============================================================
// CLEAN OLD SUBMISSIONS
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
                submission.createdAt &&
                now -
                    submission.createdAt >
                    24 *
                        60 *
                        60 *
                        1000
            ) {
                submissions.delete(
                    id
                );
            }
        }

    },
    30 *
        60 *
        1000
);

// ============================================================
// LOGIN
// ============================================================

client.login(
    TOKEN
);
