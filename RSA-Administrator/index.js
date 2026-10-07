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
// RSA UTILITY CONFIG
// ============================================================

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

const EMBED_COLOUR = "#2F4DA8";
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
                JSON.stringify(fallback, null, 2)
            );

            return fallback;
        }

        return JSON.parse(
            fs.readFileSync(file, "utf8")
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
            JSON.stringify(data, null, 2)
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

// School enrolment data.
//
// Because the questionnaire is completed in DMs,
// guildId is saved when /enrolschool is originally used.
const enrolments = new Map();

// Ticket owners.
const ticketOwners = new Map();

// ============================================================
// EMBED
// ============================================================

function createEmbed(title, description) {
    return new EmbedBuilder()
        .setColor(EMBED_COLOUR)
        .setTitle(`${LOGO} ${title}`)
        .setDescription(description)
        .setTimestamp();
}

// ============================================================
// CONFIG HELPERS
// ============================================================

function getGuildConfig(guildId) {
    if (!config[guildId]) {
        config[guildId] = {};
    }

    return config[guildId];
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
        getGuildConfig(member.guild.id);

    if (!guildConfig.enrolStaffRoleId) {
        return false;
    }

    return member.roles.cache.has(
        guildConfig.enrolStaffRoleId
    );
}

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

// ============================================================
// COMMANDS
// ============================================================

const commands = [

    // ========================================================
    // BASIC
    // ========================================================

    new SlashCommandBuilder()
        .setName("help")
        .setDescription(
            "Shows the bot's commands"
        ),

    new SlashCommandBuilder()
        .setName("ping")
        .setDescription(
            "Checks the bot's latency"
        ),

    new SlashCommandBuilder()
        .setName("botinfo")
        .setDescription(
            "Shows information about the bot"
        ),

    new SlashCommandBuilder()
        .setName("serverinfo")
        .setDescription(
            "Shows information about the server"
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
                    "The user to view"
                )
                .setRequired(false)
        ),

    new SlashCommandBuilder()
        .setName("profile")
        .setDescription(
            "Shows your profile"
        ),

    // ========================================================
    // MODERATION
    // ========================================================

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
                    "Timeout duration in minutes"
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
            "Removes a member's timeout"
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
                    "Number of messages"
                )
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(100)
        ),

    // ========================================================
    // MANAGEMENT
    // ========================================================

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
            "Adds or removes a role"
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
            "Sends an announcement"
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

    new SlashCommandBuilder()
        .setName("embed")
        .setDescription(
            "Creates an embed"
        )
        .setDefaultMemberPermissions(
            PermissionFlagsBits.ManageMessages
        )
        .addStringOption(option =>
            option
                .setName("title")
                .setDescription(
                    "Embed title"
                )
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName("description")
                .setDescription(
                    "Embed description"
                )
                .setRequired(true)
        ),

    // ========================================================
    // TICKETS
    // ========================================================

    new SlashCommandBuilder()
        .setName("ticketconfig")
        .setDescription(
            "Configure the ticket system"
        )
        .setDefaultMemberPermissions(
            PermissionFlagsBits.ManageGuild
        ),

    // ========================================================
    // SCHOOL ENROLMENT
    // ========================================================

    new SlashCommandBuilder()
        .setName("enrolschool")
        .setDescription(
            "Start a school enrolment"
        ),

    new SlashCommandBuilder()
        .setName("enrolconfig")
        .setDescription(
            "Configure the school enrolment system"
        )
        .setDefaultMemberPermissions(
            PermissionFlagsBits.ManageGuild
        )

].map(command => command.toJSON());

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
            "Slash commands registered successfully."
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
        `Serving ${client.guilds.cache.size} server(s)`
    );

    await registerCommands();

    client.user.setActivity(
        "RSA school enrolments",
        {
            type: 3
        }
    );
});

// ============================================================
// MAIN INTERACTION HANDLER
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

                // ==================================================
                // HELP
                // ==================================================

                if (command === "help") {

                    const embed =
                        createEmbed(
                            "RSA Utility Commands",
                            "Here are the commands available."
                        )
                        .addFields(

                            {
                                name: "Basic",
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
                                    "`/ticketconfig` — Configure and send the ticket panel"
                            },

                            {
                                name: "School Enrolment",
                                value:
                                    "`/enrolschool` — Start a school enrolment\n" +
                                    "`/enrolconfig` — Configure school enrolment"
                            }

                        );

                    return interaction.reply({
                        embeds: [embed],
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
                                "Information about RSA Utility."
                            )
                            .addFields(
                                {
                                    name: "Bot",
                                    value:
                                        client.user.tag,
                                    inline: true
                                },
                                {
                                    name: "Servers",
                                    value:
                                        `${client.guilds.cache.size}`,
                                    inline: true
                                },
                                {
                                    name: "Discord.js",
                                    value:
                                        "v14",
                                    inline: true
                                }
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
                                "Server information."
                            )
                            .addFields(
                                {
                                    name: "Owner",
                                    value:
                                        `<@${guild.ownerId}>`,
                                    inline: true
                                },
                                {
                                    name: "Members",
                                    value:
                                        `${guild.memberCount}`,
                                    inline: true
                                },
                                {
                                    name: "Channels",
                                    value:
                                        `${guild.channels.cache.size}`,
                                    inline: true
                                },
                                {
                                    name: "Roles",
                                    value:
                                        `${guild.roles.cache.size}`,
                                    inline: true
                                }
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
                        await interaction.guild
                            .members
                            .fetch(user.id)
                            .catch(() => null);

                    const embed =
                        createEmbed(
                            "User Information",
                            ""
                        )
                        .setThumbnail(
                            user.displayAvatarURL()
                        )
                        .addFields(
                            {
                                name: "Username",
                                value:
                                    user.tag,
                                inline: true
                            },
                            {
                                name: "User ID",
                                value:
                                    user.id,
                                inline: true
                            },
                            {
                                name: "Created",
                                value:
                                    `<t:${Math.floor(
                                        user.createdTimestamp / 1000
                                    )}:F>`
                            }
                        );

                    if (member) {
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
                                ""
                            )
                            .setThumbnail(
                                interaction.user.displayAvatarURL()
                            )
                            .addFields(
                                {
                                    name: "Username",
                                    value:
                                        interaction.user.tag
                                },
                                {
                                    name: "Joined",
                                    value:
                                        `<t:${Math.floor(
                                            member.joinedTimestamp / 1000
                                        )}:R>`
                                },
                                {
                                    name: "Roles",
                                    value:
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
                                }
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
                        await interaction.guild
                            .members
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
                        await interaction.guild
                            .members
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
                        await interaction.guild
                            .members
                            .fetch(user.id)
                            .catch(() => null);

                    if (!member) {
                        return interaction.reply({
                            content:
                                "That member is not in this server.",
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
                        await interaction.guild
                            .members
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

                // ==================================================
                // WARNINGS
                // ==================================================

                if (command === "warnings") {

                    const user =
                        interaction.options.getUser(
                            "user"
                        ) ||
                        interaction.user;

                    const userWarnings =
                        warnings[
                            interaction.guild.id
                        ]?.[user.id] || [];

                    if (
                        userWarnings.length === 0
                    ) {
                        return interaction.reply({
                            content:
                                `**${user.tag}** has no warnings.`,
                            ephemeral: true
                        });
                    }

                    const text =
                        userWarnings
                            .map(
                                (warning, index) =>
                                    `**${index + 1}.** ${warning.reason} — <@${warning.moderator}>`
                            )
                            .join("\n");

                    return interaction.reply({
                        embeds: [
                            createEmbed(
                                `Warnings — ${user.tag}`,
                                text
                            )
                        ]
                    });
                }

                // ==================================================
                // CLEAR WARNINGS
                // ==================================================

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
                            `Cleared all warnings for **${user.tag}**.`
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
                        .permissionOverwrites
                        .edit(
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
                        .permissionOverwrites
                        .edit(
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

                    const subcommand =
                        interaction.options.getSubcommand();

                    const user =
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
                        subcommand === "add"
                    ) {

                        await user.roles.add(
                            role
                        );

                        return interaction.reply({
                            content:
                                `Added ${role} to **${user.user.tag}**.`
                        });
                    }

                    if (
                        subcommand === "remove"
                    ) {

                        await user.roles.remove(
                            role
                        );

                        return interaction.reply({
                            content:
                                `Removed ${role} from **${user.user.tag}**.`
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
                // EMBED
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

                    return interaction.reply({
                        embeds: [
                            createEmbed(
                                title,
                                description
                            )
                        ]
                    });
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
                                "You need Manage Server permissions to use this.",
                            ephemeral: true
                        });
                    }

                    return sendTicketConfigPanel(
                        interaction
                    );
                }

                // ==================================================
                // ENROL SCHOOL
                // ==================================================

                if (
                    command === "enrolschool"
                ) {

                    const guildConfig =
                        getGuildConfig(
                            interaction.guild.id
                        );

                    if (
                        !guildConfig.enrolStaffRoleId
                    ) {
                        return interaction.reply({
                            content:
                                "The school enrolment system has not been configured yet. Please ask an administrator to use `/enrolconfig`.",
                            ephemeral: true
                        });
                    }

                    enrolments.set(
                        interaction.user.id,
                        {
                            guildId:
                                interaction.guild.id,
                            step: 0,
                            answers: {},
                            createdAt:
                                Date.now()
                        }
                    );

                    const dmEmbed =
                        createEmbed(
                            "School Enrolment",
                            `Welcome to the **${interaction.guild.name}** school enrolment system.\n\nClick **Start Questionnaire** below to begin your application.\n\nYou will be asked **6 questions**, one at a time.`
                        );

                    const row =
                        new ActionRowBuilder()
                            .addComponents(
                                new ButtonBuilder()
                                    .setCustomId(
                                        "start_enrol_questionnaire"
                                    )
                                    .setLabel(
                                        "Start Questionnaire"
                                    )
                                    .setStyle(
                                        ButtonStyle.Primary
                                    )
                            );

                    try {

                        await interaction.user.send({
                            embeds: [
                                dmEmbed
                            ],
                            components: [
                                row
                            ]
                        });

                    } catch {

                        return interaction.reply({
                            content:
                                "I couldn't DM you. Please enable DMs from server members and try `/enrolschool` again.",
                            ephemeral: true
                        });
                    }

                    return interaction.reply({
                        content:
                            "I've sent the school enrolment questionnaire to your DMs.",
                        ephemeral: true
                    });
                }

                // ==================================================
                // ENROL CONFIG
                // ==================================================

                if (
                    command === "enrolconfig"
                ) {

                    if (
                        !canManage(
                            interaction.member
                        )
                    ) {
                        return interaction.reply({
                            content:
                                "You need Manage Server permissions to use this.",
                            ephemeral: true
                        });
                    }

                    return sendEnrolConfigPanel(
                        interaction
                    );
                }
            }

            // ====================================================
            // BUTTONS
            // ====================================================

            if (
                interaction.isButton()
            ) {

                // ==================================================
                // START QUESTIONNAIRE
                // ==================================================

                if (
                    interaction.customId ===
                    "start_enrol_questionnaire"
                ) {

                    const enrolment =
                        enrolments.get(
                            interaction.user.id
                        );

                    if (!enrolment) {

                        return interaction.reply({
                            content:
                                "Your enrolment session has expired. Please run `/enrolschool` again in the server.",
                            ephemeral: true
                        });
                    }

                    const modal =
                        new ModalBuilder()
                            .setCustomId(
                                "enrol_question_1"
                            )
                            .setTitle(
                                "School Enrolment — 1/6"
                            );

                    const input =
                        new TextInputBuilder()
                            .setCustomId(
                                "school_name"
                            )
                            .setLabel(
                                "What is your School's Name?"
                            )
                            .setStyle(
                                TextInputStyle.Short
                            )
                            .setRequired(true)
                            .setMaxLength(100)
                            .setPlaceholder(
                                "Example: Wyndmere Academy"
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

                // ==================================================
                // SUBMIT ENROLMENT
                // ==================================================

                if (
                    interaction.customId ===
                    "submit_enrolment"
                ) {

                    const enrolment =
                        enrolments.get(
                            interaction.user.id
                        );

                    if (!enrolment) {
                        return interaction.reply({
                            content:
                                "Your enrolment session has expired. Please run `/enrolschool` again.",
                            ephemeral: true
                        });
                    }

                    await interaction.deferReply({
                        ephemeral: true
                    });

                    try {

                        const guild =
                            await client.guilds.fetch(
                                enrolment.guildId
                            );

                        const guildConfig =
                            getGuildConfig(
                                guild.id
                            );

                        const staffRole =
                            guild.roles.cache.get(
                                guildConfig.enrolStaffRoleId
                            );

                        if (!staffRole) {
                            return interaction.editReply(
                                "The configured enrolment staff role no longer exists."
                            );
                        }

                        // ------------------------------------------
                        // CHANNEL NAME
                        // ------------------------------------------

                        let channelName =
                            enrolment.answers
                                .schoolName
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
                                    65
                                );

                        if (!channelName) {
                            channelName =
                                `school-${interaction.user.username}`;
                        }

                        channelName =
                            `enrol-${channelName}`;

                        let finalName =
                            channelName;

                        let counter = 2;

                        while (
                            guild.channels.cache.find(
                                channel =>
                                    channel.name ===
                                    finalName
                            )
                        ) {

                            finalName =
                                `${channelName}-${counter}`;

                            counter++;
                        }

                        // ------------------------------------------
                        // CATEGORY
                        // ------------------------------------------

                        let parentId = null;

                        if (
                            guildConfig.enrolReviewCategoryId
                        ) {

                            const category =
                                guild.channels.cache.get(
                                    guildConfig.enrolReviewCategoryId
                                );

                            if (
                                category &&
                                category.type ===
                                    ChannelType.GuildCategory
                            ) {
                                parentId =
                                    category.id;
                            }
                        }

                        // ------------------------------------------
                        // PERMISSIONS
                        //
                        // IMPORTANT:
                        // Applicant is deliberately NOT added.
                        // ------------------------------------------

                        const overwrites = [

                            {
                                id:
                                    guild.roles.everyone.id,
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
                                    PermissionFlagsBits.ManageChannels,
                                    PermissionFlagsBits.ManageMessages
                                ]
                            }
                        ];

                        const reviewChannel =
                            await guild.channels.create({
                                name:
                                    finalName,
                                type:
                                    ChannelType.GuildText,
                                parent:
                                    parentId,
                                permissionOverwrites:
                                    overwrites,
                                topic:
                                    `RSA school enrolment submitted by ${interaction.user.tag}`
                            });

                        // ------------------------------------------
                        // REVIEW EMBED
                        // ------------------------------------------

                        const answers =
                            enrolment.answers;

                        const reviewEmbed =
                            createEmbed(
                                "New School Enrolment",
                                `A new school enrolment has been submitted by **${interaction.user.tag}**.`
                            )
                            .addFields(

                                {
                                    name:
                                        "School Name",
                                    value:
                                        answers.schoolName
                                },

                                {
                                    name:
                                        "School Description",
                                    value:
                                        answers.schoolDescription
                                },

                                {
                                    name:
                                        "Discord Server Invite",
                                    value:
                                        answers.schoolInvite
                                },

                                {
                                    name:
                                        "Roblox Group",
                                    value:
                                        answers.robloxGroup
                                },

                                {
                                    name:
                                        "Applicant's Role",
                                    value:
                                        answers.schoolRole
                                },

                                {
                                    name:
                                        "Why should this school be enrolled?",
                                    value:
                                        answers.reason
                                },

                                {
                                    name:
                                        "Applicant",
                                    value:
                                        `${interaction.user.tag}\n${interaction.user.id}`
                                }

                            );

                        const buttons =
                            new ActionRowBuilder()
                                .addComponents(

                                    new ButtonBuilder()
                                        .setCustomId(
                                            `enrol_approve_${interaction.user.id}`
                                        )
                                        .setLabel(
                                            "Approve"
                                        )
                                        .setStyle(
                                            ButtonStyle.Success
                                        ),

                                    new ButtonBuilder()
                                        .setCustomId(
                                            `enrol_deny_${interaction.user.id}`
                                        )
                                        .setLabel(
                                            "Deny"
                                        )
                                        .setStyle(
                                            ButtonStyle.Danger
                                        ),

                                    new ButtonBuilder()
                                        .setCustomId(
                                            `enrol_changes_${interaction.user.id}`
                                        )
                                        .setLabel(
                                            "Request Changes"
                                        )
                                        .setStyle(
                                            ButtonStyle.Secondary
                                        )

                                );

                        await reviewChannel.send({
                            content:
                                `${staffRole} — a new school enrolment is awaiting review.`,
                            embeds: [
                                reviewEmbed
                            ],
                            components: [
                                buttons
                            ]
                        });

                        enrolments.delete(
                            interaction.user.id
                        );

                        return interaction.editReply(
                            `Your school enrolment has been submitted successfully.\n\nYour application is now being reviewed by RSA staff.`
                        );

                    } catch (error) {

                        console.error(
                            "ENROLMENT SUBMISSION ERROR:",
                            error
                        );

                        return interaction.editReply(
                            "Something went wrong while creating the review channel. Please contact RSA staff."
                        );
                    }
                }

                // ==================================================
                // CANCEL ENROLMENT
                // ==================================================

                if (
                    interaction.customId ===
                    "cancel_enrolment"
                ) {

                    enrolments.delete(
                        interaction.user.id
                    );

                    return interaction.update({
                        content:
                            "Your enrolment has been cancelled.",
                        embeds: [],
                        components: []
                    });
                }

                // ==================================================
                // APPROVE
                // ==================================================

                if (
                    interaction.customId
                        .startsWith(
                            "enrol_approve_"
                        )
                ) {

                    if (
                        !isStaff(
                            interaction.member
                        )
                    ) {
                        return interaction.reply({
                            content:
                                "You do not have permission to review enrolments.",
                            ephemeral: true
                        });
                    }

                    await interaction.deferReply({
                        ephemeral: true
                    });

                    const applicantId =
                        interaction.customId
                            .replace(
                                "enrol_approve_",
                                ""
                            );

                    const applicant =
                        await interaction.guild
                            .members
                            .fetch(
                                applicantId
                            )
                            .catch(
                                () => null
                            );

                    const guildConfig =
                        getGuildConfig(
                            interaction.guild.id
                        );

                    if (
                        guildConfig.enrolApprovedRoleId
                    ) {

                        const approvedRole =
                            interaction.guild.roles.cache.get(
                                guildConfig.enrolApprovedRoleId
                            );

                        if (
                            approvedRole &&
                            applicant
                        ) {
                            await applicant.roles.add(
                                approvedRole
                            );
                        }
                    }

                    await interaction.channel.send({
                        embeds: [
                            createEmbed(
                                "Enrolment Approved",
                                `This school enrolment has been **approved** by ${interaction.user}.`
                            )
                        ]
                    });

                    if (applicant) {

                        await applicant.user.send(
                            `Your school enrolment in **${interaction.guild.name}** has been **approved** by RSA staff.`
                        ).catch(
                            () => {}
                        );
                    }

                    return interaction.editReply(
                        "The enrolment has been approved."
                    );
                }

                // ==================================================
                // DENY
                // ==================================================

                if (
                    interaction.customId
                        .startsWith(
                            "enrol_deny_"
                        )
                ) {

                    if (
                        !isStaff(
                            interaction.member
                        )
                    ) {
                        return interaction.reply({
                            content:
                                "You do not have permission to review enrolments.",
                            ephemeral: true
                        });
                    }

                    const applicantId =
                        interaction.customId
                            .replace(
                                "enrol_deny_",
                                ""
                            );

                    const modal =
                        new ModalBuilder()
                            .setCustomId(
                                `enrol_deny_modal_${applicantId}`
                            )
                            .setTitle(
                                "Deny Enrolment"
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

                // ==================================================
                // REQUEST CHANGES
                // ==================================================

                if (
                    interaction.customId
                        .startsWith(
                            "enrol_changes_"
                        )
                ) {

                    if (
                        !isStaff(
                            interaction.member
                        )
                    ) {
                        return interaction.reply({
                            content:
                                "You do not have permission to review enrolments.",
                            ephemeral: true
                        });
                    }

                    const applicantId =
                        interaction.customId
                            .replace(
                                "enrol_changes_",
                                ""
                            );

                    const modal =
                        new ModalBuilder()
                            .setCustomId(
                                `enrol_changes_modal_${applicantId}`
                            )
                            .setTitle(
                                "Request Changes"
                            );

                    const reason =
                        new TextInputBuilder()
                            .setCustomId(
                                "changes_reason"
                            )
                            .setLabel(
                                "What needs to be changed?"
                            )
                            .setStyle(
                                TextInputStyle.Paragraph
                            )
                            .setRequired(true)
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

                // ==================================================
                // CREATE TICKET
                // ==================================================

                if (
                    interaction.customId ===
                    "create_ticket"
                ) {

                    await interaction.deferReply({
                        ephemeral: true
                    });

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

                    if (!staffRole) {
                        return interaction.editReply(
                            "The ticket system has not been configured correctly. Please ask an administrator to use `/ticketconfig`."
                        );
                    }

                    const existing =
                        interaction.guild.channels.cache.find(
                            channel =>
                                channel.topic ===
                                `RSA Ticket | ${interaction.user.id}`
                        );

                    if (existing) {
                        return interaction.editReply(
                            `You already have an open ticket: ${existing}`
                        );
                    }

                    let ticketName =
                        `ticket-${interaction.user.username}`
                            .toLowerCase()
                            .replace(
                                /[^a-z0-9-]/g,
                                ""
                            )
                            .substring(
                                0,
                                70
                            );

                    if (!ticketName) {
                        ticketName =
                            `ticket-${interaction.user.id}`;
                    }

                    const permissionOverwrites = [

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
                                PermissionFlagsBits.ManageChannels,
                                PermissionFlagsBits.ManageMessages
                            ]
                        }

                    ];

                    let parentId = null;

                    if (
                        guildConfig.ticketCategoryId
                    ) {

                        const category =
                            interaction.guild.channels.cache.get(
                                guildConfig.ticketCategoryId
                            );

                        if (
                            category &&
                            category.type ===
                                ChannelType.GuildCategory
                        ) {
                            parentId =
                                category.id;
                        }
                    }

                    const channel =
                        await interaction.guild.channels.create({
                            name:
                                ticketName,
                            type:
                                ChannelType.GuildText,
                            parent:
                                parentId,
                            topic:
                                `RSA Ticket | ${interaction.user.id}`,
                            permissionOverwrites
                        });

                    ticketOwners.set(
                        channel.id,
                        interaction.user.id
                    );

                    const closeRow =
                        new ActionRowBuilder()
                            .addComponents(
                                new ButtonBuilder()
                                    .setCustomId(
                                        "close_ticket"
                                    )
                                    .setLabel(
                                        "Close Ticket"
                                    )
                                    .setStyle(
                                        ButtonStyle.Danger
                                    )
                            );

                    await channel.send({
                        content:
                            `${interaction.user} ${staffRole}`,
                        embeds: [
                            createEmbed(
                                "Support Ticket",
                                `Welcome to your support ticket.\n\nPlease explain what you need help with. A member of the RSA team will assist you as soon as possible.`
                            )
                        ],
                        components: [
                            closeRow
                        ]
                    });

                    return interaction.editReply(
                        `Your ticket has been created: ${channel}`
                    );
                }

                // ==================================================
                // CLOSE TICKET
                // ==================================================

                if (
                    interaction.customId ===
                    "close_ticket"
                ) {

                    const ownerId =
                        ticketOwners.get(
                            interaction.channel.id
                        );

                    const staff =
                        isStaff(
                            interaction.member
                        );

                    if (
                        interaction.user.id !==
                            ownerId &&
                        !staff
                    ) {
                        return interaction.reply({
                            content:
                                "You cannot close this ticket.",
                            ephemeral: true
                        });
                    }

                    await interaction.reply({
                        embeds: [
                            createEmbed(
                                "Ticket Closing",
                                "This ticket will be deleted in **5 seconds**."
                            )
                        ]
                    });

                    setTimeout(
                        async () => {

                            ticketOwners.delete(
                                interaction.channel.id
                            );

                            await interaction.channel
                                .delete()
                                .catch(
                                    () => {}
                                );

                        },
                        5000
                    );

                    return;
                }

                // ==================================================
                // TICKET CONFIG — STAFF ROLE
                // ==================================================

                if (
                    interaction.customId ===
                    "ticket_config_staff"
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

                    const roles =
                        interaction.guild.roles.cache
                            .filter(
                                role =>
                                    role.id !==
                                    interaction.guild.id
                            )
                            .sort(
                                (a, b) =>
                                    b.position -
                                    a.position
                            )
                            .first(25);

                    const options =
                        roles.map(
                            role => ({
                                label:
                                    role.name
                                        .substring(
                                            0,
                                            100
                                        ),
                                value:
                                    role.id
                            })
                        );

                    const menu =
                        new StringSelectMenuBuilder()
                            .setCustomId(
                                "ticket_select_staff"
                            )
                            .setPlaceholder(
                                "Select ticket staff role"
                            )
                            .addOptions(
                                options
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

                // ==================================================
                // TICKET CONFIG — CATEGORY
                // ==================================================

                if (
                    interaction.customId ===
                    "ticket_config_category"
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

                    const categories =
                        interaction.guild.channels.cache
                            .filter(
                                channel =>
                                    channel.type ===
                                    ChannelType.GuildCategory
                            )
                            .first(25);

                    if (
                        categories.length === 0
                    ) {
                        return interaction.reply({
                            content:
                                "There are no categories in this server.",
                            ephemeral: true
                        });
                    }

                    const options =
                        categories.map(
                            category => ({
                                label:
                                    category.name
                                        .substring(
                                            0,
                                            100
                                        ),
                                value:
                                    category.id
                            })
                        );

                    const menu =
                        new StringSelectMenuBuilder()
                            .setCustomId(
                                "ticket_select_category"
                            )
                            .setPlaceholder(
                                "Select ticket category"
                            )
                            .addOptions(
                                options
                            );

                    return interaction.reply({
                        content:
                            "Select the category where ticket channels should be created.",
                        components: [
                            new ActionRowBuilder()
                                .addComponents(
                                    menu
                                )
                        ],
                        ephemeral: true
                    });
                }

                // ==================================================
                // TICKET CONFIG — SEND
                // ==================================================

                if (
                    interaction.customId ===
                    "ticket_config_send"
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

                    const guildConfig =
                        getGuildConfig(
                            interaction.guild.id
                        );

                    if (
                        !guildConfig.ticketStaffRoleId
                    ) {
                        return interaction.reply({
                            content:
                                "Please configure the ticket staff role first.",
                            ephemeral: true
                        });
                    }

                    const panel =
                        createEmbed(
                            "Support Tickets",
                            "Need assistance from the RSA team?\n\nClick the button below to create a private support ticket."
                        );

                    const row =
                        new ActionRowBuilder()
                            .addComponents(
                                new ButtonBuilder()
                                    .setCustomId(
                                        "create_ticket"
                                    )
                                    .setLabel(
                                        "Create Ticket"
                                    )
                                    .setStyle(
                                        ButtonStyle.Primary
                                    )
                            );

                    await interaction.channel.send({
                        embeds: [
                            panel
                        ],
                        components: [
                            row
                        ]
                    });

                    return interaction.reply({
                        content:
                            "The ticket panel has been sent.",
                        ephemeral: true
                    });
                }

                // ==================================================
                // TICKET CONFIG — REFRESH
                // ==================================================

                if (
                    interaction.customId ===
                    "ticket_config_refresh"
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

                    const embed =
                        buildTicketConfigEmbed(
                            interaction.guild
                        );

                    return interaction.update({
                        embeds: [
                            embed
                        ]
                    });
                }

                // ==================================================
                // ENROL CONFIG — STAFF
                // ==================================================

                if (
                    interaction.customId ===
                    "enrol_config_staff"
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

                    const roles =
                        interaction.guild.roles.cache
                            .filter(
                                role =>
                                    role.id !==
                                    interaction.guild.id
                            )
                            .sort(
                                (a, b) =>
                                    b.position -
                                    a.position
                            )
                            .first(25);

                    const options =
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
                        );

                    const menu =
                        new StringSelectMenuBuilder()
                            .setCustomId(
                                "enrol_select_staff_role"
                            )
                            .setPlaceholder(
                                "Select enrolment staff role"
                            )
                            .addOptions(
                                options
                            );

                    return interaction.reply({
                        content:
                            "Select the role that should review school enrolments.",
                        components: [
                            new ActionRowBuilder()
                                .addComponents(
                                    menu
                                )
                        ],
                        ephemeral: true
                    });
                }

                // ==================================================
                // ENROL CONFIG — APPROVED
                // ==================================================

                if (
                    interaction.customId ===
                    "enrol_config_approved"
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

                    const roles =
                        interaction.guild.roles.cache
                            .filter(
                                role =>
                                    role.id !==
                                    interaction.guild.id
                            )
                            .sort(
                                (a, b) =>
                                    b.position -
                                    a.position
                            )
                            .first(25);

                    const options =
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
                        );

                    const menu =
                        new StringSelectMenuBuilder()
                            .setCustomId(
                                "enrol_select_approved_role"
                            )
                            .setPlaceholder(
                                "Select approved school role"
                            )
                            .addOptions(
                                options
                            );

                    return interaction.reply({
                        content:
                            "Select the role given to an approved school.",
                        components: [
                            new ActionRowBuilder()
                                .addComponents(
                                    menu
                                )
                        ],
                        ephemeral: true
                    });
                }

                // ==================================================
                // ENROL CONFIG — CATEGORY
                // ==================================================

                if (
                    interaction.customId ===
                    "enrol_config_category"
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

                    const categories =
                        interaction.guild.channels.cache
                            .filter(
                                channel =>
                                    channel.type ===
                                    ChannelType.GuildCategory
                            )
                            .first(25);

                    if (
                        categories.length === 0
                    ) {
                        return interaction.reply({
                            content:
                                "There are no categories in this server.",
                            ephemeral: true
                        });
                    }

                    const options =
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
                        );

                    const menu =
                        new StringSelectMenuBuilder()
                            .setCustomId(
                                "enrol_select_category"
                            )
                            .setPlaceholder(
                                "Select review channel category"
                            )
                            .addOptions(
                                options
                            );

                    return interaction.reply({
                        content:
                            "Select the category where automatic school review channels should be created.",
                        components: [
                            new ActionRowBuilder()
                                .addComponents(
                                    menu
                                )
                        ],
                        ephemeral: true
                    });
                }

                // ==================================================
                // ENROL CONFIG — REFRESH
                // ==================================================

                if (
                    interaction.customId ===
                    "enrol_config_refresh"
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

                    return interaction.update({
                        embeds: [
                            buildEnrolConfigEmbed(
                                interaction.guild
                            )
                        ]
                    });
                }
            }

            // ====================================================
            // STRING SELECT MENUS
            // ====================================================

            if (
                interaction.isStringSelectMenu()
            ) {

                // ==================================================
                // TICKET STAFF
                // ==================================================

                if (
                    interaction.customId ===
                    "ticket_select_staff"
                ) {

                    const roleId =
                        interaction.values[0];

                    const guildConfig =
                        getGuildConfig(
                            interaction.guild.id
                        );

                    guildConfig.ticketStaffRoleId =
                        roleId;

                    saveJSON(
                        configFile,
                        config
                    );

                    const role =
                        interaction.guild.roles.cache.get(
                            roleId
                        );

                    return interaction.update({
                        content:
                            `Ticket staff role set to ${role}.`,
                        components: []
                    });
                }

                // ==================================================
                // TICKET CATEGORY
                // ==================================================

                if (
                    interaction.customId ===
                    "ticket_select_category"
                ) {

                    const categoryId =
                        interaction.values[0];

                    const guildConfig =
                        getGuildConfig(
                            interaction.guild.id
                        );

                    guildConfig.ticketCategoryId =
                        categoryId;

                    saveJSON(
                        configFile,
                        config
                    );

                    const category =
                        interaction.guild.channels.cache.get(
                            categoryId
                        );

                    return interaction.update({
                        content:
                            `Ticket category set to ${category}.`,
                        components: []
                    });
                }

                // ==================================================
                // ENROL STAFF
                // ==================================================

                if (
                    interaction.customId ===
                    "enrol_select_staff_role"
                ) {

                    const roleId =
                        interaction.values[0];

                    const guildConfig =
                        getGuildConfig(
                            interaction.guild.id
                        );

                    guildConfig.enrolStaffRoleId =
                        roleId;

                    saveJSON(
                        configFile,
                        config
                    );

                    const role =
                        interaction.guild.roles.cache.get(
                            roleId
                        );

                    return interaction.update({
                        content:
                            `Enrolment staff role set to ${role}.`,
                        components: []
                    });
                }

                // ==================================================
                // ENROL APPROVED ROLE
                // ==================================================

                if (
                    interaction.customId ===
                    "enrol_select_approved_role"
                ) {

                    const roleId =
                        interaction.values[0];

                    const guildConfig =
                        getGuildConfig(
                            interaction.guild.id
                        );

                    guildConfig.enrolApprovedRoleId =
                        roleId;

                    saveJSON(
                        configFile,
                        config
                    );

                    const role =
                        interaction.guild.roles.cache.get(
                            roleId
                        );

                    return interaction.update({
                        content:
                            `Approved school role set to ${role}.`,
                        components: []
                    });
                }

                // ==================================================
                // ENROL CATEGORY
                // ==================================================

                if (
                    interaction.customId ===
                    "enrol_select_category"
                ) {

                    const categoryId =
                        interaction.values[0];

                    const guildConfig =
                        getGuildConfig(
                            interaction.guild.id
                        );

                    guildConfig.enrolReviewCategoryId =
                        categoryId;

                    saveJSON(
                        configFile,
                        config
                    );

                    const category =
                        interaction.guild.channels.cache.get(
                            categoryId
                        );

                    return interaction.update({
                        content:
                            `Enrolment review category set to ${category}.`,
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
                // QUESTION 1
                // ==================================================

                if (
                    interaction.customId ===
                    "enrol_question_1"
                ) {

                    const enrolment =
                        enrolments.get(
                            interaction.user.id
                        );

                    if (!enrolment) {
                        return interaction.reply({
                            content:
                                "Your enrolment session has expired. Please run `/enrolschool` again.",
                            ephemeral: true
                        });
                    }

                    enrolment.answers.schoolName =
                        interaction.fields.getTextInputValue(
                            "school_name"
                        );

                    enrolment.step = 2;

                    const modal =
                        new ModalBuilder()
                            .setCustomId(
                                "enrol_question_2"
                            )
                            .setTitle(
                                "School Enrolment — 2/6"
                            );

                    const input =
                        new TextInputBuilder()
                            .setCustomId(
                                "school_description"
                            )
                            .setLabel(
                                "Describe your school"
                            )
                            .setStyle(
                                TextInputStyle.Paragraph
                            )
                            .setRequired(true)
                            .setMaxLength(
                                1000
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

                // ==================================================
                // QUESTION 2
                // ==================================================

                if (
                    interaction.customId ===
                    "enrol_question_2"
                ) {

                    const enrolment =
                        enrolments.get(
                            interaction.user.id
                        );

                    if (!enrolment) {
                        return interaction.reply({
                            content:
                                "Your enrolment session has expired.",
                            ephemeral: true
                        });
                    }

                    enrolment.answers.schoolDescription =
                        interaction.fields.getTextInputValue(
                            "school_description"
                        );

                    enrolment.step = 3;

                    const modal =
                        new ModalBuilder()
                            .setCustomId(
                                "enrol_question_3"
                            )
                            .setTitle(
                                "School Enrolment — 3/6"
                            );

                    const input =
                        new TextInputBuilder()
                            .setCustomId(
                                "school_invite"
                            )
                            .setLabel(
                                "School Discord Server Invite"
                            )
                            .setStyle(
                                TextInputStyle.Short
                            )
                            .setRequired(true)
                            .setMaxLength(
                                200
                            )
                            .setPlaceholder(
                                "https://discord.gg/example"
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

                // ==================================================
                // QUESTION 3
                // ==================================================

                if (
                    interaction.customId ===
                    "enrol_question_3"
                ) {

                    const enrolment =
                        enrolments.get(
                            interaction.user.id
                        );

                    if (!enrolment) {
                        return interaction.reply({
                            content:
                                "Your enrolment session has expired.",
                            ephemeral: true
                        });
                    }

                    enrolment.answers.schoolInvite =
                        interaction.fields.getTextInputValue(
                            "school_invite"
                        );

                    enrolment.step = 4;

                    const modal =
                        new ModalBuilder()
                            .setCustomId(
                                "enrol_question_4"
                            )
                            .setTitle(
                                "School Enrolment — 4/6"
                            );

                    const input =
                        new TextInputBuilder()
                            .setCustomId(
                                "roblox_group"
                            )
                            .setLabel(
                                "Roblox School Group Link"
                            )
                            .setStyle(
                                TextInputStyle.Short
                            )
                            .setRequired(true)
                            .setMaxLength(
                                300
                            )
                            .setPlaceholder(
                                "https://www.roblox.com/communities/..."
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

                // ==================================================
                // QUESTION 4
                // ==================================================

                if (
                    interaction.customId ===
                    "enrol_question_4"
                ) {

                    const enrolment =
                        enrolments.get(
                            interaction.user.id
                        );

                    if (!enrolment) {
                        return interaction.reply({
                            content:
                                "Your enrolment session has expired.",
                            ephemeral: true
                        });
                    }

                    enrolment.answers.robloxGroup =
                        interaction.fields.getTextInputValue(
                            "roblox_group"
                        );

                    enrolment.step = 5;

                    const modal =
                        new ModalBuilder()
                            .setCustomId(
                                "enrol_question_5"
                            )
                            .setTitle(
                                "School Enrolment — 5/6"
                            );

                    const input =
                        new TextInputBuilder()
                            .setCustomId(
                                "school_role"
                            )
                            .setLabel(
                                "What is your role at the school?"
                            )
                            .setStyle(
                                TextInputStyle.Short
                            )
                            .setRequired(true)
                            .setMaxLength(
                                100
                            )
                            .setPlaceholder(
                                "Founder, Owner, Headteacher..."
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

                // ==================================================
                // QUESTION 5
                // ==================================================

                if (
                    interaction.customId ===
                    "enrol_question_5"
                ) {

                    const enrolment =
                        enrolments.get(
                            interaction.user.id
                        );

                    if (!enrolment) {
                        return interaction.reply({
                            content:
                                "Your enrolment session has expired.",
                            ephemeral: true
                        });
                    }

                    enrolment.answers.schoolRole =
                        interaction.fields.getTextInputValue(
                            "school_role"
                        );

                    enrolment.step = 6;

                    const modal =
                        new ModalBuilder()
                            .setCustomId(
                                "enrol_question_6"
                            )
                            .setTitle(
                                "School Enrolment — 6/6"
                            );

                    const input =
                        new TextInputBuilder()
                            .setCustomId(
                                "school_reason"
                            )
                            .setLabel(
                                "Why should RSA enrol your school?"
                            )
                            .setStyle(
                                TextInputStyle.Paragraph
                            )
                            .setRequired(true)
                            .setMaxLength(
                                1000
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

                // ==================================================
                // QUESTION 6
                // ==================================================

                if (
                    interaction.customId ===
                    "enrol_question_6"
                ) {

                    const enrolment =
                        enrolments.get(
                            interaction.user.id
                        );

                    if (!enrolment) {
                        return interaction.reply({
                            content:
                                "Your enrolment session has expired.",
                            ephemeral: true
                        });
                    }

                    enrolment.answers.reason =
                        interaction.fields.getTextInputValue(
                            "school_reason"
                        );

                    enrolment.step = 7;

                    const answers =
                        enrolment.answers;

                    const preview =
                        createEmbed(
                            "Review Your Enrolment",
                            "Your questionnaire is complete. Please check your answers below before submitting."
                        )
                        .addFields(

                            {
                                name:
                                    "School Name",
                                value:
                                    answers.schoolName
                            },

                            {
                                name:
                                    "School Description",
                                value:
                                    answers.schoolDescription
                            },

                            {
                                name:
                                    "Discord Server Invite",
                                value:
                                    answers.schoolInvite
                            },

                            {
                                name:
                                    "Roblox Group",
                                value:
                                    answers.robloxGroup
                            },

                            {
                                name:
                                    "Your Role",
                                value:
                                    answers.schoolRole
                            },

                            {
                                name:
                                    "Why should RSA enrol your school?",
                                value:
                                    answers.reason
                            }

                        );

                    const row =
                        new ActionRowBuilder()
                            .addComponents(

                                new ButtonBuilder()
                                    .setCustomId(
                                        "submit_enrolment"
                                    )
                                    .setLabel(
                                        "Submit Enrolment"
                                    )
                                    .setStyle(
                                        ButtonStyle.Success
                                    ),

                                new ButtonBuilder()
                                    .setCustomId(
                                        "cancel_enrolment"
                                    )
                                    .setLabel(
                                        "Cancel"
                                    )
                                    .setStyle(
                                        ButtonStyle.Danger
                                    )

                            );

                    return interaction.reply({
                        embeds: [
                            preview
                        ],
                        components: [
                            row
                        ],
                        ephemeral: true
                    });
                }

                // ==================================================
                // DENIAL MODAL
                // ==================================================

                if (
                    interaction.customId
                        .startsWith(
                            "enrol_deny_modal_"
                        )
                ) {

                    if (
                        !isStaff(
                            interaction.member
                        )
                    ) {
                        return interaction.reply({
                            content:
                                "You do not have permission to do this.",
                            ephemeral: true
                        });
                    }

                    const applicantId =
                        interaction.customId
                            .replace(
                                "enrol_deny_modal_",
                                ""
                            );

                    const reason =
                        interaction.fields.getTextInputValue(
                            "deny_reason"
                        );

                    const applicant =
                        await interaction.guild
                            .members
                            .fetch(
                                applicantId
                            )
                            .catch(
                                () => null
                            );

                    await interaction.channel.send({
                        embeds: [
                            createEmbed(
                                "Enrolment Denied",
                                `This enrolment has been **denied** by ${interaction.user}.\n\n**Reason:** ${reason}`
                            )
                        ]
                    });

                    if (applicant) {
                        await applicant.user.send(
                            `Your school enrolment in **${interaction.guild.name}** has been denied.\n\n**Reason:** ${reason}`
                        ).catch(
                            () => {}
                        );
                    }

                    return interaction.reply({
                        content:
                            "The enrolment has been denied.",
                        ephemeral: true
                    });
                }

                // ==================================================
                // CHANGES MODAL
                // ==================================================

                if (
                    interaction.customId
                        .startsWith(
                            "enrol_changes_modal_"
                        )
                ) {

                    if (
                        !isStaff(
                            interaction.member
                        )
                    ) {
                        return interaction.reply({
                            content:
                                "You do not have permission to do this.",
                            ephemeral: true
                        });
                    }

                    const applicantId =
                        interaction.customId
                            .replace(
                                "enrol_changes_modal_",
                                ""
                            );

                    const reason =
                        interaction.fields.getTextInputValue(
                            "changes_reason"
                        );

                    const applicant =
                        await interaction.guild
                            .members
                            .fetch(
                                applicantId
                            )
                            .catch(
                                () => null
                            );

                    await interaction.channel.send({
                        embeds: [
                            createEmbed(
                                "Changes Requested",
                                `Changes have been requested by ${interaction.user}.\n\n**Changes required:** ${reason}`
                            )
                        ]
                    });

                    if (applicant) {
                        await applicant.user.send(
                            `RSA staff have requested changes to your school enrolment in **${interaction.guild.name}**.\n\n**Changes required:** ${reason}`
                        ).catch(
                            () => {}
                        );
                    }

                    return interaction.reply({
                        content:
                            "The applicant has been notified.",
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
                            "An unexpected error occurred while processing that action.",
                        ephemeral: true
                    });

                } else {

                    await interaction.reply({
                        content:
                            "An unexpected error occurred while processing that action.",
                        ephemeral: true
                    });
                }

            } catch (
                replyError
            ) {

                console.error(
                    "Could not send error response:",
                    replyError
                );
            }
        }
    }
);

// ============================================================
// TICKET CONFIG PANEL
// ============================================================

function buildTicketConfigEmbed(
    guild
) {

    const guildConfig =
        getGuildConfig(
            guild.id
        );

    const staffRole =
        guildConfig.ticketStaffRoleId
            ? guild.roles.cache.get(
                guildConfig.ticketStaffRoleId
            )
            : null;

    const category =
        guildConfig.ticketCategoryId
            ? guild.channels.cache.get(
                guildConfig.ticketCategoryId
            )
            : null;

    return createEmbed(
        "Ticket Configuration",
        "Configure the RSA Utility ticket system using the buttons below.\n\n" +
        "Once configured, use **Send Ticket Panel** to send the public ticket panel into the channel where you are using the button."
    )
    .addFields(

        {
            name:
                "Ticket Staff Role",
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
                "Ticket Channels",
            value:
                "Automatically created when a user opens a ticket.",
            inline: false
        }

    );
}

async function sendTicketConfigPanel(
    interaction
) {

    const embed =
        buildTicketConfigEmbed(
            interaction.guild
        );

    const row =
        new ActionRowBuilder()
            .addComponents(

                new ButtonBuilder()
                    .setCustomId(
                        "ticket_config_staff"
                    )
                    .setLabel(
                        "Set Staff Role"
                    )
                    .setStyle(
                        ButtonStyle.Primary
                    ),

                new ButtonBuilder()
                    .setCustomId(
                        "ticket_config_category"
                    )
                    .setLabel(
                        "Set Category"
                    )
                    .setStyle(
                        ButtonStyle.Secondary
                    ),

                new ButtonBuilder()
                    .setCustomId(
                        "ticket_config_send"
                    )
                    .setLabel(
                        "Send Ticket Panel"
                    )
                    .setStyle(
                        ButtonStyle.Success
                    ),

                new ButtonBuilder()
                    .setCustomId(
                        "ticket_config_refresh"
                    )
                    .setLabel(
                        "Refresh"
                    )
                    .setStyle(
                        ButtonStyle.Secondary
                    )

            );

    return interaction.reply({
        embeds: [
            embed
        ],
        components: [
            row
        ],
        ephemeral: true
    });
}

// ============================================================
// ENROL CONFIG PANEL
// ============================================================

function buildEnrolConfigEmbed(
    guild
) {

    const guildConfig =
        getGuildConfig(
            guild.id
        );

    const staffRole =
        guildConfig.enrolStaffRoleId
            ? guild.roles.cache.get(
                guildConfig.enrolStaffRoleId
            )
            : null;

    const approvedRole =
        guildConfig.enrolApprovedRoleId
            ? guild.roles.cache.get(
                guildConfig.enrolApprovedRoleId
            )
            : null;

    const category =
        guildConfig.enrolReviewCategoryId
            ? guild.channels.cache.get(
                guildConfig.enrolReviewCategoryId
            )
            : null;

    return createEmbed(
        "School Enrolment Configuration",
        "Configure the RSA school enrolment system below.\n\n" +
        "Review channels are created **automatically** after an applicant submits their questionnaire. The applicant is **not given access** to the review channel."
    )
    .addFields(

        {
            name:
                "Staff Review Role",
            value:
                staffRole
                    ? `${staffRole}`
                    : "Not configured",
            inline: true
        },

        {
            name:
                "Approved School Role",
            value:
                approvedRole
                    ? `${approvedRole}`
                    : "Not configured",
            inline: true
        },

        {
            name:
                "Review Channel Category",
            value:
                category
                    ? `${category}`
                    : "Not configured",
            inline: true
        },

        {
            name:
                "Review Channels",
            value:
                "Automatically created",
            inline: false
        }

    );
}

async function sendEnrolConfigPanel(
    interaction
) {

    const embed =
        buildEnrolConfigEmbed(
            interaction.guild
        );

    const row =
        new ActionRowBuilder()
            .addComponents(

                new ButtonBuilder()
                    .setCustomId(
                        "enrol_config_staff"
                    )
                    .setLabel(
                        "Set Staff Role"
                    )
                    .setStyle(
                        ButtonStyle.Primary
                    ),

                new ButtonBuilder()
                    .setCustomId(
                        "enrol_config_approved"
                    )
                    .setLabel(
                        "Set Approved Role"
                    )
                    .setStyle(
                        ButtonStyle.Secondary
                    ),

                new ButtonBuilder()
                    .setCustomId(
                        "enrol_config_category"
                    )
                    .setLabel(
                        "Set Review Category"
                    )
                    .setStyle(
                        ButtonStyle.Primary
                    ),

                new ButtonBuilder()
                    .setCustomId(
                        "enrol_config_refresh"
                    )
                    .setLabel(
                        "Refresh"
                    )
                    .setStyle(
                        ButtonStyle.Success
                    )

            );

    return interaction.reply({
        embeds: [
            embed
        ],
        components: [
            row
        ],
        ephemeral: true
    });
}

// ============================================================
// CLEAN OLD ENROLMENTS
// ============================================================

setInterval(
    () => {

        const now =
            Date.now();

        for (
            const [
                userId,
                enrolment
            ] of enrolments.entries()
        ) {

            if (
                now -
                    enrolment.createdAt >
                60 * 60 * 1000
            ) {

                enrolments.delete(
                    userId
                );
            }
        }

    },
    10 * 60 * 1000
);

// ============================================================
// LOGIN
// ============================================================

client.login(
    TOKEN
);
