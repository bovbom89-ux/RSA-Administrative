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
    console.error("Missing DISCORD_TOKEN, CLIENT_ID or GUILD_ID.");
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
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.MessageContent,
    ],
    partials: [
        Partials.Channel,
        Partials.Message,
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
// ENROLMENT SESSIONS
// ============================================================

const enrolSessions = new Map();

/*
    Structure:

    userId => {
        guildId,
        currentQuestion,
        answers: {
            schoolName,
            description,
            invite,
            role,
            members,
            reason
        },
        lastActivity
    }
*/

const enrolQuestions = [
    {
        id: "schoolName",
        question: "What is your school's name?",
        max: 100,
    },
    {
        id: "description",
        question: "What is the description for your school?",
        max: 1000,
    },
    {
        id: "invite",
        question: "What is your school's Discord server invite?",
        max: 300,
    },
    {
        id: "role",
        question: "What is your role at the school?",
        max: 100,
    },
    {
        id: "members",
        question: "Approximately how many members does your school currently have?",
        max: 50,
    },
    {
        id: "reason",
        question: "Why would you like your school to be enrolled with the Roblox School Association?",
        max: 1000,
    },
];

// ============================================================
// EMBEDS
// ============================================================

function createEmbed(title, description) {
    return new EmbedBuilder()
        .setTitle(`${LOGO} ${title}`)
        .setDescription(description)
        .setColor(EMBED_COLOUR)
        .setTimestamp();
}

function createBrandedEmbed() {
    return new EmbedBuilder()
        .setColor(EMBED_COLOUR)
        .setTimestamp();
}

// ============================================================
// PERMISSIONS
// ============================================================

function canManage(member) {
    if (!member) return false;

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

    const guildConfig = config[member.guild.id];

    if (!guildConfig?.enrolStaffRoleId) {
        return false;
    }

    return member.roles.cache.has(
        guildConfig.enrolStaffRoleId
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
    // SCHOOL ENROLMENT
    // ========================================================

    new SlashCommandBuilder()
        .setName("enrolschool")
        .setDescription("Apply to enrol your school"),

    new SlashCommandBuilder()
        .setName("enrolconfig")
        .setDescription("Configure the school enrolment system")
        .setDefaultMemberPermissions(
            PermissionFlagsBits.ManageGuild
        ),

].map(command => command.toJSON());

// ============================================================
// COMMAND REGISTRATION
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

        console.log("Slash commands registered.");
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
// HELPERS
// ============================================================

function getGuildConfig(guildId) {
    if (!config[guildId]) {
        config[guildId] = {};
    }

    return config[guildId];
}

function getRole(guild, id) {
    if (!id) return null;

    return guild.roles.cache.get(id) || null;
}

function getChannel(guild, id) {
    if (!id) return null;

    return guild.channels.cache.get(id) || null;
}

// ============================================================
// SEND ENROLMENT DM
// ============================================================

async function sendEnrolmentDM(user, guild) {

    const existing = enrolSessions.get(user.id);

    if (existing) {
        return false;
    }

    const session = {
        guildId: guild.id,
        currentQuestion: 0,
        answers: {},
        lastActivity: Date.now()
    };

    enrolSessions.set(user.id, session);

    const embed = createEmbed(
        "School Enrolment",
        `Welcome to the **Roblox School Association** enrolment process for **${guild.name}**.\n\n` +
        "You will be asked **6 questions**, one at a time.\n\n" +
        "At the end, you will be able to review your answers before submitting your enrolment.\n\n" +
        "Click **Start Questionnaire** to begin."
    );

    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(
                    `enrol_start_${guild.id}`
                )
                .setLabel("Start Questionnaire")
                .setStyle(ButtonStyle.Primary)
        );

    try {
        await user.send({
            embeds: [embed],
            components: [row]
        });

        return true;
    } catch (error) {
        enrolSessions.delete(user.id);
        return false;
    }
}

// ============================================================
// ASK ENROLMENT QUESTION
// ============================================================

async function askEnrolQuestion(userId) {

    const session = enrolSessions.get(userId);

    if (!session) return;

    const question =
        enrolQuestions[session.currentQuestion];

    if (!question) {
        return showEnrolmentReview(userId);
    }

    const embed = createEmbed(
        `Question ${session.currentQuestion + 1} of ${enrolQuestions.length}`,
        question.question
    );

    embed.setFooter({
        text: "Reply to this message with your answer."
    });

    try {
        await client.users.send(
            userId,
            {
                embeds: [embed]
            }
        );

        session.lastActivity = Date.now();

    } catch (error) {
        console.error(
            "Could not ask enrolment question:",
            error
        );
    }
}

// ============================================================
// ENROLMENT REVIEW
// ============================================================

async function showEnrolmentReview(userId) {

    const session = enrolSessions.get(userId);

    if (!session) return;

    const answers = session.answers;

    const embed = createEmbed(
        "Review Your Enrolment",
        "Please review your answers carefully before submitting."
    );

    embed.addFields(
        {
            name: "1. School Name",
            value: answers.schoolName || "Not provided"
        },
        {
            name: "2. School Description",
            value: answers.description || "Not provided"
        },
        {
            name: "3. Discord Server Invite",
            value: answers.invite || "Not provided"
        },
        {
            name: "4. Your Role",
            value: answers.role || "Not provided"
        },
        {
            name: "5. Approximate Members",
            value: answers.members || "Not provided"
        },
        {
            name: "6. Reason for Enrolment",
            value: answers.reason || "Not provided"
        }
    );

    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId("enrol_submit")
                .setLabel("Submit Enrolment")
                .setStyle(ButtonStyle.Success),

            new ButtonBuilder()
                .setCustomId("enrol_restart")
                .setLabel("Restart Questionnaire")
                .setStyle(ButtonStyle.Secondary)
        );

    try {
        await client.users.send(userId, {
            embeds: [embed],
            components: [row]
        });
    } catch (error) {
        console.error(
            "Could not send enrolment review:",
            error
        );
    }
}

// ============================================================
// CREATE ENROLMENT REVIEW CHANNEL
// ============================================================

async function createReviewChannel(
    guild,
    applicant,
    session
) {

    const guildConfig =
        getGuildConfig(guild.id);

    const staffRole =
        getRole(
            guild,
            guildConfig.enrolStaffRoleId
        );

    if (!staffRole) {
        throw new Error(
            "Staff review role is not configured."
        );
    }

    const category =
        getChannel(
            guild,
            guildConfig.enrolReviewCategoryId
        );

    if (
        guildConfig.enrolReviewCategoryId &&
        (!category ||
            category.type !== ChannelType.GuildCategory)
    ) {
        throw new Error(
            "The configured review category is invalid."
        );
    }

    let baseName =
        session.answers.schoolName
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "")
            .substring(0, 60);

    if (!baseName) {
        baseName = "school";
    }

    let channelName =
        `enrol-${baseName}`;

    let number = 2;

    while (
        guild.channels.cache.some(
            channel =>
                channel.name === channelName
        )
    ) {
        channelName =
            `enrol-${baseName}-${number}`;
        number++;
    }

    const overwrites = [
        {
            id: guild.roles.everyone.id,
            deny: [
                PermissionFlagsBits.ViewChannel
            ]
        },
        {
            id: staffRole.id,
            allow: [
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.ReadMessageHistory,
                PermissionFlagsBits.ManageMessages
            ]
        },
        {
            id: client.user.id,
            allow: [
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.ReadMessageHistory,
                PermissionFlagsBits.ManageChannels,
                PermissionFlagsBits.ManageMessages
            ]
        }
    ];

    const channel =
        await guild.channels.create({
            name: channelName,
            type: ChannelType.GuildText,
            parent: category?.id || null,
            permissionOverwrites: overwrites,
            topic:
                `School enrolment review — ${applicant.tag}`
        });

    const answers = session.answers;

    const embed = createEmbed(
        "New School Enrolment",
        `A new school has been submitted for enrolment by ${applicant}.`
    );

    embed.addFields(
        {
            name: "School Name",
            value: answers.schoolName || "Not provided"
        },
        {
            name: "School Description",
            value: answers.description || "Not provided"
        },
        {
            name: "Discord Server Invite",
            value: answers.invite || "Not provided"
        },
        {
            name: "Applicant's Role",
            value: answers.role || "Not provided"
        },
        {
            name: "Approximate Members",
            value: answers.members || "Not provided"
        },
        {
            name: "Reason for Enrolment",
            value: answers.reason || "Not provided"
        },
        {
            name: "Applicant",
            value:
                `${applicant.tag}\n${applicant.id}`
        }
    );

    const buttons =
        new ActionRowBuilder()
            .addComponents(

                new ButtonBuilder()
                    .setCustomId(
                        `enrol_approve_${applicant.id}`
                    )
                    .setLabel("Approve")
                    .setStyle(ButtonStyle.Success),

                new ButtonBuilder()
                    .setCustomId(
                        `enrol_deny_${applicant.id}`
                    )
                    .setLabel("Deny")
                    .setStyle(ButtonStyle.Danger)
            );

    await channel.send({
        content:
            `${staffRole}\n**New school enrolment awaiting review.**`,
        embeds: [embed],
        components: [buttons]
    });

    return channel;
}

// ============================================================
// SEND TICKET PANEL
// ============================================================

async function sendTicketPanel(interaction) {

    const guildConfig =
        getGuildConfig(interaction.guild.id);

    const ticketCategory =
        getChannel(
            interaction.guild,
            guildConfig.ticketCategoryId
        );

    const ticketStaffRole =
        getRole(
            interaction.guild,
            guildConfig.ticketStaffRoleId
        );

    const embed = createEmbed(
        "Support Tickets",
        "Need assistance? Click the button below to create a private support ticket.\n\n" +
        "A member of the support team will assist you as soon as possible."
    );

    embed.addFields(
        {
            name: "Support",
            value:
                ticketStaffRole
                    ? `${ticketStaffRole}`
                    : "Staff role not configured",
            inline: true
        },
        {
            name: "Category",
            value:
                ticketCategory
                    ? `${ticketCategory}`
                    : "Category not configured",
            inline: true
        }
    );

    const row =
        new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId("ticket_create")
                    .setLabel("Create Ticket")
                    .setStyle(ButtonStyle.Primary)
            );

    return interaction.channel.send({
        embeds: [embed],
        components: [row]
    });
}

// ============================================================
// TICKET CONFIG PANEL
// ============================================================

async function sendTicketConfigPanel(interaction) {

    const guildConfig =
        getGuildConfig(interaction.guild.id);

    const category =
        getChannel(
            interaction.guild,
            guildConfig.ticketCategoryId
        );

    const staffRole =
        getRole(
            interaction.guild,
            guildConfig.ticketStaffRoleId
        );

    const embed = createEmbed(
        "Ticket Configuration",
        "Configure your support ticket system using the buttons below."
    );

    embed.addFields(
        {
            name: "Staff Role",
            value:
                staffRole
                    ? `${staffRole}`
                    : "Not configured",
            inline: true
        },
        {
            name: "Ticket Category",
            value:
                category
                    ? `${category}`
                    : "Not configured",
            inline: true
        },
        {
            name: "Panel",
            value:
                "Use **Send Ticket Panel** to post the ticket panel in the current channel.",
            inline: false
        }
    );

    const row1 =
        new ActionRowBuilder()
            .addComponents(

                new ButtonBuilder()
                    .setCustomId(
                        "ticket_config_staff"
                    )
                    .setLabel("Set Staff Role")
                    .setStyle(ButtonStyle.Primary),

                new ButtonBuilder()
                    .setCustomId(
                        "ticket_config_category"
                    )
                    .setLabel("Set Category")
                    .setStyle(ButtonStyle.Secondary),

                new ButtonBuilder()
                    .setCustomId(
                        "ticket_config_send"
                    )
                    .setLabel("Send Ticket Panel")
                    .setStyle(ButtonStyle.Success)
            );

    const row2 =
        new ActionRowBuilder()
            .addComponents(

                new ButtonBuilder()
                    .setCustomId(
                        "ticket_config_refresh"
                    )
                    .setLabel("Refresh")
                    .setStyle(ButtonStyle.Secondary)
            );

    return interaction.reply({
        embeds: [embed],
        components: [row1, row2],
        ephemeral: true
    });
}

// ============================================================
// ENROL CONFIG PANEL
// ============================================================

async function sendEnrolConfigPanel(interaction) {

    const guildConfig =
        getGuildConfig(interaction.guild.id);

    const staffRole =
        getRole(
            interaction.guild,
            guildConfig.enrolStaffRoleId
        );

    const approvedRole =
        getRole(
            interaction.guild,
            guildConfig.enrolApprovedRoleId
        );

    const reviewCategory =
        getChannel(
            interaction.guild,
            guildConfig.enrolReviewCategoryId
        );

    const enrolChannel =
        getChannel(
            interaction.guild,
            guildConfig.enrolChannelId
        );

    const embed = createEmbed(
        "School Enrolment Configuration",
        "Configure the Roblox School Association school enrolment system.\n\n" +
        "Review channels are created automatically when an application is submitted."
    );

    embed.addFields(
        {
            name: "Staff Review Role",
            value:
                staffRole
                    ? `${staffRole}`
                    : "Not configured",
            inline: true
        },
        {
            name: "Approved Role",
            value:
                approvedRole
                    ? `${approvedRole}`
                    : "Not configured",
            inline: true
        },
        {
            name: "Review Category",
            value:
                reviewCategory
                    ? `${reviewCategory}`
                    : "Not configured",
            inline: true
        },
        {
            name: "Enrolment Channel",
            value:
                enrolChannel
                    ? `${enrolChannel}`
                    : "Not configured",
            inline: true
        }
    );

    const row1 =
        new ActionRowBuilder()
            .addComponents(

                new ButtonBuilder()
                    .setCustomId(
                        "enrol_config_staff"
                    )
                    .setLabel("Staff Role")
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
                    .setStyle(ButtonStyle.Secondary)
            );

    const row2 =
        new ActionRowBuilder()
            .addComponents(

                new ButtonBuilder()
                    .setCustomId(
                        "enrol_config_channel"
                    )
                    .setLabel("Enrolment Channel")
                    .setStyle(ButtonStyle.Primary),

                new ButtonBuilder()
                    .setCustomId(
                        "enrol_config_refresh"
                    )
                    .setLabel("Refresh")
                    .setStyle(ButtonStyle.Success)
            );

    return interaction.reply({
        embeds: [embed],
        components: [row1, row2],
        ephemeral: true
    });
}

// ============================================================
// COMMAND HANDLER
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

                    const embed = createEmbed(
                        "RSA Utility Commands",
                        "Here are the commands available to you."
                    );

                    embed.addFields(
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
                                "`/role add`\n" +
                                "`/role remove`\n" +
                                "`/announce`\n" +
                                "`/embed`"
                        },
                        {
                            name: "Tickets",
                            value:
                                "`/ticketconfig`"
                        },
                        {
                            name: "School Enrolment",
                            value:
                                "`/enrolschool`\n" +
                                "`/enrolconfig`"
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
                        embeds: [
                            createEmbed(
                                "Pong!",
                                `Bot latency: **${client.ws.ping}ms**`
                            )
                        ]
                    });
                }

                // ==================================================
                // BOT INFO
                // ==================================================

                if (command === "botinfo") {

                    const embed = createEmbed(
                        "Bot Information",
                        "Information about RSA Utility."
                    );

                    embed.addFields(
                        {
                            name: "Bot",
                            value: client.user.tag,
                            inline: true
                        },
                        {
                            name: "Servers",
                            value:
                                `${client.guilds.cache.size}`,
                            inline: true
                        },
                        {
                            name: "Library",
                            value: "Discord.js v14",
                            inline: true
                        }
                    );

                    return interaction.reply({
                        embeds: [embed]
                    });
                }

                // ==================================================
                // SERVER INFO
                // ==================================================

                if (command === "serverinfo") {

                    const guild =
                        interaction.guild;

                    const embed = createEmbed(
                        guild.name,
                        "Server information."
                    );

                    embed.addFields(
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

                    const embed = createEmbed(
                        "User Information",
                        `Information about **${user.tag}**.`
                    );

                    embed.setThumbnail(
                        user.displayAvatarURL({
                            size: 256
                        })
                    );

                    embed.addFields(
                        {
                            name: "Username",
                            value: user.tag,
                            inline: true
                        },
                        {
                            name: "User ID",
                            value: user.id,
                            inline: true
                        },
                        {
                            name: "Account Created",
                            value:
                                `<t:${Math.floor(
                                    user.createdTimestamp / 1000
                                )}:F>`
                        }
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

                    const roles =
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
                        "None";

                    const embed = createEmbed(
                        `${interaction.user.username}'s Profile`,
                        "Your server profile."
                    );

                    embed.setThumbnail(
                        interaction.user.displayAvatarURL()
                    );

                    embed.addFields(
                        {
                            name: "Username",
                            value:
                                interaction.user.tag
                        },
                        {
                            name: "Joined",
                            value:
                                member.joinedTimestamp
                                    ? `<t:${Math.floor(
                                        member.joinedTimestamp / 1000
                                    )}:R>`
                                    : "Unknown"
                        },
                        {
                            name: "Roles",
                            value: roles
                        }
                    );

                    return interaction.reply({
                        embeds: [embed]
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
                        "No reason provided.";

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
                        embeds: [
                            createEmbed(
                                "Member Banned",
                                `**${user.tag}** has been banned.\n\n**Reason:** ${reason}`
                            )
                        ]
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
                        "No reason provided.";

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
                        embeds: [
                            createEmbed(
                                "Member Kicked",
                                `**${user.tag}** has been kicked.\n\n**Reason:** ${reason}`
                            )
                        ]
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
                        "No reason provided.";

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
                        embeds: [
                            createEmbed(
                                "Member Timed Out",
                                `**${user.tag}** has been timed out for **${minutes} minute(s)**.\n\n**Reason:** ${reason}`
                            )
                        ]
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
                        embeds: [
                            createEmbed(
                                "Timeout Removed",
                                `The timeout has been removed from **${user.tag}**.`
                            )
                        ]
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
                        !warnings[interaction.guild.id][user.id]
                    ) {
                        warnings[interaction.guild.id][user.id] = [];
                    }

                    warnings[interaction.guild.id][user.id]
                        .push({
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
                        embeds: [
                            createEmbed(
                                "Member Warned",
                                `**${user.tag}** has received a warning.\n\n**Reason:** ${reason}`
                            )
                        ]
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

                    const description =
                        userWarnings
                            .map(
                                (warning, index) =>
                                    `**${index + 1}.** ${warning.reason}\nModerator: <@${warning.moderator}>`
                            )
                            .join("\n\n");

                    return interaction.reply({
                        embeds: [
                            createEmbed(
                                `Warnings — ${user.tag}`,
                                description
                            )
                        ]
                    });
                }

                // ==================================================
                // CLEAR WARNINGS
                // ==================================================

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
                        embeds: [
                            createEmbed(
                                "Warnings Cleared",
                                `All warnings for **${user.tag}** have been cleared.`
                            )
                        ]
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

                    await interaction.channel.permissionOverwrites
                        .edit(
                            interaction.guild.roles.everyone,
                            {
                                SendMessages: false
                            }
                        );

                    return interaction.reply({
                        embeds: [
                            createEmbed(
                                "Channel Locked",
                                "This channel has been locked."
                            )
                        ]
                    });
                }

                // ==================================================
                // UNLOCK
                // ==================================================

                if (command === "unlock") {

                    await interaction.channel.permissionOverwrites
                        .edit(
                            interaction.guild.roles.everyone,
                            {
                                SendMessages: null
                            }
                        );

                    return interaction.reply({
                        embeds: [
                            createEmbed(
                                "Channel Unlocked",
                                "This channel has been unlocked."
                            )
                        ]
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
                        embeds: [
                            createEmbed(
                                "Slowmode Updated",
                                seconds === 0
                                    ? "Slowmode has been disabled."
                                    : `Slowmode is now **${seconds} seconds**.`
                            )
                        ]
                    });
                }

                // ==================================================
                // ROLE
                // ==================================================

                if (command === "role") {

                    const subcommand =
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
                        subcommand === "add"
                    ) {

                        await member.roles.add(
                            role
                        );

                        return interaction.reply({
                            embeds: [
                                createEmbed(
                                    "Role Added",
                                    `Added ${role} to **${member.user.tag}**.`
                                )
                            ]
                        });
                    }

                    if (
                        subcommand === "remove"
                    ) {

                        await member.roles.remove(
                            role
                        );

                        return interaction.reply({
                            embeds: [
                                createEmbed(
                                    "Role Removed",
                                    `Removed ${role} from **${member.user.tag}**.`
                                )
                            ]
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

                    const embed =
                        createEmbed(
                            "Announcement",
                            message
                        );

                    embed.setFooter({
                        text:
                            `Posted by ${interaction.user.tag}`
                    });

                    return interaction.reply({
                        embeds: [embed]
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
                    command ===
                    "ticketconfig"
                ) {

                    return sendTicketConfigPanel(
                        interaction
                    );
                }

                // ==================================================
                // ENROL SCHOOL
                // ==================================================

                if (
                    command ===
                    "enrolschool"
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
                                "The school enrolment system has not been configured yet. An administrator needs to configure it using `/enrolconfig`.",
                            ephemeral: true
                        });
                    }

                    if (
                        enrolSessions.has(
                            interaction.user.id
                        )
                    ) {
                        return interaction.reply({
                            content:
                                "You already have an enrolment questionnaire in progress. Please check your DMs.",
                            ephemeral: true
                        });
                    }

                    const sent =
                        await sendEnrolmentDM(
                            interaction.user,
                            interaction.guild
                        );

                    if (!sent) {
                        return interaction.reply({
                            content:
                                "I couldn't DM you. Please enable Direct Messages from server members and try again.",
                            ephemeral: true
                        });
                    }

                    return interaction.reply({
                        embeds: [
                            createEmbed(
                                "Enrolment Started",
                                "I've sent the school enrolment questionnaire to your DMs.\n\nPlease check your direct messages to continue."
                            )
                        ],
                        ephemeral: true
                    });
                }

                // ==================================================
                // ENROL CONFIG
                // ==================================================

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

                    return sendEnrolConfigPanel(
                        interaction
                    );
                }
            }

            // ====================================================
            // BUTTONS
            // ====================================================

            if (interaction.isButton()) {

                // ==================================================
                // START QUESTIONNAIRE
                // ==================================================

                if (
                    interaction.customId.startsWith(
                        "enrol_start_"
                    )
                ) {

                    const guildId =
                        interaction.customId.replace(
                            "enrol_start_",
                            ""
                        );

                    const session =
                        enrolSessions.get(
                            interaction.user.id
                        );

                    if (!session) {
                        return interaction.reply({
                            content:
                                "Your enrolment session has expired. Please run `/enrolschool` again.",
                            ephemeral: true
                        });
                    }

                    if (
                        session.guildId !==
                        guildId
                    ) {
                        return interaction.reply({
                            content:
                                "This questionnaire belongs to a different server.",
                            ephemeral: true
                        });
                    }

                    await interaction.update({
                        content:
                            "Questionnaire started.",
                        embeds: [],
                        components: []
                    });

                    await askEnrolQuestion(
                        interaction.user.id
                    );

                    return;
                }

                // ==================================================
                // SUBMIT ENROLMENT
                // ==================================================

                if (
                    interaction.customId ===
                    "enrol_submit"
                ) {

                    const session =
                        enrolSessions.get(
                            interaction.user.id
                        );

                    if (!session) {
                        return interaction.reply({
                            content:
                                "Your enrolment session has expired. Please run `/enrolschool` again.",
                            ephemeral: true
                        });
                    }

                    const guild =
                        client.guilds.cache.get(
                            session.guildId
                        );

                    if (!guild) {
                        return interaction.reply({
                            content:
                                "I couldn't find the server associated with this enrolment.",
                            ephemeral: true
                        });
                    }

                    await interaction.update({
                        content:
                            "Submitting your enrolment...",
                        embeds: [],
                        components: []
                    });

                    try {

                        const channel =
                            await createReviewChannel(
                                guild,
                                interaction.user,
                                session
                            );

                        enrolSessions.delete(
                            interaction.user.id
                        );

                        const guildConfig =
                            getGuildConfig(
                                guild.id
                            );

                        const enrolChannel =
                            getChannel(
                                guild,
                                guildConfig.enrolChannelId
                            );

                        if (enrolChannel) {

                            const publicEmbed =
                                createEmbed(
                                    "New School Enrolment",
                                    `A new school enrolment has been submitted and is awaiting staff review.`
                                );

                            publicEmbed.addFields(
                                {
                                    name:
                                        "School",
                                    value:
                                        session.answers.schoolName,
                                    inline: true
                                },
                                {
                                    name:
                                        "Applicant",
                                    value:
                                        `${interaction.user}`,
                                    inline: true
                                }
                            );

                            await enrolChannel.send({
                                embeds: [
                                    publicEmbed
                                ]
                            });
                        }

                        await interaction.editReply({
                            content:
                                `Your school enrolment has been successfully submitted.\n\nStaff will now review your application.`
                        });

                    } catch (error) {

                        console.error(
                            "ENROLMENT CREATION ERROR:",
                            error
                        );

                        await interaction.editReply({
                            content:
                                "I couldn't create your enrolment review. Please contact an administrator."
                        });
                    }

                    return;
                }

                // ==================================================
                // RESTART QUESTIONNAIRE
                // ==================================================

                if (
                    interaction.customId ===
                    "enrol_restart"
                ) {

                    const session =
                        enrolSessions.get(
                            interaction.user.id
                        );

                    if (!session) {
                        return interaction.reply({
                            content:
                                "Your enrolment session has expired. Please run `/enrolschool` again.",
                            ephemeral: true
                        });
                    }

                    session.currentQuestion = 0;
                    session.answers = {};
                    session.lastActivity =
                        Date.now();

                    await interaction.update({
                        content:
                            "Your questionnaire has been restarted.",
                        embeds: [],
                        components: []
                    });

                    return askEnrolQuestion(
                        interaction.user.id
                    );
                }

                // ==================================================
                // APPROVE
                // ==================================================

                if (
                    interaction.customId.startsWith(
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

                    const applicantId =
                        interaction.customId.replace(
                            "enrol_approve_",
                            ""
                        );

                    const guildConfig =
                        getGuildConfig(
                            interaction.guild.id
                        );

                    const applicant =
                        await interaction.guild.members
                            .fetch(
                                applicantId
                            )
                            .catch(
                                () => null
                            );

                    if (!applicant) {
                        return interaction.reply({
                            content:
                                "The applicant is no longer in the server.",
                            ephemeral: true
                        });
                    }

                    await interaction.deferReply({
                        ephemeral: true
                    });

                    try {

                        // ------------------------------------------
                        // GIVE APPROVED ROLE
                        // ------------------------------------------

                        const approvedRole =
                            getRole(
                                interaction.guild,
                                guildConfig.enrolApprovedRoleId
                            );

                        if (
                            approvedRole &&
                            approvedRole.position <
                                interaction.guild.members.me.roles.highest.position
                        ) {
                            await applicant.roles.add(
                                approvedRole,
                                "School enrolment approved"
                            );
                        }

                        // ------------------------------------------
                        // ENROLMENT CHANNEL
                        // ------------------------------------------

                        const enrolChannel =
                            getChannel(
                                interaction.guild,
                                guildConfig.enrolChannelId
                            );

                        if (enrolChannel) {

                            const announcement =
                                createEmbed(
                                    "School Enrolment Approved",
                                    `Congratulations to ${applicant}!\n\n` +
                                    `The school enrolment application has been approved by ${interaction.user}.`
                                );

                            await enrolChannel.send({
                                embeds: [
                                    announcement
                                ]
                            });
                        }

                        // ------------------------------------------
                        // APPLICANT DM
                        // ------------------------------------------

                        await applicant.send({
                            embeds: [
                                createEmbed(
                                    "Enrolment Approved",
                                    `Your school enrolment in **${interaction.guild.name}** has been approved.\n\n` +
                                    "Welcome to the Roblox School Association."
                                )
                            ]
                        }).catch(() => {});

                        // ------------------------------------------
                        // UPDATE REVIEW CHANNEL
                        // ------------------------------------------

                        const approvedEmbed =
                            createEmbed(
                                "Enrolment Approved",
                                `This enrolment has been approved by ${interaction.user}.\n\n` +
                                "The application has now been completed."
                            );

                        await interaction.channel.send({
                            embeds: [
                                approvedEmbed
                            ]
                        });

                        // Disable the buttons
                        try {
                            const messages =
                                await interaction.channel.messages.fetch({
                                    limit: 20
                                });

                            const applicationMessage =
                                messages.find(
                                    message =>
                                        message.author.id === client.user.id &&
                                        message.components.length > 0
                                );

                            if (
                                applicationMessage
                            ) {

                                const disabledRows =
                                    applicationMessage.components.map(
                                        row => {

                                            const newRow =
                                                new ActionRowBuilder();

                                            row.components.forEach(
                                                component => {

                                                    const button =
                                                        ButtonBuilder.from(
                                                            component
                                                        );

                                                    button.setDisabled(
                                                        true
                                                    );

                                                    newRow.addComponents(
                                                        button
                                                    );
                                                }
                                            );

                                            return newRow;
                                        }
                                    );

                                await applicationMessage.edit({
                                    components:
                                        disabledRows
                                });
                            }

                        } catch (buttonError) {
                            console.error(
                                "Could not disable enrolment buttons:",
                                buttonError
                            );
                        }

                        await interaction.editReply({
                            content:
                                "The enrolment has been approved successfully."
                        });

                    } catch (error) {

                        console.error(
                            "APPROVAL ERROR:",
                            error
                        );

                        await interaction.editReply({
                            content:
                                "Something went wrong while approving this enrolment."
                        });
                    }

                    return;
                }

                // ==================================================
                // DENY
                // ==================================================

                if (
                    interaction.customId.startsWith(
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
                        interaction.customId.replace(
                            "enrol_deny_",
                            ""
                        );

                    const reason =
                        await getDenialReason(
                            interaction,
                            applicantId
                        );

                    if (!reason) {
                        return;
                    }

                    return;
                }

                // ==================================================
                // TICKET CREATE
                // ==================================================

                if (
                    interaction.customId ===
                    "ticket_create"
                ) {

                    const guildConfig =
                        getGuildConfig(
                            interaction.guild.id
                        );

                    const staffRole =
                        getRole(
                            interaction.guild,
                            guildConfig.ticketStaffRoleId
                        );

                    const category =
                        getChannel(
                            interaction.guild,
                            guildConfig.ticketCategoryId
                        );

                    if (!staffRole) {
                        return interaction.reply({
                            content:
                                "The ticket staff role has not been configured.",
                            ephemeral: true
                        });
                    }

                    const existing =
                        interaction.guild.channels.cache.find(
                            channel =>
                                channel.name ===
                                `ticket-${interaction.user.username
                                    .toLowerCase()
                                    .replace(
                                        /[^a-z0-9-]/g,
                                        ""
                                    )
                                    .substring(0, 70)}`
                        );

                    if (existing) {
                        return interaction.reply({
                            content:
                                `You already have an open ticket: ${existing}`,
                            ephemeral: true
                        });
                    }

                    await interaction.deferReply({
                        ephemeral: true
                    });

                    let ticketName =
                        `ticket-${interaction.user.username
                            .toLowerCase()
                            .replace(
                                /[^a-z0-9-]/g,
                                ""
                            )
                            .substring(0, 70)}`;

                    if (
                        interaction.guild.channels.cache.some(
                            channel =>
                                channel.name ===
                                ticketName
                        )
                    ) {
                        ticketName +=
                            `-${Date.now()
                                .toString()
                                .slice(-4)}`;
                    }

                    const ticketChannel =
                        await interaction.guild.channels.create({
                            name: ticketName,
                            type:
                                ChannelType.GuildText,
                            parent:
                                category?.id || null,
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

                    await ticketChannel.send({
                        content:
                            `${staffRole} ${interaction.user}`,
                        embeds: [
                            createEmbed(
                                "Support Ticket",
                                "Thank you for contacting support.\n\n" +
                                "Please explain your enquiry and a member of staff will assist you."
                            )
                        ]
                    });

                    return interaction.editReply({
                        content:
                            `Your ticket has been created: ${ticketChannel}`
                    });
                }

                // ==================================================
                // TICKET CONFIG
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

                    const menu =
                        new StringSelectMenuBuilder()
                            .setCustomId(
                                "ticket_select_staff"
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
                            "Select the role that should have access to support tickets.",
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

                    const menu =
                        new StringSelectMenuBuilder()
                            .setCustomId(
                                "ticket_select_category"
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

                    await sendTicketPanel(
                        interaction
                    );

                    return interaction.reply({
                        content:
                            "Ticket panel sent successfully.",
                        ephemeral: true
                    });
                }

                if (
                    interaction.customId ===
                    "ticket_config_refresh"
                ) {

                    await interaction.update({
                        content:
                            "Refreshing ticket configuration..."
                    });

                    setTimeout(
                        async () => {
                            try {
                                await sendTicketConfigPanel(
                                    interaction
                                );
                            } catch {}
                        },
                        500
                    );

                    return;
                }

                // ==================================================
                // ENROL CONFIG BUTTONS
                // ==================================================

                if (
                    interaction.customId ===
                        "enrol_config_staff" ||
                    interaction.customId ===
                        "enrol_config_approved" ||
                    interaction.customId ===
                        "enrol_config_category" ||
                    interaction.customId ===
                        "enrol_config_channel"
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
                        "enrol_config_staff"
                    ) {

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
                                    "enrol_select_staff"
                                )
                                .setPlaceholder(
                                    "Select staff review role"
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
                                "Select the staff role that can review school enrolments.",
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
                        "enrol_config_approved"
                    ) {

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
                                    "enrol_select_approved"
                                )
                                .setPlaceholder(
                                    "Select approved school role"
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
                                "Select the role given when a school is approved.",
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
                        "enrol_config_category"
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
                                    "enrol_select_category"
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

                    if (
                        interaction.customId ===
                        "enrol_config_channel"
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
                                    "enrol_select_channel"
                                )
                                .setPlaceholder(
                                    "Select enrolment channel"
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
                                "Select the channel where approved enrolment announcements should be posted.",
                            components: [
                                new ActionRowBuilder()
                                    .addComponents(
                                        menu
                                    )
                            ],
                            ephemeral: true
                        });
                    }
                }

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

                    await interaction.deferUpdate();

                    const guildConfig =
                        getGuildConfig(
                            interaction.guild.id
                        );

                    const staff =
                        getRole(
                            interaction.guild,
                            guildConfig.enrolStaffRoleId
                        );

                    const approved =
                        getRole(
                            interaction.guild,
                            guildConfig.enrolApprovedRoleId
                        );

                    const category =
                        getChannel(
                            interaction.guild,
                            guildConfig.enrolReviewCategoryId
                        );

                    const channel =
                        getChannel(
                            interaction.guild,
                            guildConfig.enrolChannelId
                        );

                    const embed =
                        createEmbed(
                            "School Enrolment Configuration",
                            "Configure the Roblox School Association school enrolment system."
                        );

                    embed.addFields(
                        {
                            name:
                                "Staff Review Role",
                            value:
                                staff
                                    ? `${staff}`
                                    : "Not configured",
                            inline: true
                        },
                        {
                            name:
                                "Approved Role",
                            value:
                                approved
                                    ? `${approved}`
                                    : "Not configured",
                            inline: true
                        },
                        {
                            name:
                                "Review Category",
                            value:
                                category
                                    ? `${category}`
                                    : "Not configured",
                            inline: true
                        },
                        {
                            name:
                                "Enrolment Channel",
                            value:
                                channel
                                    ? `${channel}`
                                    : "Not configured",
                            inline: true
                        }
                    );

                    const row1 =
                        new ActionRowBuilder()
                            .addComponents(
                                new ButtonBuilder()
                                    .setCustomId(
                                        "enrol_config_staff"
                                    )
                                    .setLabel(
                                        "Staff Role"
                                    )
                                    .setStyle(
                                        ButtonStyle.Primary
                                    ),
                                new ButtonBuilder()
                                    .setCustomId(
                                        "enrol_config_approved"
                                    )
                                    .setLabel(
                                        "Approved Role"
                                    )
                                    .setStyle(
                                        ButtonStyle.Secondary
                                    ),
                                new ButtonBuilder()
                                    .setCustomId(
                                        "enrol_config_category"
                                    )
                                    .setLabel(
                                        "Review Category"
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
                                        "enrol_config_channel"
                                    )
                                    .setLabel(
                                        "Enrolment Channel"
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

                    return interaction.editReply({
                        embeds: [embed],
                        components: [
                            row1,
                            row2
                        ]
                    });
                }
            }

            // ====================================================
            // MODALS
            // ====================================================

            if (
                interaction.isModalSubmit()
            ) {
                return;
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
                        getRole(
                            interaction.guild,
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
                        getChannel(
                            interaction.guild,
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
                    "enrol_select_staff"
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
                        getRole(
                            interaction.guild,
                            roleId
                        );

                    return interaction.update({
                        content:
                            `Enrolment staff role set to ${role}.`,
                        components: []
                    });
                }

                // ==================================================
                // ENROL APPROVED
                // ==================================================

                if (
                    interaction.customId ===
                    "enrol_select_approved"
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
                        getRole(
                            interaction.guild,
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
                        getChannel(
                            interaction.guild,
                            categoryId
                        );

                    return interaction.update({
                        content:
                            `Enrolment review category set to ${category}.`,
                        components: []
                    });
                }

                // ==================================================
                // ENROL CHANNEL
                // ==================================================

                if (
                    interaction.customId ===
                    "enrol_select_channel"
                ) {

                    const channelId =
                        interaction.values[0];

                    const guildConfig =
                        getGuildConfig(
                            interaction.guild.id
                        );

                    guildConfig.enrolChannelId =
                        channelId;

                    saveJSON(
                        configFile,
                        config
                    );

                    const channel =
                        getChannel(
                            interaction.guild,
                            channelId
                        );

                    return interaction.update({
                        content:
                            `Enrolment announcement channel set to ${channel}.`,
                        components: []
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

            } catch (replyError) {
                console.error(
                    "Could not send error response:",
                    replyError
                );
            }
        }
    }
);

// ============================================================
// DENIAL REASON HANDLER
// ============================================================

async function getDenialReason(
    interaction,
    applicantId
) {

    try {

        const dm =
            await interaction.user.send({
                embeds: [
                    createEmbed(
                        "Deny Enrolment",
                        "Reply to this message with the reason why you want to deny this enrolment."
                    )
                ]
            });

        await interaction.reply({
            content:
                "I've sent you a DM. Reply there with the denial reason.",
            ephemeral: true
        });

        const collector =
            dm.channel.createMessageCollector({
                filter: message =>
                    message.author.id ===
                    interaction.user.id,
                max: 1,
                time: 5 * 60 * 1000
            });

        collector.on(
            "collect",
            async message => {

                const reason =
                    message.content.trim();

                const applicant =
                    await interaction.guild.members
                        .fetch(applicantId)
                        .catch(
                            () => null
                        );

                await interaction.channel.send({
                    embeds: [
                        createEmbed(
                            "Enrolment Denied",
                            `This enrolment has been denied by ${interaction.user}.\n\n` +
                            `**Reason:** ${reason}`
                        )
                    ]
                });

                if (applicant) {

                    await applicant.send({
                        embeds: [
                            createEmbed(
                                "Enrolment Denied",
                                `Your school enrolment in **${interaction.guild.name}** has been denied.\n\n` +
                                `**Reason:** ${reason}`
                            )
                        ]
                    }).catch(() => {});
                }

                try {

                    const messages =
                        await interaction.channel.messages.fetch({
                            limit: 20
                        });

                    const applicationMessage =
                        messages.find(
                            message =>
                                message.author.id === client.user.id &&
                                message.components.length > 0
                        );

                    if (
                        applicationMessage
                    ) {

                        const disabledRows =
                            applicationMessage.components.map(
                                row => {

                                    const newRow =
                                        new ActionRowBuilder();

                                    row.components.forEach(
                                        component => {

                                            const button =
                                                ButtonBuilder.from(
                                                    component
                                                );

                                            button.setDisabled(
                                                true
                                            );

                                            newRow.addComponents(
                                                button
                                            );
                                        }
                                    );

                                    return newRow;
                                }
                            );

                        await applicationMessage.edit({
                            components:
                                disabledRows
                        });
                    }

                } catch (error) {
                    console.error(
                        "Could not disable denial buttons:",
                        error
                    );
                }
            }
        );

        collector.on(
            "end",
            collected => {

                if (
                    collected.size === 0
                ) {
                    interaction.user.send(
                        "The denial request timed out. Please press Deny again if you still want to deny the application."
                    ).catch(() => {});
                }
            }
        );

    } catch (error) {

        console.error(
            "DENIAL ERROR:",
            error
        );

        if (
            !interaction.replied &&
            !interaction.deferred
        ) {
            await interaction.reply({
                content:
                    "I couldn't start the denial process. Please make sure your DMs are enabled.",
                ephemeral: true
            });
        }
    }
}

// ============================================================
// DM QUESTIONNAIRE MESSAGE HANDLER
// ============================================================

client.on(
    "messageCreate",
    async message => {

        if (
            message.author.bot ||
            message.guild
        ) {
            return;
        }

        const session =
            enrolSessions.get(
                message.author.id
            );

        if (!session) {
            return;
        }

        const question =
            enrolQuestions[
                session.currentQuestion
            ];

        if (!question) {
            return;
        }

        const answer =
            message.content.trim();

        if (!answer) {
            return;
        }

        if (
            answer.length >
            question.max
        ) {

            await message.reply(
                `Your answer is too long. Please keep it under ${question.max} characters.`
            );

            return;
        }

        session.answers[
            question.id
        ] = answer;

        session.currentQuestion++;
        session.lastActivity =
            Date.now();

        if (
            session.currentQuestion >=
            enrolQuestions.length
        ) {

            return showEnrolmentReview(
                message.author.id
            );
        }

        await askEnrolQuestion(
            message.author.id
        );
    }
);

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
                session
            ] of enrolSessions.entries()
        ) {

            if (
                now -
                session.lastActivity >
                60 * 60 * 1000
            ) {
                enrolSessions.delete(
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

client.login(TOKEN);
