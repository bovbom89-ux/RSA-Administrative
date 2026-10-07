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
        GatewayIntentBits.DirectMessages
    ],
    partials: [
        Partials.Channel,
        Partials.Message
    ]
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
// TEMPORARY ENROLMENT DATA
// ============================================================

const enrolments = new Map();

/*
    Structure:

    enrolments[userId] = {
        guildId,
        currentQuestion,
        answers: {
            schoolName,
            description,
            invite,
            ownerRole,
            memberCount,
            reason
        },
        modifying,
        createdAt
    }
*/

// ============================================================
// EMBED
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
// PERMISSIONS
// ============================================================

function canManage(member) {
    return (
        member.permissions.has(PermissionFlagsBits.ManageGuild) ||
        member.permissions.has(PermissionFlagsBits.Administrator)
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
                .setDescription("Timeout duration")
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
        .setDescription("Shows warnings")
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription("Member")
                .setRequired(false)
        ),

    new SlashCommandBuilder()
        .setName("clearwarnings")
        .setDescription("Clears warnings")
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
        .setName("ticketconfig")
        .setDescription("Configure the ticket system")
        .setDefaultMemberPermissions(
            PermissionFlagsBits.ManageGuild
        ),

    // ENROLMENT

    new SlashCommandBuilder()
        .setName("enrolschool")
        .setDescription("Apply to enrol a school with the RSA"),

    new SlashCommandBuilder()
        .setName("enrolconfig")
        .setDescription("Configure the school enrolment system")
        .setDefaultMemberPermissions(
            PermissionFlagsBits.ManageGuild

        )

].map(command => command.toJSON());

// ============================================================
// REGISTER COMMANDS
// ============================================================

async function registerCommands() {
    try {
        const rest = new REST({ version: "10" })
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

        console.log("Slash commands registered successfully.");
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
// ENROLMENT QUESTIONS
// ============================================================

const questions = [
    {
        key: "schoolName",
        question: "What is your school's name?"
    },
    {
        key: "description",
        question: "What is the description for your school?"
    },
    {
        key: "invite",
        question: "What is your school's Discord server invite?"
    },
    {
        key: "ownerRole",
        question: "What is your role at the school?"
    },
    {
        key: "memberCount",
        question: "Approximately how many members does your school have?"
    },
    {
        key: "reason",
        question: "Why should your school be enrolled with the Roblox School Association?"
    }
];

// ============================================================
// ENROLMENT START MESSAGE
// ============================================================

async function sendEnrolmentStart(user, guild) {

    const embed = createEmbed(
        "School Enrolment",
        `Welcome to the **Roblox School Association** school enrolment process for **${guild.name}**.\n\n` +
        "You will be asked 6 questions about your school. " +
        "The questions will be sent one at a time and you simply reply normally.\n\n" +
        "When you finish, you will be able to review and modify your answers before submitting."
    );

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId("dm_start_enrolment")
            .setLabel("Start Questionnaire")
            .setStyle(ButtonStyle.Primary)
    );

    return user.send({
        embeds: [embed],
        components: [row]
    });
}

// ============================================================
// ASK QUESTION
// ============================================================

async function askQuestion(user, enrolment) {

    const question =
        questions[enrolment.currentQuestion];

    const embed = createEmbed(
        `Question ${enrolment.currentQuestion + 1} of ${questions.length}`,
        question.question
    );

    await user.send({
        embeds: [embed]
    });

    enrolment.waitingForAnswer = true;
}

// ============================================================
// SHOW REVIEW
// ============================================================

async function showEnrolmentReview(user, enrolment) {

    const a = enrolment.answers;

    const embed = createEmbed(
        "Review Your Enrolment",
        "Please carefully check your answers below.\n\n" +
        "If everything is correct, click **Submit Enrolment**.\n" +
        "If something is wrong, click **Modify Answers**."
    );

    embed.addFields(
        {
            name: "1. School Name",
            value: a.schoolName || "Not provided"
        },
        {
            name: "2. School Description",
            value: a.description || "Not provided"
        },
        {
            name: "3. Discord Server Invite",
            value: a.invite || "Not provided"
        },
        {
            name: "4. Your Role",
            value: a.ownerRole || "Not provided"
        },
        {
            name: "5. Member Count",
            value: a.memberCount || "Not provided"
        },
        {
            name: "6. Why should your school be enrolled?",
            value: a.reason || "Not provided"
        }
    );

    const row = new ActionRowBuilder().addComponents(

        new ButtonBuilder()
            .setCustomId("dm_submit_enrolment")
            .setLabel("Submit Enrolment")
            .setStyle(ButtonStyle.Success),

        new ButtonBuilder()
            .setCustomId("dm_modify_enrolment")
            .setLabel("Modify Answers")
            .setStyle(ButtonStyle.Secondary),

        new ButtonBuilder()
            .setCustomId("dm_cancel_enrolment")
            .setLabel("Cancel")
            .setStyle(ButtonStyle.Danger)
    );

    return user.send({
        embeds: [embed],
        components: [row]
    });
}

// ============================================================
// CREATE REVIEW CHANNEL
// ============================================================

async function createReviewChannel(interaction, enrolment) {

    const guild = interaction.guild;
    const guildConfig = config[guild.id];

    if (!guildConfig?.enrolStaffRoleId) {
        throw new Error(
            "No enrolment staff role configured."
        );
    }

    if (!guildConfig?.enrolReviewCategoryId) {
        throw new Error(
            "No enrolment review category configured."
        );
    }

    const staffRole =
        guild.roles.cache.get(
            guildConfig.enrolStaffRoleId
        );

    const category =
        guild.channels.cache.get(
            guildConfig.enrolReviewCategoryId
        );

    if (!staffRole) {
        throw new Error(
            "Configured staff role does not exist."
        );
    }

    if (
        !category ||
        category.type !== ChannelType.GuildCategory
    ) {
        throw new Error(
            "Configured review category does not exist."
        );
    }

    let baseName =
        enrolment.answers.schoolName
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, "")
            .substring(0, 70);

    if (!baseName) {
        baseName = `application-${interaction.user.username}`;
    }

    let channelName = `enrol-${baseName}`;
    let number = 2;

    while (
        guild.channels.cache.some(
            channel => channel.name === channelName
        )
    ) {
        channelName =
            `enrol-${baseName}-${number}`;
        number++;
    }

    /*
        IMPORTANT:

        The applicant is NOT included in these permissions.

        Only:
        - @everyone is denied
        - Staff role can see it
        - Bot can see it
    */

    const permissionOverwrites = [
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
            parent: category.id,
            permissionOverwrites,
            topic:
                `RSA School Enrolment | ${interaction.user.tag}`
        });

    const answers = enrolment.answers;

    const embed = createEmbed(
        "New School Enrolment",
        `A new school has submitted an enrolment application.\n\n` +
        `**Applicant:** ${interaction.user}\n` +
        `**User ID:** ${interaction.user.id}`
    );

    embed.addFields(
        {
            name: "School Name",
            value: answers.schoolName
        },
        {
            name: "School Description",
            value: answers.description
        },
        {
            name: "Discord Server Invite",
            value: answers.invite
        },
        {
            name: "Applicant's Role",
            value: answers.ownerRole
        },
        {
            name: "Member Count",
            value: answers.memberCount
        },
        {
            name: "Why should the school be enrolled?",
            value: answers.reason
        }
    );

    const buttons =
        new ActionRowBuilder().addComponents(

            new ButtonBuilder()
                .setCustomId(
                    `enrol_approve_${interaction.user.id}`
                )
                .setLabel("Approve")
                .setStyle(ButtonStyle.Success),

            new ButtonBuilder()
                .setCustomId(
                    `enrol_deny_${interaction.user.id}`
                )
                .setLabel("Deny")
                .setStyle(ButtonStyle.Danger),

            new ButtonBuilder()
                .setCustomId(
                    `enrol_changes_${interaction.user.id}`
                )
                .setLabel("Request Changes")
                .setStyle(ButtonStyle.Secondary)
        );

    await channel.send({
        content:
            `${staffRole} — a new school enrolment requires review.`,
        embeds: [embed],
        components: [buttons]
    });

    return channel;
}

// ============================================================
// ENROL CONFIG PANEL
// ============================================================

async function sendEnrolConfigPanel(interaction) {

    const guildConfig =
        config[interaction.guild.id] || {};

    const staffRole =
        guildConfig.enrolStaffRoleId
            ? interaction.guild.roles.cache.get(
                guildConfig.enrolStaffRoleId
            )
            : null;

    const approvedRole =
        guildConfig.enrolApprovedRoleId
            ? interaction.guild.roles.cache.get(
                guildConfig.enrolApprovedRoleId
            )
            : null;

    const category =
        guildConfig.enrolReviewCategoryId
            ? interaction.guild.channels.cache.get(
                guildConfig.enrolReviewCategoryId
            )
            : null;

    const enrolChannel =
        guildConfig.enrolChannelId
            ? interaction.guild.channels.cache.get(
                guildConfig.enrolChannelId
            )
            : null;

    const embed = createEmbed(
        "School Enrolment Configuration",
        "Configure how the RSA school enrolment system works.\n\n" +
        "**Review channels are created automatically.** You do not need to select an individual review channel."
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
            name: "Approved School Role",
            value:
                approvedRole
                    ? `${approvedRole}`
                    : "Not configured",
            inline: true
        },
        {
            name: "Review Channel Category",
            value:
                category
                    ? `${category}`
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
        new ActionRowBuilder().addComponents(

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
                .setStyle(ButtonStyle.Primary)
        );

    const row2 =
        new ActionRowBuilder().addComponents(

            new ButtonBuilder()
                .setCustomId(
                    "enrol_config_channel"
                )
                .setLabel("Enrolment Channel")
                .setStyle(ButtonStyle.Secondary),

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
// TICKET CONFIG PANEL
// ============================================================

async function sendTicketConfigPanel(interaction) {

    const guildConfig =
        config[interaction.guild.id] || {};

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

    const embed = createEmbed(
        "Ticket Configuration",
        "Configure the RSA support ticket system.\n\n" +
        "Once configured, use **Send Ticket Panel** to post the ticket panel in the current channel."
    );

    embed.addFields(
        {
            name: "Ticket Staff Role",
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
        }
    );

    const row1 =
        new ActionRowBuilder().addComponents(

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
                .setStyle(ButtonStyle.Secondary)
        );

    const row2 =
        new ActionRowBuilder().addComponents(

            new ButtonBuilder()
                .setCustomId(
                    "ticket_send_panel"
                )
                .setLabel("Send Ticket Panel")
                .setStyle(ButtonStyle.Success),

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
// COMMAND HANDLER
// ============================================================

client.on(
    "interactionCreate",
    async interaction => {

        try {

            // ====================================================
            // CHAT INPUT
            // ====================================================

            if (interaction.isChatInputCommand()) {

                const command =
                    interaction.commandName;

                // ------------------------------------------------
                // HELP
                // ------------------------------------------------

                if (command === "help") {

                    const embed = createEmbed(
                        "RSA Utility Commands",
                        "Here are the commands available in this server."
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

                // ------------------------------------------------
                // PING
                // ------------------------------------------------

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

                // ------------------------------------------------
                // BOT INFO
                // ------------------------------------------------

                if (command === "botinfo") {

                    const embed = createEmbed(
                        "Bot Information"
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
                            name: "Discord.js",
                            value: "v14",
                            inline: true
                        }
                    );

                    return interaction.reply({
                        embeds: [embed]
                    });
                }

                // ------------------------------------------------
                // SERVER INFO
                // ------------------------------------------------

                if (command === "serverinfo") {

                    const guild =
                        interaction.guild;

                    const embed =
                        createEmbed(
                            guild.name
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

                // ------------------------------------------------
                // USER INFO
                // ------------------------------------------------

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
                            "User Information"
                        )
                        .setThumbnail(
                            user.displayAvatarURL()
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

                // ------------------------------------------------
                // PROFILE
                // ------------------------------------------------

                if (command === "profile") {

                    const member =
                        interaction.member;

                    const embed =
                        createEmbed(
                            `${interaction.user.username}'s Profile`
                        )
                        .setThumbnail(
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
                    );

                    return interaction.reply({
                        embeds: [embed]
                    });
                }

                // ------------------------------------------------
                // BAN
                // ------------------------------------------------

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

                // ------------------------------------------------
                // KICK
                // ------------------------------------------------

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

                // ------------------------------------------------
                // TIMEOUT
                // ------------------------------------------------

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

                // ------------------------------------------------
                // UNTIMEOUT
                // ------------------------------------------------

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

                // ------------------------------------------------
                // WARN
                // ------------------------------------------------

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

                // ------------------------------------------------
                // WARNINGS
                // ------------------------------------------------

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

                    if (!userWarnings.length) {
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

                // ------------------------------------------------
                // CLEAR WARNINGS
                // ------------------------------------------------

                if (command === "clearwarnings") {

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

                // ------------------------------------------------
                // PURGE
                // ------------------------------------------------

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

                // ------------------------------------------------
                // LOCK
                // ------------------------------------------------

                if (command === "lock") {

                    await interaction.channel.permissionOverwrites.edit(
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

                // ------------------------------------------------
                // UNLOCK
                // ------------------------------------------------

                if (command === "unlock") {

                    await interaction.channel.permissionOverwrites.edit(
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

                // ------------------------------------------------
                // SLOWMODE
                // ------------------------------------------------

                if (command === "slowmode") {

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

                // ------------------------------------------------
                // ROLE
                // ------------------------------------------------

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

                    if (subcommand === "add") {

                        await member.roles.add(role);

                        return interaction.reply({
                            content:
                                `Added ${role} to **${member.user.tag}**.`
                        });
                    }

                    await member.roles.remove(role);

                    return interaction.reply({
                        content:
                            `Removed ${role} from **${member.user.tag}**.`
                    });
                }

                // ------------------------------------------------
                // ANNOUNCE
                // ------------------------------------------------

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

                // ------------------------------------------------
                // EMBED
                // ------------------------------------------------

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

                // =================================================
                // TICKET CONFIG
                // =================================================

                if (command === "ticketconfig") {

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

                // =================================================
                // ENROL SCHOOL
                // =================================================

                if (command === "enrolschool") {

                    const guildConfig =
                        config[
                            interaction.guild.id
                        ];

                    if (
                        !guildConfig ||
                        guildConfig.enrolEnabled === false ||
                        !guildConfig.enrolStaffRoleId ||
                        !guildConfig.enrolReviewCategoryId ||
                        !guildConfig.enrolChannelId
                    ) {
                        return interaction.reply({
                            content:
                                "School enrolment has not been fully configured yet. Please ask an administrator to configure `/enrolconfig`.",
                            ephemeral: true
                        });
                    }

                    try {

                        await sendEnrolmentStart(
                            interaction.user,
                            interaction.guild
                        );

                        return interaction.reply({
                            content:
                                "I've sent you a DM with the school enrolment questionnaire. Please check your DMs.",
                            ephemeral: true
                        });

                    } catch (error) {

                        console.error(
                            "ENROL DM ERROR:",
                            error
                        );

                        return interaction.reply({
                            content:
                                "I couldn't DM you. Please make sure your Discord DMs are open for this server.",
                            ephemeral: true
                        });
                    }
                }

                // =================================================
                // ENROL CONFIG
                // =================================================

                if (command === "enrolconfig") {

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

                // ------------------------------------------------
                // START DM QUESTIONNAIRE
                // ------------------------------------------------

                if (
                    interaction.customId ===
                    "dm_start_enrolment"
                ) {

                    if (
                        interaction.guildId
                    ) {
                        return interaction.reply({
                            content:
                                "Please use this button from the bot's DM.",
                            ephemeral: true
                        });
                    }

                    const guild =
                        client.guilds.cache.get(
                            GUILD_ID
                        );

                    if (!guild) {
                        return interaction.reply({
                            content:
                                "I couldn't find the RSA server.",
                            ephemeral: true
                        });
                    }

                    const existing =
                        enrolments.get(
                            interaction.user.id
                        );

                    if (existing) {
                        return interaction.reply({
                            content:
                                "You already have an enrolment questionnaire in progress.",
                            ephemeral: true
                        });
                    }

                    const guildMember =
                        await guild.members
                            .fetch(
                                interaction.user.id
                            )
                            .catch(() => null);

                    if (!guildMember) {
                        return interaction.reply({
                            content:
                                "You must be a member of the RSA server to enrol a school.",
                            ephemeral: true
                        });
                    }

                    const guildConfig =
                        config[guild.id];

                    if (
                        !guildConfig ||
                        guildConfig.enrolEnabled === false
                    ) {
                        return interaction.reply({
                            content:
                                "School enrolment is currently disabled.",
                            ephemeral: true
                        });
                    }

                    const enrolment = {
                        guildId: guild.id,
                        currentQuestion: 0,
                        answers: {},
                        waitingForAnswer: false,
                        modifying: false,
                        createdAt: Date.now()
                    };

                    enrolments.set(
                        interaction.user.id,
                        enrolment
                    );

                    await interaction.reply({
                        embeds: [
                            createEmbed(
                                "Questionnaire Started",
                                "Great! I'll ask you 6 questions.\n\n" +
                                "Simply type your answer and send it as a normal message.\n\n" +
                                "Let's begin."
                            )
                        ]
                    });

                    return askQuestion(
                        interaction.user,
                        enrolment
                    );
                }

                // ------------------------------------------------
                // SUBMIT ENROLMENT
                // ------------------------------------------------

                if (
                    interaction.customId ===
                    "dm_submit_enrolment"
                ) {

                    if (
                        interaction.guildId
                    ) {
                        return;
                    }

                    const enrolment =
                        enrolments.get(
                            interaction.user.id
                        );

                    if (!enrolment) {
                        return interaction.reply({
                            content:
                                "Your questionnaire has expired. Please use `/enrolschool` again.",
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
                                "I couldn't find the RSA server.",
                            ephemeral: true
                        });
                    }

                    await interaction.deferReply();

                    try {

                        const reviewChannel =
                            await createReviewChannel(
                                {
                                    guild,
                                    user:
                                        interaction.user,
                                    guildId:
                                        guild.id
                                },
                                enrolment
                            );

                        enrolments.delete(
                            interaction.user.id
                        );

                        await interaction.editReply({
                            embeds: [
                                createEmbed(
                                    "Enrolment Submitted",
                                    "Your school enrolment has been submitted successfully.\n\n" +
                                    "Your application has been sent to RSA staff for review.\n\n" +
                                    "You **do not have access** to the private staff review channel."
                                )
                            ]
                        });

                    } catch (error) {

                        console.error(
                            "CREATE REVIEW CHANNEL ERROR:",
                            error
                        );

                        await interaction.editReply({
                            embeds: [
                                createEmbed(
                                    "Submission Error",
                                    "I couldn't create your application review channel.\n\n" +
                                    "Please contact an RSA administrator."
                                )
                            ]
                        });
                    }

                    return;
                }

                // ------------------------------------------------
                // MODIFY ANSWERS
                // ------------------------------------------------

                if (
                    interaction.customId ===
                    "dm_modify_enrolment"
                ) {

                    const enrolment =
                        enrolments.get(
                            interaction.user.id
                        );

                    if (!enrolment) {
                        return interaction.reply({
                            content:
                                "Your questionnaire has expired. Please start again.",
                            ephemeral: true
                        });
                    }

                    const menu =
                        new StringSelectMenuBuilder()
                            .setCustomId(
                                "dm_modify_question"
                            )
                            .setPlaceholder(
                                "Choose an answer to change"
                            )
                            .addOptions(
                                questions.map(
                                    (question, index) => ({
                                        label:
                                            `${index + 1}. ${question.key === "schoolName"
                                                ? "School Name"
                                                : question.key === "description"
                                                    ? "School Description"
                                                    : question.key === "invite"
                                                        ? "Discord Invite"
                                                        : question.key === "ownerRole"
                                                            ? "Your Role"
                                                            : question.key === "memberCount"
                                                                ? "Member Count"
                                                                : "Reason for Enrolment"
                                            }`,
                                        value:
                                            `${index}`
                                    })
                                )
                            );

                    return interaction.reply({
                        content:
                            "Choose the answer you want to modify:",
                        components: [
                            new ActionRowBuilder()
                                .addComponents(
                                    menu
                                )
                        ]
                    });
                }

                // ------------------------------------------------
                // CANCEL
                // ------------------------------------------------

                if (
                    interaction.customId ===
                    "dm_cancel_enrolment"
                ) {

                    enrolments.delete(
                        interaction.user.id
                    );

                    return interaction.update({
                        embeds: [
                            createEmbed(
                                "Enrolment Cancelled",
                                "Your school enrolment questionnaire has been cancelled."
                            )
                        ],
                        components: []
                    });
                }

                // =================================================
                // STAFF APPROVE
                // =================================================

                if (
                    interaction.customId.startsWith(
                        "enrol_approve_"
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
                            "enrol_approve_",
                            ""
                        );

                    const guildConfig =
                        config[
                            interaction.guild.id
                        ] || {};

                    const applicant =
                        await interaction.guild.members
                            .fetch(applicantId)
                            .catch(() => null);

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

                        let approvedRole = null;

                        if (
                            guildConfig.enrolApprovedRoleId
                        ) {

                            approvedRole =
                                interaction.guild.roles.cache.get(
                                    guildConfig.enrolApprovedRoleId
                                );

                            if (approvedRole) {
                                await applicant.roles.add(
                                    approvedRole
                                );
                            }
                        }

                        const approvalEmbed =
                            createEmbed(
                                "School Enrolment Approved",
                                `A school enrolment has been approved by ${interaction.user}.`
                            );

                        approvalEmbed.addFields({
                            name: "Applicant",
                            value:
                                `${applicant.user.tag}\n${applicant.id}`
                        });

                        if (approvedRole) {
                            approvalEmbed.addFields({
                                name: "Role Granted",
                                value:
                                    `${approvedRole}`
                            });
                        }

                        const enrolmentChannel =
                            guildConfig.enrolChannelId
                                ? interaction.guild.channels.cache.get(
                                    guildConfig.enrolChannelId
                                )
                                : null;

                        if (
                            enrolmentChannel &&
                            enrolmentChannel.isTextBased()
                        ) {

                            await enrolmentChannel.send({
                                embeds: [
                                    approvalEmbed
                                ]
                            });
                        }

                        await applicant.user.send({
                            embeds: [
                                createEmbed(
                                    "School Enrolment Approved",
                                    `Congratulations! Your school enrolment with the **Roblox School Association** has been approved.\n\n` +
                                    `Approved by: ${interaction.user.tag}`
                                )
                            ]
                        }).catch(() => {});

                        await interaction.channel.send({
                            embeds: [
                                createEmbed(
                                    "Enrolment Approved",
                                    `This enrolment has been approved by ${interaction.user}.`
                                )
                            ]
                        });

                        await interaction.editReply({
                            content:
                                "The school enrolment has been approved."
                        });

                    } catch (error) {

                        console.error(
                            "APPROVAL ERROR:",
                            error
                        );

                        await interaction.editReply({
                            content:
                                "I couldn't complete the approval."
                        });
                    }

                    return;
                }

                // =================================================
                // STAFF DENY
                // =================================================

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

                    return interaction.reply({
                        content:
                            `Please type the denial reason in this review channel for <@${applicantId}>.`,
                        ephemeral: true
                    });
                }

                // =================================================
                // REQUEST CHANGES
                // =================================================

                if (
                    interaction.customId.startsWith(
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
                        interaction.customId.replace(
                            "enrol_changes_",
                            ""
                        );

                    const applicant =
                        await interaction.guild.members
                            .fetch(applicantId)
                            .catch(() => null);

                    if (!applicant) {
                        return interaction.reply({
                            content:
                                "The applicant is no longer in the server.",
                            ephemeral: true
                        });
                    }

                    await interaction.reply({
                        content:
                            `Please type the changes required in this channel. The message will be sent to <@${applicantId}>.`,
                        ephemeral: true
                    });

                    // Wait for the staff member to type the reason.
                    const collector =
                        interaction.channel.createMessageCollector({
                            filter: message =>
                                message.author.id ===
                                interaction.user.id,
                            max: 1,
                            time: 120000
                        });

                    collector.on(
                        "collect",
                        async message => {

                            await applicant.user.send({
                                embeds: [
                                    createEmbed(
                                        "Changes Requested",
                                        `RSA staff have requested changes to your school enrolment.\n\n` +
                                        `**Changes required:**\n${message.content}\n\n` +
                                        `Once you have made the necessary changes, please contact RSA staff to continue your application.`
                                    )
                                ]
                            }).catch(() => {});

                            await interaction.channel.send({
                                embeds: [
                                    createEmbed(
                                        "Changes Requested",
                                        `Changes have been sent to ${applicant}.`
                                    )
                                ]
                            });
                        }
                    );

                    return;
                }

                // =================================================
                // TICKET CONFIG
                // =================================================

                if (
                    [
                        "ticket_config_staff",
                        "ticket_config_category",
                        "ticket_config_refresh",
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

                    // STAFF

                    if (
                        interaction.customId ===
                        "ticket_config_staff"
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

                    // CATEGORY

                    if (
                        interaction.customId ===
                        "ticket_config_category"
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
                                    "There are no categories in this server.",
                                ephemeral: true
                            });
                        }

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

                    // REFRESH

                    if (
                        interaction.customId ===
                        "ticket_config_refresh"
                    ) {

                        await interaction.deferUpdate();

                        const guildConfig =
                            config[
                                interaction.guild.id
                            ] || {};

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
                                "Configure the RSA support ticket system."
                            );

                        embed.addFields(
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
                            }
                        );

                        return interaction.editReply({
                            embeds: [embed]
                        });
                    }

                    // SEND PANEL

                    if (
                        interaction.customId ===
                        "ticket_send_panel"
                    ) {

                        const guildConfig =
                            config[
                                interaction.guild.id
                            ] || {};

                        if (
                            !guildConfig.ticketStaffRoleId ||
                            !guildConfig.ticketCategoryId
                        ) {
                            return interaction.reply({
                                content:
                                    "Please configure the ticket staff role and ticket category first.",
                                ephemeral: true
                            });
                        }

                        const embed =
                            createEmbed(
                                "RSA Support Tickets",
                                "Need assistance from the Roblox School Association team?\n\n" +
                                "Click the button below to create a private support ticket."
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
                            embeds: [embed],
                            components: [row]
                        });

                        return interaction.reply({
                            content:
                                "The ticket panel has been sent.",
                            ephemeral: true
                        });
                    }
                }

                // =================================================
                // CREATE TICKET
                // =================================================

                if (
                    interaction.customId ===
                    "create_ticket"
                ) {

                    const guildConfig =
                        config[
                            interaction.guild.id
                        ] || {};

                    const category =
                        guildConfig.ticketCategoryId
                            ? interaction.guild.channels.cache.get(
                                guildConfig.ticketCategoryId
                            )
                            : null;

                    const staffRole =
                        guildConfig.ticketStaffRoleId
                            ? interaction.guild.roles.cache.get(
                                guildConfig.ticketStaffRoleId
                            )
                            : null;

                    if (
                        !category ||
                        !staffRole
                    ) {
                        return interaction.reply({
                            content:
                                "The ticket system has not been configured correctly.",
                            ephemeral: true
                        });
                    }

                    const existing =
                        interaction.guild.channels.cache.find(
                            channel =>
                                channel.topic ===
                                `RSA Ticket | ${interaction.user.id}`
                        );

                    if (existing) {
                        return interaction.reply({
                            content:
                                `You already have a ticket: ${existing}`,
                            ephemeral: true
                        });
                    }

                    await interaction.deferReply({
                        ephemeral: true
                    });

                    let name =
                        `ticket-${interaction.user.username}`
                            .toLowerCase()
                            .replace(
                                /[^a-z0-9-]/g,
                                ""
                            )
                            .substring(
                                0,
                                80
                            );

                    const channel =
                        await interaction.guild.channels.create({
                            name,
                            type:
                                ChannelType.GuildText,
                            parent:
                                category.id,
                            topic:
                                `RSA Ticket | ${interaction.user.id}`,
                            permissionOverwrites: [
                                {
                                    id:
                                        interaction.guild.roles
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

                    const ticketEmbed =
                        createEmbed(
                            "Support Ticket",
                            `Hello ${interaction.user}!\n\n` +
                            "Please explain what you need assistance with. " +
                            "A member of the RSA team will be with you shortly."
                        );

                    const closeButton =
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
                            `${staffRole}`,
                        embeds: [
                            ticketEmbed
                        ],
                        components: [
                            closeButton
                        ]
                    });

                    return interaction.editReply({
                        content:
                            `Your ticket has been created: ${channel}`
                    });
                }

                // CLOSE TICKET

                if (
                    interaction.customId ===
                    "close_ticket"
                ) {

                    if (
                        !isStaff(
                            interaction.member
                        ) &&
                        !interaction.member.permissions.has(
                            PermissionFlagsBits.ManageChannels
                        )
                    ) {
                        return interaction.reply({
                            content:
                                "You do not have permission to close this ticket.",
                            ephemeral: true
                        });
                    }

                    await interaction.reply({
                        embeds: [
                            createEmbed(
                                "Ticket Closed",
                                "This ticket will be deleted in 5 seconds."
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
            }

            // ====================================================
            // SELECT MENUS
            // ====================================================

            if (
                interaction.isStringSelectMenu()
            ) {

                // ------------------------------------------------
                // MODIFY QUESTION
                // ------------------------------------------------

                if (
                    interaction.customId ===
                    "dm_modify_question"
                ) {

                    const enrolment =
                        enrolments.get(
                            interaction.user.id
                        );

                    if (!enrolment) {
                        return interaction.update({
                            content:
                                "Your questionnaire has expired.",
                            components: []
                        });
                    }

                    const questionIndex =
                        Number(
                            interaction.values[0]
                        );

                    enrolment.currentQuestion =
                        questionIndex;

                    enrolment.modifying =
                        true;

                    enrolment.waitingForAnswer =
                        true;

                    const question =
                        questions[
                            questionIndex
                        ];

                    return interaction.update({
                        content:
                            `**Question ${questionIndex + 1}:** ${question.question}\n\n` +
                            "Send your new answer as a normal message.",
                        components: []
                    });
                }

                // ------------------------------------------------
                // ENROL STAFF ROLE
                // ------------------------------------------------

                if (
                    interaction.customId ===
                    "enrol_select_staff_role"
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
                            `Staff review role set to ${role}.`,
                        components: []
                    });
                }

                // ------------------------------------------------
                // ENROL APPROVED ROLE
                // ------------------------------------------------

                if (
                    interaction.customId ===
                    "enrol_select_approved_role"
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
                            `Approved school role set to ${role}.`,
                        components: []
                    });
                }

                // ------------------------------------------------
                // ENROL CATEGORY
                // ------------------------------------------------

                if (
                    interaction.customId ===
                    "enrol_select_category"
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

                    config[
                        interaction.guild.id
                    ].enrolReviewCategoryId =
                        interaction.values[0];

                    saveJSON(
                        configFile,
                        config
                    );

                    const category =
                        interaction.guild.channels.cache.get(
                            interaction.values[0]
                        );

                    return interaction.update({
                        content:
                            `Review channel category set to ${category}.`,
                        components: []
                    });
                }

                // ------------------------------------------------
                // ENROL CHANNEL
                // ------------------------------------------------

                if (
                    interaction.customId ===
                    "enrol_select_channel"
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

                    config[
                        interaction.guild.id
                    ].enrolChannelId =
                        interaction.values[0];

                    saveJSON(
                        configFile,
                        config
                    );

                    const channel =
                        interaction.guild.channels.cache.get(
                            interaction.values[0]
                        );

                    return interaction.update({
                        content:
                            `Enrolment channel set to ${channel}.`,
                        components: []
                    });
                }

                // ------------------------------------------------
                // TICKET STAFF
                // ------------------------------------------------

                if (
                    interaction.customId ===
                    "ticket_select_staff"
                ) {

                    if (
                        !config[
                            interaction.guild.id
                        ]
                    ) {
                        config[
                            interaction.guild.id
                        ] = {};
                    }

                    config[
                        interaction.guild.id
                    ].ticketStaffRoleId =
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
                            `Ticket staff role set to ${role}.`,
                        components: []
                    });
                }

                // ------------------------------------------------
                // TICKET CATEGORY
                // ------------------------------------------------

                if (
                    interaction.customId ===
                    "ticket_select_category"
                ) {

                    if (
                        !config[
                            interaction.guild.id
                        ]
                    ) {
                        config[
                            interaction.guild.id
                        ] = {};
                    }

                    config[
                        interaction.guild.id
                    ].ticketCategoryId =
                        interaction.values[0];

                    saveJSON(
                        configFile,
                        config
                    );

                    const category =
                        interaction.guild.channels.cache.get(
                            interaction.values[0]
                        );

                    return interaction.update({
                        content:
                            `Ticket category set to ${category}.`,
                        components: []
                    });
                }
            }
        }

        // ========================================================
        // ERROR HANDLING
        // ========================================================

        catch (error) {

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
// DM QUESTIONNAIRE MESSAGE HANDLER
// ============================================================

client.on(
    "messageCreate",
    async message => {

        try {

            if (message.author.bot) return;

            if (
                message.channel.type !==
                ChannelType.DM
            ) {
                return;
            }

            const enrolment =
                enrolments.get(
                    message.author.id
                );

            if (!enrolment) {
                return;
            }

            if (
                !enrolment.waitingForAnswer
            ) {
                return;
            }

            const question =
                questions[
                    enrolment.currentQuestion
                ];

            enrolment.answers[
                question.key
            ] = message.content;

            enrolment.waitingForAnswer =
                false;

            // --------------------------------------------
            // MODIFYING AN EXISTING ANSWER
            // --------------------------------------------

            if (
                enrolment.modifying
            ) {

                enrolment.modifying =
                    false;

                await message.channel.send({
                    embeds: [
                        createEmbed(
                            "Answer Updated",
                            "Your answer has been updated."
                        )
                    ]
                });

                return showEnrolmentReview(
                    message.author,
                    enrolment
                );
            }

            // --------------------------------------------
            // NEXT QUESTION
            // --------------------------------------------

            if (
                enrolment.currentQuestion <
                questions.length - 1
            ) {

                enrolment.currentQuestion++;

                return askQuestion(
                    message.author,
                    enrolment
                );
            }

            // --------------------------------------------
            // FINISHED
            // --------------------------------------------

            return showEnrolmentReview(
                message.author,
                enrolment
            );

        } catch (error) {

            console.error(
                "DM QUESTION ERROR:",
                error
            );
        }
    }
);

// ============================================================
// ENROL CONFIG BUTTONS
// ============================================================

client.on(
    "interactionCreate",
    async interaction => {

        if (!interaction.isButton()) {
            return;
        }

        try {

            if (
                ![
                    "enrol_config_staff",
                    "enrol_config_approved",
                    "enrol_config_category",
                    "enrol_config_channel",
                    "enrol_config_refresh"
                ].includes(
                    interaction.customId
                )
            ) {
                return;
            }

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

            // --------------------------------------------
            // STAFF ROLE
            // --------------------------------------------

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
                            "enrol_select_staff_role"
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
                        "Select the role that can review school enrolments.",
                    components: [
                        new ActionRowBuilder()
                            .addComponents(
                                menu
                            )
                    ],
                    ephemeral: true
                });
            }

            // --------------------------------------------
            // APPROVED ROLE
            // --------------------------------------------

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
                            "enrol_select_approved_role"
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

            // --------------------------------------------
            // REVIEW CATEGORY
            // --------------------------------------------

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

                if (!categories.length) {
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
                        "Select the category where private enrolment review channels should automatically be created.",
                    components: [
                        new ActionRowBuilder()
                            .addComponents(
                                menu
                            )
                    ],
                    ephemeral: true
                });
            }

            // --------------------------------------------
            // ENROLMENT CHANNEL
            // --------------------------------------------

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

                if (!channels.length) {
                    return interaction.reply({
                        content:
                            "There are no text channels available.",
                        ephemeral: true
                    });
                }

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
                        "Select the channel where approved school enrolments should be announced.",
                    components: [
                        new ActionRowBuilder()
                            .addComponents(
                                menu
                            )
                    ],
                    ephemeral: true
                });
            }

            // --------------------------------------------
            // REFRESH
            // --------------------------------------------

            if (
                interaction.customId ===
                "enrol_config_refresh"
            ) {

                await interaction.deferUpdate();

                const guildConfig =
                    config[
                        interaction.guild.id
                    ] || {};

                const staffRole =
                    guildConfig.enrolStaffRoleId
                        ? interaction.guild.roles.cache.get(
                            guildConfig.enrolStaffRoleId
                        )
                        : null;

                const approvedRole =
                    guildConfig.enrolApprovedRoleId
                        ? interaction.guild.roles.cache.get(
                            guildConfig.enrolApprovedRoleId
                        )
                        : null;

                const category =
                    guildConfig.enrolReviewCategoryId
                        ? interaction.guild.channels.cache.get(
                            guildConfig.enrolReviewCategoryId
                        )
                        : null;

                const enrolChannel =
                    guildConfig.enrolChannelId
                        ? interaction.guild.channels.cache.get(
                            guildConfig.enrolChannelId
                        )
                        : null;

                const embed =
                    createEmbed(
                        "School Enrolment Configuration",
                        "Configure how the RSA school enrolment system works.\n\n" +
                        "Review channels are automatically created."
                    );

                embed.addFields(
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
                            "Enrolment Channel",
                        value:
                            enrolChannel
                                ? `${enrolChannel}`
                                : "Not configured",
                        inline: true
                    }
                );

                return interaction.editReply({
                    embeds: [embed]
                });
            }

        } catch (error) {

            console.error(
                "ENROL CONFIG ERROR:",
                error
            );

            if (
                !interaction.replied &&
                !interaction.deferred
            ) {
                return interaction.reply({
                    content:
                        "Something went wrong with that action.",
                    ephemeral: true
                });
            }
        }
    }
);

// ============================================================
// CLEAN OLD QUESTIONNAIRES
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

client.login(TOKEN);
