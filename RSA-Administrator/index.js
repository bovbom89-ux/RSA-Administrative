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

const EMBED_COLOUR = "#2F4DA8";
const LOGO = "<:Our_Logo:1557149633623363594>";

if (!TOKEN || !CLIENT_ID || !GUILD_ID) {
    console.error("Missing DISCORD_TOKEN, CLIENT_ID or GUILD_ID in .env");
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
    partials: [
        Partials.Channel,
        Partials.Message,
        Partials.User,
    ],
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
            fs.writeFileSync(file, JSON.stringify(fallback, null, 2));
            return fallback;
        }

        return JSON.parse(fs.readFileSync(file, "utf8"));
    } catch (error) {
        console.error(`Could not load ${file}:`, error);
        return fallback;
    }
}

function saveJSON(file, data) {
    try {
        fs.writeFileSync(file, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error(`Could not save ${file}:`, error);
    }
}

let warnings = loadJSON(warningsFile, {});
let config = loadJSON(configFile, {});

// ============================================================
// ENROLMENT STORAGE
// ============================================================

const enrolments = new Map();

// ============================================================
// EMBED HELPER
// ============================================================

function createEmbed(title, description = null) {
    const embed = new EmbedBuilder()
        .setTitle(`${LOGO} ${title}`)
        .setColor(EMBED_COLOUR)
        .setTimestamp();

    if (description) {
        embed.setDescription(description);
    }

    return embed;
}

// ============================================================
// PERMISSION HELPERS
// ============================================================

function isStaff(member) {
    if (!member) return false;

    if (
        member.permissions.has(
            PermissionFlagsBits.Administrator
        )
    ) {
        return true;
    }

    const guildConfig = config[member.guild.id];

    if (!guildConfig?.enrolStaffRoleId) {
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
// SLASH COMMANDS
// ============================================================

const commands = [

    // BASIC
    new SlashCommandBuilder()
        .setName("help")
        .setDescription("Shows the bot's commands"),

    new SlashCommandBuilder()
        .setName("ping")
        .setDescription("Checks the bot's latency"),

    new SlashCommandBuilder()
        .setName("botinfo")
        .setDescription("Shows information about the bot"),

    new SlashCommandBuilder()
        .setName("serverinfo")
        .setDescription("Shows information about the server"),

    new SlashCommandBuilder()
        .setName("userinfo")
        .setDescription("Shows information about a user")
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription("The user to view")
                .setRequired(false)
        ),

    new SlashCommandBuilder()
        .setName("profile")
        .setDescription("Shows your profile"),

    // MODERATION
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
                .setDescription("Timeout duration in minutes")
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
        .setDescription("Removes a member's timeout")
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
                .setDescription("Number of messages")
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(100)
        ),

    // MANAGEMENT
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
        .setDescription("Adds or removes a role")
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
        .setDescription("Sends an announcement")
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
        .setDescription("Creates an embed")
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
        ),

    // TICKETS
    new SlashCommandBuilder()
        .setName("ticketsetup")
        .setDescription("Creates the ticket panel")
        .setDefaultMemberPermissions(
            PermissionFlagsBits.ManageGuild
        ),

    new SlashCommandBuilder()
        .setName("ticketconfig")
        .setDescription("Configures the ticket system")
        .setDefaultMemberPermissions(
            PermissionFlagsBits.ManageGuild
        ),

    // ENROLMENT
    new SlashCommandBuilder()
        .setName("enrolschool")
        .setDescription("Start a school enrolment"),

    new SlashCommandBuilder()
        .setName("enrolconfig")
        .setDescription("Configure the school enrolment system")
        .setDefaultMemberPermissions(
            PermissionFlagsBits.ManageGuild
        ),

].map(command => command.toJSON());

// ============================================================
// REGISTER COMMANDS
// ============================================================

async function registerCommands() {
    try {
        const rest = new REST({
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
        "school enrolments",
        {
            type: 3
        }
    );
});

// ============================================================
// HELP
// ============================================================

function helpEmbed() {

    return createEmbed(
        "Bot Commands",
        "Here are the commands available in this server."
    ).addFields(
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
                "`/ticketsetup`\n" +
                "`/ticketconfig`"
        },
        {
            name: "School Enrolment",
            value:
                "`/enrolschool` — Start a school enrolment\n" +
                "`/enrolconfig` — Configure enrolment"
        }
    );
}

// ============================================================
// ENROLMENT CONFIG PANEL
// ============================================================

function buildEnrolConfigPanel(guild) {

    const guildConfig =
        config[guild.id] || {};

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

    const embed = createEmbed(
        "School Enrolment Configuration",
        "Use the buttons below to configure the school enrolment system."
    );

    embed.addFields(
        {
            name: "Staff Review Role",
            value: staffRole
                ? `${staffRole}`
                : "Not configured",
            inline: true
        },
        {
            name: "Approved Role",
            value: approvedRole
                ? `${approvedRole}`
                : "Not configured",
            inline: true
        },
        {
            name: "Review Channel Category",
            value: category
                ? `${category}`
                : "Not configured",
            inline: false
        },
        {
            name: "Review Channels",
            value:
                "Automatically created after submission.",
            inline: false
        },
        {
            name: "Applicant Access",
            value:
                "Applicants are NOT given access to review channels.",
            inline: false
        }
    );

    const row1 =
        new ActionRowBuilder().addComponents(

            new ButtonBuilder()
                .setCustomId(
                    "enrol_config_staff"
                )
                .setLabel("Staff Review Role")
                .setStyle(ButtonStyle.Primary),

            new ButtonBuilder()
                .setCustomId(
                    "enrol_config_approved"
                )
                .setLabel("Approved Role")
                .setStyle(ButtonStyle.Secondary),

            new ButtonBuilder()
                .setCustomId(
                    "enrol_config_category"
                )
                .setLabel("Review Category")
                .setStyle(ButtonStyle.Primary)
        );

    const row2 =
        new ActionRowBuilder().addComponents(

            new ButtonBuilder()
                .setCustomId(
                    "enrol_config_refresh"
                )
                .setLabel("Refresh")
                .setStyle(ButtonStyle.Success)
        );

    return {
        embeds: [embed],
        components: [row1, row2]
    };
}

// ============================================================
// ROLE SELECT MENU
// ============================================================

function createRoleMenu(customId, placeholder) {

    const roles = [...client.guilds.cache]
        .length;

    return {
        roles
    };
}

// ============================================================
// CATEGORY MENU
// ============================================================

function buildCategoryMenu(guild) {

    const categories =
        guild.channels.cache
            .filter(
                channel =>
                    channel.type ===
                    ChannelType.GuildCategory
            )
            .sort(
                (a, b) =>
                    a.position - b.position
            )
            .first(25);

    const options = categories.map(
        category => ({
            label: category.name.substring(
                0,
                100
            ),
            value: category.id
        })
    );

    return new StringSelectMenuBuilder()
        .setCustomId(
            "enrol_select_category"
        )
        .setPlaceholder(
            "Select the review channel category"
        )
        .addOptions(options);
}

// ============================================================
// INTERACTION HANDLER
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

                // ==============================================
                // HELP
                // ==============================================

                if (command === "help") {

                    return interaction.reply({
                        embeds: [
                            helpEmbed()
                        ],
                        ephemeral: true
                    });
                }

                // ==============================================
                // PING
                // ==============================================

                if (command === "ping") {

                    return interaction.reply({
                        content:
                            `Pong! ${client.ws.ping}ms`,
                        ephemeral: true
                    });
                }

                // ==============================================
                // BOT INFO
                // ==============================================

                if (command === "botinfo") {

                    const embed =
                        createEmbed(
                            "Bot Information"
                        ).addFields(
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
                                value: "v14",
                                inline: true
                            }
                        );

                    return interaction.reply({
                        embeds: [embed]
                    });
                }

                // ==============================================
                // SERVER INFO
                // ==============================================

                if (
                    command ===
                    "serverinfo"
                ) {

                    const guild =
                        interaction.guild;

                    const embed =
                        createEmbed(
                            guild.name
                        ).addFields(
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
                        );

                    return interaction.reply({
                        embeds: [embed]
                    });
                }

                // ==============================================
                // USER INFO
                // ==============================================

                if (
                    command ===
                    "userinfo"
                ) {

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
                            "User Information"
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
                                            user.createdTimestamp /
                                            1000
                                        )}:F>`
                                }
                            );

                    if (member) {
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
                        embeds: [embed]
                    });
                }

                // ==============================================
                // PROFILE
                // ==============================================

                if (
                    command === "profile"
                ) {

                    const member =
                        interaction.member;

                    const embed =
                        createEmbed(
                            `${interaction.user.username}'s Profile`
                        )
                            .setThumbnail(
                                interaction.user.displayAvatarURL()
                            )
                            .addFields(
                                {
                                    name:
                                        "Username",
                                    value:
                                        interaction.user.tag
                                },
                                {
                                    name:
                                        "Joined",
                                    value:
                                        `<t:${Math.floor(
                                            member.joinedTimestamp /
                                            1000
                                        )}:R>`
                                },
                                {
                                    name:
                                        "Roles",
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
                                            .join(
                                                ", "
                                            ) ||
                                        "None"
                                }
                            );

                    return interaction.reply({
                        embeds: [embed]
                    });
                }

                // ==============================================
                // BAN
                // ==============================================

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

                // ==============================================
                // KICK
                // ==============================================

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

                // ==============================================
                // TIMEOUT
                // ==============================================

                if (
                    command ===
                    "timeout"
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
                        minutes *
                        60 *
                        1000,
                        reason
                    );

                    return interaction.reply({
                        content:
                            `Timed out **${user.tag}** for ${minutes} minute(s).`
                    });
                }

                // ==============================================
                // UNTIMEOUT
                // ==============================================

                if (
                    command ===
                    "untimeout"
                ) {

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

                // ==============================================
                // WARN
                // ==============================================

                if (command === "warn") {

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

                // ==============================================
                // WARNINGS
                // ==============================================

                if (
                    command ===
                    "warnings"
                ) {

                    const user =
                        interaction.options.getUser(
                            "user"
                        ) ||
                        interaction.user;

                    const userWarnings =
                        warnings[
                            interaction.guild.id
                        ]?.[user.id] ||
                        [];

                    if (
                        userWarnings.length ===
                        0
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
                                (
                                    warning,
                                    index
                                ) =>
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

                // ==============================================
                // CLEAR WARNINGS
                // ==============================================

                if (
                    command ===
                    "clearwarnings"
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

                // ==============================================
                // PURGE
                // ==============================================

                if (
                    command ===
                    "purge"
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

                // ==============================================
                // LOCK
                // ==============================================

                if (
                    command ===
                    "lock"
                ) {

                    await interaction.channel.permissionOverwrites.edit(
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

                // ==============================================
                // UNLOCK
                // ==============================================

                if (
                    command ===
                    "unlock"
                ) {

                    await interaction.channel.permissionOverwrites.edit(
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

                // ==============================================
                // SLOWMODE
                // ==============================================

                if (
                    command ===
                    "slowmode"
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

                // ==============================================
                // ROLE
                // ==============================================

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
                        subcommand ===
                        "add"
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
                        subcommand ===
                        "remove"
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

                // ==============================================
                // ANNOUNCE
                // ==============================================

                if (
                    command ===
                    "announce"
                ) {

                    const message =
                        interaction.options.getString(
                            "message"
                        );

                    const embed =
                        createEmbed(
                            "Announcement",
                            message
                        ).setFooter({
                            text:
                                `Posted by ${interaction.user.tag}`
                        });

                    return interaction.reply({
                        embeds: [embed]
                    });
                }

                // ==============================================
                // EMBED
                // ==============================================

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

                // ==============================================
                // TICKET SETUP
                // ==============================================

                if (
                    command ===
                    "ticketsetup"
                ) {

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

                    return interaction.reply({
                        embeds: [
                            createEmbed(
                                "Support Tickets",
                                "Need help? Click the button below to create a support ticket."
                            )
                        ],
                        components: [row]
                    });
                }

                // ==============================================
                // TICKET CONFIG
                // ==============================================

                if (
                    command ===
                    "ticketconfig"
                ) {

                    return interaction.reply({
                        embeds: [
                            createEmbed(
                                "Ticket Configuration",
                                "The ticket system is currently using automatic ticket creation."
                            )
                        ],
                        ephemeral: true
                    });
                }

                // ==============================================
                // ENROLSCHOOL
                // ==============================================

                if (
                    command ===
                    "enrolschool"
                ) {

                    const guildConfig =
                        config[
                            interaction.guild.id
                        ];

                    if (
                        !guildConfig ||
                        !guildConfig.enrolStaffRoleId ||
                        !guildConfig.enrolReviewCategoryId
                    ) {
                        return interaction.reply({
                            content:
                                "The school enrolment system has not been fully configured. An administrator needs to use `/enrolconfig` first.",
                            ephemeral: true
                        });
                    }

                    const category =
                        interaction.guild.channels.cache.get(
                            guildConfig.enrolReviewCategoryId
                        );

                    if (
                        !category ||
                        category.type !==
                        ChannelType.GuildCategory
                    ) {
                        return interaction.reply({
                            content:
                                "The configured review channel category no longer exists. Please ask an administrator to update `/enrolconfig`.",
                            ephemeral: true
                        });
                    }

                    const dmEmbed =
                        createEmbed(
                            "School Enrolment",
                            "Welcome to the school enrolment process.\n\nClick **Start Questionnaire** below to begin. You will be asked a series of questions one at a time."
                        );

                    const row =
                        new ActionRowBuilder()
                            .addComponents(
                                new ButtonBuilder()
                                    .setCustomId(
                                        `start_enrol_${interaction.guild.id}`
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

                        return interaction.reply({
                            content:
                                "I've sent the school enrolment questionnaire to your DMs.",
                            ephemeral: true
                        });

                    } catch (error) {

                        console.error(
                            "Could not DM user:",
                            error
                        );

                        return interaction.reply({
                            content:
                                "I couldn't send you a DM. Please make sure your DMs are enabled for this server and try again.",
                            ephemeral: true
                        });
                    }
                }

                // ==============================================
                // ENROL CONFIG
                // ==============================================

                if (
                    command ===
                    "enrolconfig"
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

                    return interaction.reply({
                        ...buildEnrolConfigPanel(
                            interaction.guild
                        ),
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

                // ==============================================
                // START ENROLMENT
                // ==============================================

                if (
                    interaction.customId.startsWith(
                        "start_enrol_"
                    )
                ) {

                    const guildId =
                        interaction.customId.replace(
                            "start_enrol_",
                            ""
                        );

                    const guild =
                        client.guilds.cache.get(
                            guildId
                        );

                    if (!guild) {
                        return interaction.reply({
                            content:
                                "I couldn't find the server connected to this enrolment.",
                            ephemeral: true
                        });
                    }

                    const guildConfig =
                        config[guildId];

                    if (
                        !guildConfig?.enrolStaffRoleId ||
                        !guildConfig?.enrolReviewCategoryId
                    ) {
                        return interaction.reply({
                            content:
                                "The enrolment system has not been configured correctly.",
                            ephemeral: true
                        });
                    }

                    enrolments.set(
                        interaction.user.id,
                        {
                            guildId,
                            step: 1,
                            answers: {},
                            createdAt:
                                Date.now()
                        }
                    );

                    return showQuestion(
                        interaction,
                        1
                    );
                }

                // ==============================================
                // SUBMIT ENROLMENT
                // ==============================================

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
                                "Your enrolment session has expired. Please use `/enrolschool` again.",
                            ephemeral: true
                        });
                    }

                    const guild =
                        client.guilds.cache.get(
                            enrolment.guildId
                        );

                    if (!guild) {
                        return interaction.reply({
                            content:
                                "The server for this enrolment could not be found.",
                            ephemeral: true
                        });
                    }

                    await interaction.deferReply({
                        ephemeral: true
                    });

                    try {

                        const guildConfig =
                            config[
                                guild.id
                            ];

                        const staffRole =
                            guild.roles.cache.get(
                                guildConfig.enrolStaffRoleId
                            );

                        const category =
                            guild.channels.cache.get(
                                guildConfig.enrolReviewCategoryId
                            );

                        if (!staffRole) {
                            return interaction.editReply(
                                "The configured staff role no longer exists."
                            );
                        }

                        if (
                            !category ||
                            category.type !==
                            ChannelType.GuildCategory
                        ) {
                            return interaction.editReply(
                                "The configured review category no longer exists."
                            );
                        }

                        // ----------------------------------------
                        // CHANNEL NAME
                        // ----------------------------------------

                        let channelName =
                            enrolment.answers.schoolName
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
                                `application-${interaction.user.username
                                    .toLowerCase()
                                    .replace(
                                        /[^a-z0-9]/g,
                                        "-"
                                    )}`;
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

                        // ----------------------------------------
                        // IMPORTANT:
                        // APPLICANT IS NOT IN THIS LIST.
                        // ----------------------------------------

                        const overwrites = [

                            {
                                id:
                                    guild.roles
                                        .everyone.id,
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
                                name: finalName,
                                type:
                                    ChannelType.GuildText,
                                parent:
                                    category.id,
                                permissionOverwrites:
                                    overwrites,
                                topic:
                                    `School enrolment review submitted by ${interaction.user.tag}`
                            });

                        // ----------------------------------------
                        // REVIEW EMBED
                        // ----------------------------------------

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
                                            "School's Name",
                                        value:
                                            answers.schoolName ||
                                            "Not provided"
                                    },
                                    {
                                        name:
                                            "School Description",
                                        value:
                                            answers.schoolDescription ||
                                            "Not provided"
                                    },
                                    {
                                        name:
                                            "School Discord Server Invite",
                                        value:
                                            answers.schoolInvite ||
                                            "Not provided"
                                    },
                                    {
                                        name:
                                            "Applicant's Role",
                                        value:
                                            answers.schoolRole ||
                                            "Not provided"
                                    },
                                    {
                                        name:
                                            "Why should the school be enrolled?",
                                        value:
                                            answers.schoolReason ||
                                            "Not provided"
                                    },
                                    {
                                        name:
                                            "Additional Information",
                                        value:
                                            answers.additionalInfo ||
                                            "None provided"
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
                                `${staffRole} — new school enrolment awaiting review.`,
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
                            `Your school enrolment has been submitted successfully.\n\nYour application has been sent to the staff team for review.`
                        );

                    } catch (error) {

                        console.error(
                            "ENROLMENT SUBMISSION ERROR:",
                            error
                        );

                        return interaction.editReply(
                            "Something went wrong while creating the review channel. Please contact staff."
                        );
                    }
                }

                // ==============================================
                // CANCEL
                // ==============================================

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

                // ==============================================
                // APPROVE
                // ==============================================

                if (
                    interaction.customId.startsWith(
                        "enrol_approve_"
                    )
                ) {

                    if (
                        !interaction.guild
                    ) {
                        return interaction.reply({
                            content:
                                "This action can only be used inside the review channel.",
                            ephemeral: true
                        });
                    }

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
                        interaction.customId.replace(
                            "enrol_approve_",
                            ""
                        );

                    const applicant =
                        await interaction.guild.members
                            .fetch(
                                applicantId
                            )
                            .catch(
                                () => null
                            );

                    const guildConfig =
                        config[
                            interaction.guild.id
                        ];

                    if (
                        guildConfig?.enrolApprovedRoleId
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
                        await applicant.send({
                            embeds: [
                                createEmbed(
                                    "School Enrolment Approved",
                                    `Your school enrolment in **${interaction.guild.name}** has been approved by the staff team.`
                                )
                            ]
                        }).catch(
                            () => {}
                        );
                    }

                    return interaction.reply({
                        content:
                            "The enrolment has been approved.",
                        ephemeral: true
                    });
                }

                // ==============================================
                // DENY
                // ==============================================

                if (
                    interaction.customId.startsWith(
                        "enrol_deny_"
                    )
                ) {

                    if (
                        !interaction.guild ||
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
                        interaction.customId.replace(
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

                // ==============================================
                // REQUEST CHANGES
                // ==============================================

                if (
                    interaction.customId.startsWith(
                        "enrol_changes_"
                    )
                ) {

                    if (
                        !interaction.guild ||
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
                        interaction.customId.replace(
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

                    const changes =
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
                            .setRequired(
                                true
                            )
                            .setMaxLength(
                                1000
                            );

                    modal.addComponents(
                        new ActionRowBuilder()
                            .addComponents(
                                changes
                            )
                    );

                    return interaction.showModal(
                        modal
                    );
                }

                // ==============================================
                // TICKET
                // ==============================================

                if (
                    interaction.customId ===
                    "create_ticket"
                ) {

                    await interaction.deferReply({
                        ephemeral: true
                    });

                    const safeName =
                        interaction.user.username
                            .toLowerCase()
                            .replace(
                                /[^a-z0-9-]/g,
                                ""
                            )
                            .substring(
                                0,
                                70
                            );

                    const existing =
                        interaction.guild.channels.cache.find(
                            channel =>
                                channel.name ===
                                `ticket-${safeName}`
                        );

                    if (existing) {
                        return interaction.editReply(
                            `You already have a ticket: ${existing}`
                        );
                    }

                    const channel =
                        await interaction.guild.channels.create({
                            name:
                                `ticket-${safeName}`,
                            type:
                                ChannelType.GuildText,
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
                                        client.user.id,
                                    allow: [
                                        PermissionFlagsBits.ViewChannel,
                                        PermissionFlagsBits.SendMessages,
                                        PermissionFlagsBits.ManageChannels,
                                        PermissionFlagsBits.ReadMessageHistory
                                    ]
                                }
                            ]
                        });

                    await channel.send({
                        embeds: [
                            createEmbed(
                                "Support Ticket",
                                `Hello ${interaction.user},\n\nPlease explain what you need help with. A member of staff will be with you shortly.`
                            )
                        ]
                    });

                    return interaction.editReply(
                        `Your ticket has been created: ${channel}`
                    );
                }

                // ==============================================
                // ENROL CONFIG STAFF
                // ==============================================

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

                    if (
                        roles.length === 0
                    ) {
                        return interaction.reply({
                            content:
                                "There are no roles available.",
                            ephemeral: true
                        });
                    }

                    const menu =
                        new StringSelectMenuBuilder()
                            .setCustomId(
                                "enrol_select_staff_role"
                            )
                            .setPlaceholder(
                                "Select the staff review role"
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
                            "Select the role that should be able to review school enrolments.",
                        components: [
                            new ActionRowBuilder()
                                .addComponents(
                                    menu
                                )
                        ],
                        ephemeral: true
                    });
                }

                // ==============================================
                // ENROL CONFIG APPROVED ROLE
                // ==============================================

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

                    const menu =
                        new StringSelectMenuBuilder()
                            .setCustomId(
                                "enrol_select_approved_role"
                            )
                            .setPlaceholder(
                                "Select the approved school role"
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
                            "Select the role that should be given when a school is approved.",
                        components: [
                            new ActionRowBuilder()
                                .addComponents(
                                    menu
                                )
                        ],
                        ephemeral: true
                    });
                }

                // ==============================================
                // ENROL CONFIG CATEGORY
                // ==============================================

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
                            .sort(
                                (a, b) =>
                                    a.position -
                                    b.position
                            )
                            .first(25);

                    if (
                        categories.length ===
                        0
                    ) {
                        return interaction.reply({
                            content:
                                "There are no categories in this server.",
                            ephemeral: true
                        });
                    }

                    const menu =
                        new StringSelectMenuBuilder()
                            .setCustomId(
                                "enrol_select_category"
                            )
                            .setPlaceholder(
                                "Select the review channel category"
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
                            "Select the category where automatic enrolment review channels should be created.",
                        components: [
                            new ActionRowBuilder()
                                .addComponents(
                                    menu
                                )
                        ],
                        ephemeral: true
                    });
                }

                // ==============================================
                // ENROL CONFIG REFRESH
                // ==============================================

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

                    return interaction.update(
                        buildEnrolConfigPanel(
                            interaction.guild
                        )
                    );
                }
            }

            // ==================================================
            // SELECT MENUS
            // ==================================================

            if (
                interaction.isStringSelectMenu()
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
                    !config[
                        interaction.guild.id
                    ]
                ) {
                    config[
                        interaction.guild.id
                    ] = {};
                }

                // STAFF ROLE
                if (
                    interaction.customId ===
                    "enrol_select_staff_role"
                ) {

                    config[
                        interaction.guild.id
                    ].enrolStaffRoleId =
                        interaction.values[0];

                    saveJSON(
                        configFile,
                        config
                    );

                    const role =
                        interaction.guild.roles.cache.get(
                            interaction.values[0]
                        );

                    return interaction.update({
                        content:
                            `Staff review role set to ${role || "the selected role"}.`,
                        components: []
                    });
                }

                // APPROVED ROLE
                if (
                    interaction.customId ===
                    "enrol_select_approved_role"
                ) {

                    config[
                        interaction.guild.id
                    ].enrolApprovedRoleId =
                        interaction.values[0];

                    saveJSON(
                        configFile,
                        config
                    );

                    const role =
                        interaction.guild.roles.cache.get(
                            interaction.values[0]
                        );

                    return interaction.update({
                        content:
                            `Approved school role set to ${role || "the selected role"}.`,
                        components: []
                    });
                }

                // CATEGORY
                if (
                    interaction.customId ===
                    "enrol_select_category"
                ) {

                    const category =
                        interaction.guild.channels.cache.get(
                            interaction.values[0]
                        );

                    if (
                        !category ||
                        category.type !==
                        ChannelType.GuildCategory
                    ) {
                        return interaction.reply({
                            content:
                                "That category could not be found.",
                            ephemeral: true
                        });
                    }

                    config[
                        interaction.guild.id
                    ].enrolReviewCategoryId =
                        category.id;

                    saveJSON(
                        configFile,
                        config
                    );

                    return interaction.update({
                        content:
                            `Review channel category set to ${category}.`,
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

                // ==============================================
                // QUESTION 1
                // ==============================================

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

                    enrolments.set(
                        interaction.user.id,
                        enrolment
                    );

                    return showQuestion(
                        interaction,
                        2
                    );
                }

                // ==============================================
                // QUESTION 2
                // ==============================================

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

                    enrolments.set(
                        interaction.user.id,
                        enrolment
                    );

                    return showQuestion(
                        interaction,
                        3
                    );
                }

                // ==============================================
                // QUESTION 3
                // ==============================================

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

                    enrolments.set(
                        interaction.user.id,
                        enrolment
                    );

                    return showQuestion(
                        interaction,
                        4
                    );
                }

                // ==============================================
                // QUESTION 4
                // ==============================================

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

                    enrolment.answers.schoolRole =
                        interaction.fields.getTextInputValue(
                            "school_role"
                        );

                    enrolment.step = 5;

                    enrolments.set(
                        interaction.user.id,
                        enrolment
                    );

                    return showQuestion(
                        interaction,
                        5
                    );
                }

                // ==============================================
                // QUESTION 5
                // ==============================================

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

                    enrolment.answers.schoolReason =
                        interaction.fields.getTextInputValue(
                            "school_reason"
                        );

                    enrolment.step = 6;

                    enrolments.set(
                        interaction.user.id,
                        enrolment
                    );

                    return showQuestion(
                        interaction,
                        6
                    );
                }

                // ==============================================
                // QUESTION 6
                // ==============================================

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

                    enrolment.answers.additionalInfo =
                        interaction.fields.getTextInputValue(
                            "additional_info"
                        );

                    enrolment.step = 7;

                    enrolments.set(
                        interaction.user.id,
                        enrolment
                    );

                    const answers =
                        enrolment.answers;

                    const preview =
                        createEmbed(
                            "Review Your Enrolment",
                            "Please check your answers below. If everything is correct, click **Submit Enrolment**."
                        )
                            .addFields(
                                {
                                    name:
                                        "1. School's Name",
                                    value:
                                        answers.schoolName
                                },
                                {
                                    name:
                                        "2. School Description",
                                    value:
                                        answers.schoolDescription
                                },
                                {
                                    name:
                                        "3. School Discord Server Invite",
                                    value:
                                        answers.schoolInvite
                                },
                                {
                                    name:
                                        "4. Your Role at the School",
                                    value:
                                        answers.schoolRole
                                },
                                {
                                    name:
                                        "5. Why should the school be enrolled?",
                                    value:
                                        answers.schoolReason
                                },
                                {
                                    name:
                                        "6. Additional Information",
                                    value:
                                        answers.additionalInfo
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

                // ==============================================
                // DENIAL
                // ==============================================

                if (
                    interaction.customId.startsWith(
                        "enrol_deny_modal_"
                    )
                ) {

                    if (
                        !interaction.guild ||
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
                        interaction.customId.replace(
                            "enrol_deny_modal_",
                            ""
                        );

                    const reason =
                        interaction.fields.getTextInputValue(
                            "deny_reason"
                        );

                    const applicant =
                        await interaction.guild.members
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
                                `This enrolment has been denied by ${interaction.user}.\n\n**Reason:** ${reason}`
                            )
                        ]
                    });

                    if (applicant) {
                        await applicant.send({
                            embeds: [
                                createEmbed(
                                    "School Enrolment Denied",
                                    `Your school enrolment in **${interaction.guild.name}** has been denied.\n\n**Reason:** ${reason}`
                                )
                            ]
                        }).catch(
                            () => {}
                        );
                    }

                    return interaction.reply({
                        content:
                            "The enrolment has been denied.",
                        ephemeral: true
                    });
                }

                // ==============================================
                // CHANGES
                // ==============================================

                if (
                    interaction.customId.startsWith(
                        "enrol_changes_modal_"
                    )
                ) {

                    if (
                        !interaction.guild ||
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
                        interaction.customId.replace(
                            "enrol_changes_modal_",
                            ""
                        );

                    const reason =
                        interaction.fields.getTextInputValue(
                            "changes_reason"
                        );

                    const applicant =
                        await interaction.guild.members
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
                        await applicant.send({
                            embeds: [
                                createEmbed(
                                    "Changes Required",
                                    `The staff team has requested changes to your school enrolment in **${interaction.guild.name}**.\n\n**Changes required:** ${reason}`
                                )
                            ]
                        }).catch(
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
// QUESTION MODALS
// ============================================================

async function showQuestion(
    interaction,
    question
) {

    if (question === 1) {

        const modal =
            new ModalBuilder()
                .setCustomId(
                    "enrol_question_1"
                )
                .setTitle(
                    "School Enrolment • 1/6"
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
                .addComponents(input)
        );

        return interaction.showModal(
            modal
        );
    }

    if (question === 2) {

        const modal =
            new ModalBuilder()
                .setCustomId(
                    "enrol_question_2"
                )
                .setTitle(
                    "School Enrolment • 2/6"
                );

        const input =
            new TextInputBuilder()
                .setCustomId(
                    "school_description"
                )
                .setLabel(
                    "What is the Description for your school?"
                )
                .setStyle(
                    TextInputStyle.Paragraph
                )
                .setRequired(true)
                .setMaxLength(1000)
                .setPlaceholder(
                    "Describe your school..."
                );

        modal.addComponents(
            new ActionRowBuilder()
                .addComponents(input)
        );

        return interaction.showModal(
            modal
        );
    }

    if (question === 3) {

        const modal =
            new ModalBuilder()
                .setCustomId(
                    "enrol_question_3"
                )
                .setTitle(
                    "School Enrolment • 3/6"
                );

        const input =
            new TextInputBuilder()
                .setCustomId(
                    "school_invite"
                )
                .setLabel(
                    "What is your School's Discord Server Invite?"
                )
                .setStyle(
                    TextInputStyle.Short
                )
                .setRequired(true)
                .setMaxLength(200)
                .setPlaceholder(
                    "https://discord.gg/example"
                );

        modal.addComponents(
            new ActionRowBuilder()
                .addComponents(input)
        );

        return interaction.showModal(
            modal
        );
    }

    if (question === 4) {

        const modal =
            new ModalBuilder()
                .setCustomId(
                    "enrol_question_4"
                )
                .setTitle(
                    "School Enrolment • 4/6"
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
                .setMaxLength(100)
                .setPlaceholder(
                    "Owner, Founder, Headteacher..."
                );

        modal.addComponents(
            new ActionRowBuilder()
                .addComponents(input)
        );

        return interaction.showModal(
            modal
        );
    }

    if (question === 5) {

        const modal =
            new ModalBuilder()
                .setCustomId(
                    "enrol_question_5"
                )
                .setTitle(
                    "School Enrolment • 5/6"
                );

        const input =
            new TextInputBuilder()
                .setCustomId(
                    "school_reason"
                )
                .setLabel(
                    "Why should your school be enrolled?"
                )
                .setStyle(
                    TextInputStyle.Paragraph
                )
                .setRequired(true)
                .setMaxLength(1000)
                .setPlaceholder(
                    "Tell us why..."
                );

        modal.addComponents(
            new ActionRowBuilder()
                .addComponents(input)
        );

        return interaction.showModal(
            modal
        );
    }

    if (question === 6) {

        const modal =
            new ModalBuilder()
                .setCustomId(
                    "enrol_question_6"
                )
                .setTitle(
                    "School Enrolment • 6/6"
                );

        const input =
            new TextInputBuilder()
                .setCustomId(
                    "additional_info"
                )
                .setLabel(
                    "Any additional information?"
                )
                .setStyle(
                    TextInputStyle.Paragraph
                )
                .setRequired(true)
                .setMaxLength(1000)
                .setPlaceholder(
                    "Anything else staff should know..."
                );

        modal.addComponents(
            new ActionRowBuilder()
                .addComponents(input)
        );

        return interaction.showModal(
            modal
        );
    }
}

// ============================================================
// CLEAN EXPIRED ENROLMENTS
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
                60 *
                60 *
                1000
            ) {
                enrolments.delete(
                    userId
                );
            }
        }

    },
    10 *
    60 *
    1000
);

// ============================================================
// LOGIN
// ============================================================

client.login(TOKEN);
